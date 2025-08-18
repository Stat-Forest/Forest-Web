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

function RodPrepareCreate() {
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
    { statementId: reportIds, lang,isUser:"true" },
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
  const [calculatedValues, setCalculatedValues] = useState<Record<string, any>>(
    {}
  );

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  // Helper function to check if a column is auto-calculated
  const isAutoCalculated = (col: {
    id: string;
    title: string;
    fullParentChain: string;
  }) => {
    const fullPath = col.fullParentChain.toLowerCase().trim();
    const title = col.title.toLowerCase().trim();

    if (
      (fullPath.includes("jami") && fullPath.includes("amalda")) ||
      (title.includes("jami") && title.includes("amalda"))
    ) {
      const excludeKeywords = [
        "terak",
        "jiyda",
        "chinar",
        "majnutol",
        "tol",
        "xilokatalpa",
        "boshqa",
        "terak amalda",
        "jiyda amalda",
      ];

      const hasExcludeKeyword = excludeKeywords.some((keyword) =>
        fullPath.includes(keyword)
      );

      if (!hasExcludeKeyword) {
        return true;
      }
    }

    if (fullPath.includes("foiz") || title.includes("foiz")) {
      return true;
    }

    return false;
  };

  // Get all columns across all steps
  const getAllColumns = () => {
    return allEmptyColumnsByStep.flat();
  };

  // Calculate the total Amalda first (separated from percentage calculation)
  const totalAmaldaValue = useMemo(() => {
    const allColumns = getAllColumns();
    if (allColumns.length === 0) return 0;

    const amaldaColumns = allColumns.filter((col) => {
      const fullPath = col.fullParentChain.toLowerCase().trim();
      const title = col.title.toLowerCase().trim();

      const hasAmalda = fullPath.includes("amalda") || title.includes("amalda");
      const isOverallJami =
        isAutoCalculated(col) &&
        ((fullPath.includes("jami") && fullPath.includes("amalda")) ||
          (title.includes("jami") && title.includes("amalda")));

      return hasAmalda && !isOverallJami;
    });

    const totalAmalda = amaldaColumns.reduce((sum, col) => {
      const value = parseFloat(formValues[col.id] || "0");
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    return totalAmalda;
  }, [formValues, allEmptyColumnsByStep]);

  // Calculate all auto-calculated values (both Amalda total and percentages)
  const calculateValues = useMemo(() => {
    const allColumns = getAllColumns();
    if (allColumns.length === 0) return {};

    const newCalculatedValues: Record<string, any> = {};

    // 1. Set the overall Amalda total
    const overallAmaldaColumn = allColumns.find((col) => {
      const fullPath = col.fullParentChain.toLowerCase().trim();
      const title = col.title.toLowerCase().trim();
      return (
        isAutoCalculated(col) &&
        ((fullPath.includes("jami") && fullPath.includes("amalda")) ||
          (title.includes("jami") && title.includes("amalda")))
      );
    });

    if (overallAmaldaColumn) {
      newCalculatedValues[overallAmaldaColumn.id] = totalAmaldaValue.toString();
    }

    // 2. Calculate percentages for each 'Foiz' column using the current totalAmaldaValue
    const foizColumns = allColumns.filter(
      (col) =>
        col.fullParentChain.toLowerCase().trim().includes("foiz") ||
        col.title.toLowerCase().trim().includes("foiz")
    );

    foizColumns.forEach((foizCol) => {
      const pathParts = foizCol.fullParentChain
        .split(" / ")
        .map((p) => p.trim());
      const basePath = pathParts.slice(0, -1).join(" / ").toLowerCase();

      let rejaCol = allColumns.find(
        (col) =>
          col.fullParentChain.toLowerCase().trim() ===
          `${basePath} / reja`.trim()
      );

      // If we can't find a direct match, try to find the corresponding Reja column
      if (!rejaCol) {
        const parentParts = pathParts.slice(0, -1);
        rejaCol = allColumns.find((col) => {
          const colParts = col.fullParentChain
            .split(" / ")
            .map((p) => p.trim());
          const lastPart = colParts[colParts.length - 1].toLowerCase();
          return (
            lastPart.includes("reja") &&
            colParts.some((part) =>
              parentParts.some((p) => p.toLowerCase() === part.toLowerCase())
            )
          );
        });
      }

      if (rejaCol) {
        const rejaValue = parseFloat(
          planListMap[rejaCol.id]?.toString() || "0"
        );

        if (rejaValue > 0) {
          const percentage = (totalAmaldaValue / rejaValue) * 100;
          newCalculatedValues[foizCol.id] = percentage.toFixed(2);
        } else {
          newCalculatedValues[foizCol.id] = "0";
        }
      } else {
        newCalculatedValues[foizCol.id] = "0";
      }
    });

    return newCalculatedValues;
  }, [formValues, planListMap, allEmptyColumnsByStep, totalAmaldaValue]); // Added totalAmaldaValue as dependency

  // Update calculatedValues whenever calculateValues changes
  useEffect(() => {
    setCalculatedValues(calculateValues);
  }, [calculateValues]);

  const getDisplayValue = (col: {
    id: string;
    title: string;
    fullParentChain: string;
  }) => {
    if (isAutoCalculated(col)) {
      return calculatedValues[col.id] || "";
    }
    return formValues[col.id] || "";
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
  }, [selectedOrganizationId, reportIds, dispatch, tableHeadersData]);

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
        : isAutoCalculated(col)
        ? String(calculatedValues[col.id] || "")
        : String(formValues[col.id] || ""),
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
      setCalculatedValues({});
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

                if (isAutoCalculated(col)) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={getDisplayValue(col)}
                          disabled
                          className="bg-blue-50 border-blue-200 text-blue-800"
                          title="Auto-calculated field"
                        />
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
                        value={getDisplayValue(col)}
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

export default RodPrepareCreate;
