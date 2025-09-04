import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/store";
import { reportApi, useGetDeadlinesReportQuery, useGetStatementColumnsReportQuery, useGetReportByIdQuery, useUpdateReportMutation, } from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { useParams } from "react-router-dom";

function findEmptyChildrenColumnIds(children: any[]) {
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

function AllUpdate() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);

  const { data: reportData, isLoading: isReportLoading } =
    useGetReportByIdQuery(id!);
  const { data: deadlinesList, isLoading: isDeadlinesLoading } =
    useGetDeadlinesReportQuery();
  const { data: organizationsData, isLoading: isOrgLoading } =
    useGetOrganizationReportsQuery();
  const { data: tableHeadersData = [], isLoading: isHeaderLoading } =
    useGetStatementColumnsReportQuery(
      {
        statementId: reportIds,
        lang,isUser:"true"
      },
      {
        skip: !reportIds,
      }
    );

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [planListMap, setPlanListMap] = useState<Record<string, number>>({});
  const [updateReportItem, { isLoading: isSubmitting }] =
    useUpdateReportMutation();

  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  // Report ma'lumotlarini formaga yuklash
  useEffect(() => {
    if (reportData) {
      setSelectedDeadlineId(reportData.deadline.id);

      const orgItem = reportData?.report_items?.find((item: any) =>
        item?.statement_column_title?.toLowerCase().includes("tashkilot")
      );
      if (orgItem) setSelectedOrganizationId(orgItem.value);

      const initialFormValues: Record<string, any> = {};
      reportData.report_items.forEach((item: any) => {
        initialFormValues[item.statement_column] = item.value;
      });
      setFormValues(initialFormValues);
    }
  }, [reportData]);

  // Ustunlarni step-by-step formatda ajratish
  useEffect(() => {
    if (tableHeadersData.length > 0) {
      const allStepsEmptyCols = tableHeadersData.map((obj: any) =>
        Array.isArray(obj.children)
          ? findEmptyChildrenColumnIds(obj.children)
          : []
      );
      setAllEmptyColumnsByStep(allStepsEmptyCols);
      setCurrentStep(0);
    } else {
      setAllEmptyColumnsByStep([]);
      setCurrentStep(0);
    }
  }, [tableHeadersData]);

  // Reja qiymatlarini olish
  useEffect(() => {
    const fetchPlanLists = async () => {
      if (
        !Array.isArray(tableHeadersData) ||
        tableHeadersData.length === 0 ||
        !selectedOrganizationId ||
        !reportIds
      )
        return;

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
      if (rejaLeafColumns.length === 0) return;

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
          console.error(`❌ So‘rov xatoligi: columnId=${col.id}`, error);
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
  }, [JSON.stringify(tableHeadersData), selectedOrganizationId, reportIds]);

  const handleInputChange = (id: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
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
        : String(formValues[col.id] || "15"),
    }));

    const payload = { deadline: selectedDeadlineId, report_items };

    try {
      const res = await updateReportItem({ id, ...payload }).unwrap();
      console.log("✅ Yangilandi:", res);
      alert("Muvaffaqiyatli yangilandi!");
    } catch (err: any) {
      console.error("❌ Yangilashda xatolik:", err?.data || err?.message);
    }
  };

  if (isReportLoading || isDeadlinesLoading || isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;

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
              {deadlinesList?.results.map((d: any) => (
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
                if (col.title.toLowerCase().includes("reja")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={planListMap[col.id] ?? ""}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }
                if (col.title.toLowerCase().includes("tashkilot")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <select
                          value={formValues[col.id] || selectedOrganizationId} // ✅ Bu qator yechim
                          onChange={(e) => {
                            handleInputChange(col.id, e.target.value);
                            setSelectedOrganizationId(e.target.value);
                          }}
                          className="w-full border rounded px-2 py-1"
                          required
                        >
                          <option value="">Tanlang</option>
                          {organizationsData?.results.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={col.id}>
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={formValues[col.id] || "15"}
                        onChange={(e) =>
                          handleInputChange(col.id, e.target.value)
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
        <p>Ushbu qadamda to‘ldirish uchun ustunlar yo‘q.</p>
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
            {isSubmitting ? "Yuborilmoqda..." : "Yangilash"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default AllUpdate;
