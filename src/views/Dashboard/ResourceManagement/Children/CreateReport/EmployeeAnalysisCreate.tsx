import { useState, useEffect, useMemo } from "react";
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
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";

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

function EmployeeAnalysisCreate() {
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
    { statementId: reportIds, lang, isUser:"true" },
    {
      skip: !reportIds,
      refetchOnMountOrArgChange: false,
    }
  );

  const navigate = useNavigate();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [planListMap, setPlanListMap] = useState<Record<string, number>>({});
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  const sumSourceTitles = [
    "shu jumladan / Departament mudiri",
    "shu jumladan / Boshqarma boshlig‘i",
    "shu jumladan / Bo‘lim boshlig‘i",
    "shu jumladan / Sho‘ba mudiri",
    "shu jumladan / Mutaxassislar‑2",
  ];

  const totalTitle =
    "O‘rmon xo‘jaligi xodimlari to‘g‘risidagi statistik tahlili / Kadrlar qo‘nimsizligi va xodimlarning kasbiy o‘sishi / Malaka oshirgan va qayta o‘qish kurslariga qatnashgan xodimlar soni / Jami";

  const jamiBoshOromchiId = useMemo(() => {
    const allCols = allEmptyColumnsByStep.flat();
    return allCols.find((col) =>
      col.fullParentChain.includes(
        "Bosh o‘rmonchi, o‘rmon xo‘jaligi muhandisi, o‘rmonchi, nazoratchi, egermayor va boshqa o‘rmon xo‘jaligi mutaxassislari / Jami"
      )
    )?.id;
  }, [allEmptyColumnsByStep]);

  const jamiMagisterOliyOrtaId = useMemo(() => {
    const allCols = allEmptyColumnsByStep.flat();
    return allCols.find((col) =>
      col.fullParentChain.includes(
        "Ma’lumot darajasi bo‘yicha mutaxassislarga bo‘lgan talab / Jami"
      )
    )?.id;
  }, [allEmptyColumnsByStep]);

  // 1) Bosh o‘rmonchi jami uchun id lar (oliy, o'rta maxsus, o'rta)
  const boshOromchiOliyJamiIds = useMemo(() => {
    const allCols = allEmptyColumnsByStep.flat();
    return allCols
      .filter((col) =>
        col.fullParentChain.includes(
          "Bosh o‘rmonchi, o‘rmon xo‘jaligi muhandisi, o‘rmonchi, nazoratchi, egermayor va boshqa o‘rmon xo‘jaligi mutaxassislari"
        )
      )
      .filter(
        (col) =>
          col.fullParentChain.includes("Oliy ma'lumotli / Jami") ||
          col.fullParentChain.includes("O'rta-maxsus malumotli / Jami") ||
          col.fullParentChain.includes("O'rta malumotli")
      )
      .map((col) => col.id);
  }, [allEmptyColumnsByStep]);

  // 2) Ma’lumot darajasi bo‘yicha jami uchun id lar (Magister 2025-2027, Oliy ma'lumotli 2025-2027, O'rta-maxsus 2025-2027)
  const malakaJamiIds = useMemo(() => {
    const allCols = allEmptyColumnsByStep.flat();
    const years = ["2025", "2026", "2027"];
    const degrees = ["Magister", "Oliy ma'lumotli", "O'rta-maxsus malumotli"];

    let ids: string[] = [];

    years.forEach((year) => {
      degrees.forEach((degree) => {
        const found = allCols.find(
          (col) =>
            col.fullParentChain.includes(degree) &&
            col.fullParentChain.includes(year)
        );
        if (found) ids.push(found.id);
      });
    });

    return ids;
  }, [allEmptyColumnsByStep]);

  useEffect(() => {
    const fetchPlanLists = async () => {
      if (
        !selectedOrganizationId ||
        !reportIds ||
        !tableHeadersData ||
        tableHeadersData.length === 0
      ) {
        return;
      }

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
  }, [selectedOrganizationId, reportIds, dispatch]);

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

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();

  const handleInputChange = (id: string, value: any) => {
    setFormValues((prev) => {
      const updated = { ...prev, [id]: value };

      const allColumns = allEmptyColumnsByStep.flat();

      // 1. Yangi jami hisoblashlar (sizning yangi bo‘limlaringiz)
      // boshOromchiJami va malakaJami

      if (jamiBoshOromchiId) {
        const total = boshOromchiOliyJamiIds.reduce((acc, colId) => {
          const v = updated[colId];
          const n = parseFloat(v);
          return acc + (isNaN(n) ? 0 : n);
        }, 0);
        updated[jamiBoshOromchiId] = total.toString();
      }

      if (jamiMagisterOliyOrtaId) {
        const total = malakaJamiIds.reduce((acc, colId) => {
          const v = updated[colId];
          const n = parseFloat(v);
          return acc + (isNaN(n) ? 0 : n);
        }, 0);
        updated[jamiMagisterOliyOrtaId] = total.toString();
      }

      // 2. Eski logic (malaka oshirish jami)
      const sumSourceColumns = allColumns.filter((col) =>
        sumSourceTitles.some((title) => col.fullParentChain.includes(title))
      );

      const jamiMalakaColumn = allColumns.find(
        (col) => col.fullParentChain === totalTitle
      );

      if (jamiMalakaColumn) {
        const total = sumSourceColumns.reduce((acc, col) => {
          const v = updated[col.id];
          const n = parseFloat(v);
          return acc + (isNaN(n) ? 0 : n);
        }, 0);

        updated[jamiMalakaColumn.id] = total.toString();
      }

      return updated;
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
      console.log(payload);
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
        <div className="">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-semibold">{currentStepTitle}</h2>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[250px] break-words whitespace-normal">
                  Ustun nomi
                </TableHead>
                <TableHead className="min-w-[100px]">Qiymat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                const isTotalField = col.fullParentChain === totalTitle;

                if (col.title.toLowerCase().includes("tashkilot")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell className="break-words whitespace-normal max-w-[1000px]">
                        {col.fullParentChain}
                      </TableCell>
                      <TableCell>
                        <select
                          value={selectedOrganizationId}
                          onChange={(e) => {
                            handleInputChange(col.id, e.target.value);
                            setSelectedOrganizationId(e.target.value);
                          }}
                          className="w-full border rounded px-2 py-1"
                          required
                        >
                          <option value="">Tanlang</option>
                          {organizationsData?.map((item: any) => (
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
                    <TableCell className="break-words whitespace-normal max-w-[1500px]">
                      {col.fullParentChain}
                    </TableCell>
                    <TableCell className="max-w-[50px]">
                      <Input
                        type="number"
                        value={formValues[col.id] || ""}
                        disabled={isTotalField}
                        onChange={(e) =>
                          !isTotalField &&
                          handleInputChange(col.id, e.target.value)
                        }
                        className={isTotalField ? "bg-gray-100 w-[100px]" : "w-[300px]"}
                        required={!isTotalField}
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
            {isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        )}
      </div>
    </form> 
  );
}

export default EmployeeAnalysisCreate;
