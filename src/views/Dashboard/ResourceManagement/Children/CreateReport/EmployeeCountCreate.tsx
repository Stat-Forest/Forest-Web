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

function categorizeColumns(
  cols: { id: string; title: string; fullParentChain: string }[]
) {
  const shundan1Ids = cols
    .filter((col) => col.fullParentChain.toLowerCase().includes("shundan-1"))
    .map((col) => col.id);
  const shundan2Ids = cols
    .filter((col) => col.fullParentChain.toLowerCase().includes("shundan-2"))
    .map((col) => col.id);

  const jamiXodimlarId = cols.find((col) =>
    col.fullParentChain.toLowerCase().includes("jami xodimlar soni")
  )?.id;
  const jamiVakantlarId = cols.find((col) =>
    col.fullParentChain.toLowerCase().includes("jami vakatlar soni")
  )?.id;

  return { shundan1Ids, shundan2Ids, jamiXodimlarId, jamiVakantlarId };
}

function EmployeeCountCreate() {
  const dispatch = useDispatch<AppDispatch>();
  const reportIds = useSelector((state: RootState) => state.report.reportId);

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
  } = useGetStatementColumnsReportQuery(reportIds as string, {
    skip: !reportIds,
    refetchOnMountOrArgChange: false,
  });
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

  const { shundan1Ids, shundan2Ids, jamiXodimlarId, jamiVakantlarId } =
    categorizeColumns(allEmptyColumnsByStep.flat());

  const shundan1Sum = shundan1Ids.reduce(
    (sum, id) => sum + (Number(formValues[id]) || 0),
    0
  );

  const shundan2Sum = shundan2Ids.reduce(
    (sum, id) => sum + (Number(formValues[id]) || 0),
    0
  );

  const allColumnsFlat = allEmptyColumnsByStep.flat();

  const getColId = (fullChain: string) =>
    allColumnsFlat.find(
      (col) => col.fullParentChain.toLowerCase() === fullChain.toLowerCase()
    )?.id;

  // New calculated column IDs
  const jamiIshlovchiId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Jami ishlovchi xodimlar soni"
  );
  const jamiYoshlarId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Xodimlar / Yoshlar Jami"
  );
  const malumotOliyId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Ma'lumoti / Oliy"
  );
  const malumotOrtaMaxsusId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Ma'lumoti / O'rta maxsus"
  );
  const malumotOrtaId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Ma'lumoti / O'rta"
  );
  const yoshQizlarId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Xodimlar / Yoshlar / Qizlar"
  );
  const yoshYigitlarId = getColId(
    "Tizim tashkilotlaridagi xodimlarni sifat tarkibi togrisida malumot / Xodimlar / Yoshlar / Yigitlar"
  );
  // New Job Positions calculation IDs
  const jamiYangiIshOrinlariId = getColId(
    "Tizim tashkilotlaridagi yangi ish o‘rinlari haqida ma’lumot / Jami yangi yaratilgan ish o'rinlar soni"
  );
  const yangiDoimiyId = getColId(
    "Tizim tashkilotlaridagi yangi ish o‘rinlari haqida ma’lumot / Shundan / Doimiy"
  );
  const yangiMavsumiyId = getColId(
    "Tizim tashkilotlaridagi yangi ish o‘rinlari haqida ma’lumot / Shundan / Mavsumiy"
  );

  // Sum values
  const malumotSum =
    (malumotOliyId ? Number(formValues[malumotOliyId]) || 0 : 0) +
    (malumotOrtaMaxsusId ? Number(formValues[malumotOrtaMaxsusId]) || 0 : 0) +
    (malumotOrtaId ? Number(formValues[malumotOrtaId]) || 0 : 0);

  const yoshlarSum =
    (yoshQizlarId ? Number(formValues[yoshQizlarId]) || 0 : 0) +
    (yoshYigitlarId ? Number(formValues[yoshYigitlarId]) || 0 : 0);

  const yangiIshOrinlariSum =
    (yangiDoimiyId ? Number(formValues[yangiDoimiyId]) || 0 : 0) +
    (yangiMavsumiyId ? Number(formValues[yangiMavsumiyId]) || 0 : 0);

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
    const report_items = allColumns.map((col) => {
      let value: string;

      if (col.title.toLowerCase().includes("tashkilot")) {
        value = selectedOrganizationId;
      } else if (col.title.toLowerCase().includes("reja")) {
        value = String(planListMap[col.id] ?? "");
      } else if (col.id === jamiXodimlarId) {
        value = String(shundan1Sum);
      } else if (col.id === jamiVakantlarId) {
        value = String(shundan2Sum);
      } else if (col.id === jamiIshlovchiId) {
        value = String(malumotSum);
      } else if (col.id === jamiYoshlarId) {
        value = String(yoshlarSum);
      } else if (col.id === jamiYangiIshOrinlariId) {
        value = String(yangiIshOrinlariSum);
      } else {
        value = String(formValues[col.id] || "0");
      }

      return {
        statement_column: col.id,
        value,
      };
    });

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

  console.log(organizationsData);

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
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={
                          col.id === jamiXodimlarId
                            ? shundan1Sum
                            : col.id === jamiVakantlarId
                            ? shundan2Sum
                            : col.id === jamiIshlovchiId
                            ? malumotSum
                            : col.id === jamiYoshlarId
                            ? yoshlarSum
                            : col.id === jamiYangiIshOrinlariId
                            ? yangiIshOrinlariSum
                            : formValues[col.id] || ""
                        }
                        disabled={
                          col.id === jamiXodimlarId ||
                          col.id === jamiVakantlarId ||
                          col.id === jamiIshlovchiId ||
                          col.id === jamiYoshlarId ||
                          col.id === jamiYangiIshOrinlariId
                        }
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
            {isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default EmployeeCountCreate;
