import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/store";
import {
  reportApi,
  useCreateReportMutation,
  useGetDeadlinesReportQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { useNavigate } from "react-router-dom";
import { removeCookie } from "@/utils/cookie";

function findEmptyChildrenColumnIds(
  children: any[]
): { id: string; title: string; fullParentChain: string }[] {
  const result: { id: string; title: string; fullParentChain: string }[] = [];
  const traverse = (cols: any[], parentChain: string[] = []) => {
    cols.forEach((col) => {
      const currentChain = [...parentChain, col.title];
      if (
        col.children &&
        Array.isArray(col.children) &&
        col.children.length > 0
      ) {
        traverse(col.children, currentChain);
      } else {
        result.push({
          id: col.id,
          title: col.title,
          fullParentChain: currentChain.join(" / "),
        });
      }
    });
  };
  traverse(children);
  return result;
}

function FundCreate() {
  const dispatch = useDispatch<AppDispatch>();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);

  const {
    data: deadlines_list,
    isLoading: isDeadlinesLoading,
    error: deadlinesError,
  } = useGetDeadlinesReportQuery();
  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery();
  const {
    data: tableHeadersData = [],
    isLoading: isHeaderLoading,
    error: headersError,
  } = useGetStatementColumnsReportQuery(
    { statementId: reportIds, lang,isUser:"true" },
    {
      skip: !reportIds,
    }
  );

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [planListMap, setPlanListMap] = useState<Record<string, number>>({});
  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const navigate = useNavigate();

  const extractPercentage = (title: string): number => {
    const match = title.match(/\((\d+)%\)/);
    return match ? parseInt(match[1]) : 100;
  };

  useEffect(() => {
    const fetchPlanLists = async () => {
      if (!tableHeadersData || !selectedOrganizationId || !reportIds) return;
      const allStepsEmptyCols = tableHeadersData
        .map((obj: any) =>
          Array.isArray(obj.children)
            ? findEmptyChildrenColumnIds(obj.children)
            : []
        )
        .flat();
      const rejaLeafColumns = allStepsEmptyCols.filter((col: any) =>
        col.title.toLowerCase().includes("reja")
      );
      const requests = rejaLeafColumns.map(async (col: any) => {
        try {
          const response = await dispatch(
            reportApi.endpoints.getPlanListReport.initiate({
              columnId: col.id,
              organization: selectedOrganizationId,
              statement: reportIds,
              page: "",
              search: "",
              year: "",
            })
          ).unwrap();
          const planValue = response?.results[0]?.plan_value ?? 0;
          return { columnId: col.id, planValue };
        } catch (error) {
          console.error(`❌ So'rov xatoligi: columnId=${col.id}`, error);
          return { columnId: col.id, planValue: 0 };
        }
      });
      const results = await Promise.all(requests);
      const newPlanMap: Record<string, number> = {};
      results.forEach(({ columnId, planValue }) => {
        newPlanMap[columnId] = planValue;
      });
      setPlanListMap(newPlanMap);
    };
    fetchPlanLists();
  }, [tableHeadersData, selectedOrganizationId, reportIds, dispatch]);

  useEffect(() => {
    if (tableHeadersData.length > 0) {
      const allStepsEmptyCols = tableHeadersData.map((obj: any) => {
        if (Array.isArray(obj.children)) {
          return findEmptyChildrenColumnIds(obj.children);
        }
        return [];
      });
      setAllEmptyColumnsByStep(allStepsEmptyCols);
      setCurrentStep(0);
    } else {
      setAllEmptyColumnsByStep([]);
      setCurrentStep(0);
    }
  }, [tableHeadersData]);

  const handleInputChange = (
    id: string,
    value: any,
    title: string,
    fullParentChain: string
  ) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [id]: value };

      const pathParts = fullParentChain.split(" / ");

      // Case 1: Jami tushum
      if (title === "Jami tushum") {
        const categoryPath = pathParts.slice(0, 2).join(" / ");

        const payableField = currentEmptyColumns.find(
          (col) =>
            col.fullParentChain.startsWith(
              `${categoryPath} / shundan jamg’armaga`
            ) && col.title.startsWith("To‘lanishi kerak")
        );

        if (payableField) {
          const percentage = extractPercentage(payableField.title);
          const calculated = (parseFloat(value) || 0) * (percentage / 100);
          newValues[payableField.id] = calculated.toString();

          const tolandiField = currentEmptyColumns.find(
            (col) =>
              col.fullParentChain.startsWith(
                `${categoryPath} / shundan jamg’armaga`
              ) && col.title === "To‘landi"
          );

          const qoldiqField = currentEmptyColumns.find(
            (col) =>
              col.fullParentChain.startsWith(
                `${categoryPath} / shundan jamg’armaga`
              ) && col.title === "Qoldiq"
          );

          if (qoldiqField && tolandiField) {
            const paid = parseFloat(newValues[tolandiField.id] || "0");
            newValues[qoldiqField.id] = (calculated - paid).toString();
          }
        }
      }

      // Case 2: To‘landi
      if (title === "To‘landi") {
        const categoryPath = pathParts.slice(0, 2).join(" / ");

        const payableField = currentEmptyColumns.find(
          (col) =>
            col.fullParentChain.startsWith(
              `${categoryPath} / shundan jamg’armaga`
            ) && col.title.startsWith("To‘lanishi kerak")
        );

        const qoldiqField = currentEmptyColumns.find(
          (col) =>
            col.fullParentChain.startsWith(
              `${categoryPath} / shundan jamg’armaga`
            ) && col.title === "Qoldiq"
        );

        if (payableField && qoldiqField) {
          const payableValue = parseFloat(newValues[payableField.id] || "0");
          const paidValue = parseFloat(value) || 0;

          if (paidValue > payableValue) {
            alert(
              `Kiritilgan qiymat "To‘lanishi kerak" (${payableValue}) dan katta bo‘lishi mumkin emas.`
            );
            return prev; // Keep old values unchanged
          }

          const remaining = payableValue - paidValue;
          newValues[qoldiqField.id] = remaining.toString();
        }
      }

      // Case 3: Calculate the summary totals
      const allJamiTushumIds = currentEmptyColumns
        .filter(
          (col) =>
            col.title === "Jami tushum" &&
            !col.fullParentChain.includes(" / Jami tushum /")
        )
        .map((col) => col.id);

      const allTolanishiIds = currentEmptyColumns
        .filter(
          (col) =>
            col.title.startsWith("To‘lanishi kerak") &&
            !col.fullParentChain.includes(" / Jami tushum /")
        )
        .map((col) => col.id);

      const allTolandiIds = currentEmptyColumns
        .filter(
          (col) =>
            col.title === "To‘landi" &&
            !col.fullParentChain.includes(" / Jami tushum /")
        )
        .map((col) => col.id);

      const allQoldiqIds = currentEmptyColumns
        .filter(
          (col) =>
            col.title === "Qoldiq" &&
            !col.fullParentChain.includes(" / Jami tushum /")
        )
        .map((col) => col.id);

      const jamiTushumSum = allJamiTushumIds.reduce(
        (acc, cid) => acc + parseFloat(newValues[cid] || "0"),
        0
      );

      const tolanishiSum = allTolanishiIds.reduce(
        (acc, cid) => acc + parseFloat(newValues[cid] || "0"),
        0
      );

      const tolandiSum = allTolandiIds.reduce(
        (acc, cid) => acc + parseFloat(newValues[cid] || "0"),
        0
      );

      const qoldiqSum = allQoldiqIds.reduce(
        (acc, cid) => acc + parseFloat(newValues[cid] || "0"),
        0
      );

      // Fill summary fields
      const summaryJamiField = currentEmptyColumns.find((col) =>
        col.fullParentChain.endsWith("Jami tushum / Jamg’arma ga jami tushum")
      );
      const summaryTolanishiField = currentEmptyColumns.find((col) =>
        col.fullParentChain.endsWith(
          "Jami tushum / shundan jamg’armaga / Jamg’arma ga tushishi kerak bo‘lgan tushum"
        )
      );
      const summaryTolandiField = currentEmptyColumns.find((col) =>
        col.fullParentChain.endsWith(
          "Jami tushum / shundan jamg’armaga / To‘landi"
        )
      );
      const summaryQoldiqField = currentEmptyColumns.find((col) =>
        col.fullParentChain.endsWith(
          "Jami tushum / shundan jamg’armaga / Qoldiq"
        )
      );

      if (summaryJamiField)
        newValues[summaryJamiField.id] = jamiTushumSum.toString();
      if (summaryTolanishiField)
        newValues[summaryTolanishiField.id] = tolanishiSum.toString();
      if (summaryTolandiField)
        newValues[summaryTolandiField.id] = tolandiSum.toString();
      if (summaryQoldiqField)
        newValues[summaryQoldiqField.id] = qoldiqSum.toString();

      return newValues;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDeadlineId) {
      alert("Iltimos, deadline tanlang");
      return;
    }
    if (
      currentEmptyColumns.some((col) =>
        col.title.toLowerCase().includes("tashkilot")
      ) &&
      !selectedOrganizationId
    ) {
      alert("Iltimos, tashkilot tanlang");
      return;
    }
    const allColumns = allEmptyColumnsByStep.flat();
    const report_items = allColumns.map((col) => ({
      statement_column: col.id,
      value: col.title.toLowerCase().includes("tashkilot")
        ? selectedOrganizationId
        : col.title.toLowerCase().includes("reja")
        ? String(planListMap[col.id] ?? "")
        : String(formValues[col.id] || "0"),
    }));
    const payload = {
      deadline: selectedDeadlineId,
      report_items,
    };
    try {
      const res = await createReportItem(payload).unwrap();
      console.log("Yuborildi:", res);
      removeCookie("reportId");
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err?.data || err?.message);
    }
  };

  if (isDeadlinesLoading || isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;
  if (deadlinesError || headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi:</p>
        <ul className="list-disc list-inside">
          {deadlinesError && <li>Deadline ma'lumotlarini yuklashda xatolik</li>}
          {headersError && <li>Jadval ustunlarini olishda xatolik</li>}
          {orgError && <li>Tashkilotlar ro'yxatini olishda xatolik</li>}
        </ul>
      </div>
    );

  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title || `Qadam ${currentStep + 1}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-full m-6 p-6 border rounded-lg shadow space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div>
          <label className="block mb-1 text-sm font-medium">Deadline:</label>
          <Select
            value={selectedDeadlineId}
            onValueChange={setSelectedDeadlineId}
            required
          >
            <SelectTrigger className="w-[300px] text-base">
              <SelectValue placeholder="Tanlang" />
            </SelectTrigger>
            <SelectContent>
              {deadlines_list?.results.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.submit_at}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {currentEmptyColumns.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-semibold">{currentStepTitle}</h2>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ustun nomi</TableHead>
                <TableHead className="min-w-[300px]">Qiymat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                if (col.title.toLowerCase().includes("tashkilot")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <select
                          value={selectedOrganizationId}
                          onChange={(e) => {
                            handleInputChange(
                              col.id,
                              e.target.value,
                              col.title,
                              col.fullParentChain
                            );
                            setSelectedOrganizationId(e.target.value);
                          }}
                          className="w-full border rounded px-2 py-1"
                          required
                        >
                          <option value="">Tanlang</option>
                          {organizationsData?.results?.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Read-only fields
                if (
                  (col.title.startsWith("To") &&
                    col.title.includes("lanishi kerak")) ||
                  col.title === "Qoldiq" ||
                  col.id === "48475651-9f86-440a-a39f-9e01545f5619" ||
                  col.id === "a084770d-ee80-4ecb-b6f6-27784d84f6aa" ||
                  col.id === "6933d1ce-e31d-4ca1-9fba-2af22a36c69a" ||
                  col.id === "1abfc54b-3195-4f5d-9a30-7226154852d4"
                ) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={formValues[col.id] || "0"}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Regular input fields
                return (
                  <TableRow key={col.id}>
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={formValues[col.id] || ""}
                        onChange={(e) =>
                          handleInputChange(
                            col.id,
                            e.target.value,
                            col.title,
                            col.fullParentChain
                          )
                        }
                        required
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p>Ushbu qadamda to'ldirish uchun ustunlar yo'q.</p>
      )}
      <div className="flex justify-between items-center pt-4">
        <div className="space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
          >
            Oldingi
          </Button>
          {currentStep < totalSteps - 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
              }
            >
              Keyingi
            </Button>
          )}
        </div>
        {currentStep === totalSteps - 1 && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default FundCreate;
