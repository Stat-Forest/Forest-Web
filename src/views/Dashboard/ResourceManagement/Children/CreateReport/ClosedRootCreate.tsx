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
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/store";
import {
  fetchReportDeadlines,
  reportApi,
  useCreateReportMutation,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";
import InfiniteSelect from "@/components/ui/InfiniteSelect";

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

function ClosedRootCreate() {
  const dispatch = useDispatch<AppDispatch>();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();

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
    { statementId: reportIds, lang },
    {
      skip: !reportIds,
      refetchOnMountOrArgChange: false,
    }
  );

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [planListMap, setPlanListMap] = useState<Record<string, number>>({});
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  // Auto-calculation logic - separated to avoid infinite loops
  const [calculatedValues, setCalculatedValues] = useState<
    Record<string, string>
  >({});

  // Calculate auto values without updating formValues directly
  useEffect(() => {
    const allColumns = allEmptyColumnsByStep.flat();

    // Find the main total fields
    const totalAmaldaColumn = allColumns.find(
      (col) =>
        col.fullParentChain ===
        "O'rmon xo'jaligi agentligi tizimidagi o'rmon xo'jaliklari tomonidan 2025 yildan yirik hajmli yopiq ko'chatlarni yetishtirish to'g'risida tezkor ma'lumot. / Yirik hajmli yopiq ildizli ko'chatlar yetishtirish miqdori / Amalda"
    );

    const totalRejaColumn = allColumns.find(
      (col) =>
        col.fullParentChain ===
        "O'rmon xo'jaligi agentligi tizimidagi o'rmon xo'jaliklari tomonidan 2025 yildan yirik hajmli yopiq ko'chatlarni yetishtirish to'g'risida tezkor ma'lumot. / Yirik hajmli yopiq ildizli ko'chatlar yetishtirish miqdori / Reja"
    );

    const percentageColumn = allColumns.find(
      (col) =>
        col.fullParentChain ===
        "O'rmon xo'jaligi agentligi tizimidagi o'rmon xo'jaliklari tomonidan 2025 yildan yirik hajmli yopiq ko'chatlarni yetishtirish to'g'risida tezkor ma'lumot. / Yirik hajmli yopiq ildizli ko'chatlar yetishtirish miqdori / %"
    );

    if (!totalAmaldaColumn || !totalRejaColumn || !percentageColumn) {
      return;
    }

    // Calculate total Amalda (sum of all individual Amalda values except the main total)
    const individualAmaldaColumns = allColumns.filter(
      (col) =>
        col.title.toLowerCase().includes("amalda") &&
        col.id !== totalAmaldaColumn?.id
    );

    const totalAmaldaValue = individualAmaldaColumns.reduce((sum, col) => {
      const value = parseFloat(formValues[col.id] || "0");
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Get total Reja value (from planListMap)
    const totalRejaValue = planListMap[totalRejaColumn.id] || 0;

    // Calculate percentage
    const percentage =
      totalRejaValue > 0 ? (totalAmaldaValue / totalRejaValue) * 100 : 0;

    // Update calculated values separately
    setCalculatedValues({
      [totalAmaldaColumn.id]: totalAmaldaValue.toString(),
      [percentageColumn.id]: percentage.toFixed(2),
    });
  }, [formValues, planListMap, allEmptyColumnsByStep]);

  // Get the display value for a column (either from formValues or calculatedValues)
  const getColumnValue = (columnId: string) => {
    return calculatedValues[columnId] || formValues[columnId] || "";
  };

  // Fetch plan values for "Reja" columns
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
  }, [selectedOrganizationId, reportIds, dispatch]);

  // Initialize empty columns by step
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

  // Helper function to check if a column is auto-calculated
  const isAutoCalculatedColumn = (col: any) => {
    return (
      col.fullParentChain ===
        "O'rmon xo'jaligi agentligi tizimidagi o'rmon xo'jaliklari tomonidan 2025 yildan yirik hajmli yopiq ko'chatlarni yetishtirish to'g'risida tezkor ma'lumot. / Yirik hajmli yopiq ildizli ko'chatlar yetishtirish miqdori / Amalda" ||
      col.fullParentChain ===
        "O'rmon xo'jaligi agentligi tizimidagi o'rmon xo'jaliklari tomonidan 2025 yildan yirik hajmli yopiq ko'chatlarni yetishtirish to'g'risida tezkor ma'lumot. / Yirik hajmli yopiq ildizli ko'chatlar yetishtirish miqdori / %"
    );
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
        : calculatedValues[col.id] || String(formValues[col.id] || ""),
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

  if (isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;

  if (headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi:</p>
        <ul className="list-disc list-inside">
          {<li>Deadline ma'lumotlarini yuklashda xatolik</li>}
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
          <InfiniteSelect
            placeholder="Tanlang"
            fetchData={fetchReportDeadlines}
            className="border-none w-[300px] text-base"
            name="deadline"
            value={selectedDeadlineId}
            onValueChange={setSelectedDeadlineId}
          />
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
                // Handle "Reja" columns (read-only, from planListMap)
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

                // Handle "Tashkilot" columns (organization selector)
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

                // Handle auto-calculated columns (total Amalda and percentage)
                if (isAutoCalculatedColumn(col)) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={getColumnValue(col.id)}
                          disabled
                          className="bg-blue-50 text-blue-900 font-medium"
                          title="Bu qiymat avtomatik hisoblanadi"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Handle regular input columns
                return (
                  <TableRow key={col.id}>
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={getColumnValue(col.id)}
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

export default ClosedRootCreate;
