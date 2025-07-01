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

interface ColumnData {
  id: string;
  title: string;
  fullParentChain: string;
  type: "plan" | "actual" | "percentage" | "organization";
}

function findEmptyChildrenColumnIds(children: any[]): ColumnData[] {
  const result: ColumnData[] = [];

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
        const lowerTitle = col.title.toLowerCase();
        let type: ColumnData["type"] = "actual";

        if (lowerTitle.includes("reja") || lowerTitle.includes("plan")) {
          type = "plan";
        } else if (
          lowerTitle.includes("foiz") ||
          lowerTitle.includes("percentage")
        ) {
          type = "percentage";
        } else if (lowerTitle.includes("tashkilot")) {
          type = "organization";
        }

        result.push({
          id: col.id,
          title: col.title,
          fullParentChain: currentChain.join(" / "),
          type,
        });
      }
    });
  };

  traverse(children);
  return result;
}

function CreateFinanceReport() {
  const dispatch = useDispatch<AppDispatch>();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const navigate = useNavigate();

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
  });

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [planListMap, setPlanListMap] = useState<Record<string, number>>({});

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    ColumnData[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const [planPercentage, setPlanPercentage] = useState("0");

  function calculateIncomeSum(
    columns: ColumnData[],
    formValues: Record<string, any>
  ) {
    let sum = 0;

    columns.forEach((col) => {
      // Skip the "Jami" row itself
      if (col.fullParentChain.includes("Jami")) return;

      // Only sum values from income-related actual value rows
      if (
        col.fullParentChain.includes(
          "2025 yil davomida topilgan daromadlar haqida MA'LUMOT"
        ) &&
        col.type === "actual"
      ) {
        const value = parseFloat(formValues[col.id] || "0");
        if (!isNaN(value)) {
          sum += value;
        }
      }
    });

    return {
      displayValue: sum.toFixed(2),
      rawValue: sum,
    };
  }

  // ✅ Fixed: This function now properly aggregates monthly Amalda
  function calculateQuarterlyAmalda(
    columns: ColumnData[],
    formValues: Record<string, any>
  ) {
    const quarterlyData: Record<string, { sum: number; amaldaId?: string }> =
      {};

    columns.forEach((col) => {
      const pathParts = col.fullParentChain.split(" / ");

      if (pathParts.length === 4 && pathParts[3] === "Amalda") {
        const quarter = pathParts[1].split(" ")[0];
        const value = parseFloat(formValues[col.id] || "0");
        if (!quarterlyData[quarter]) {
          quarterlyData[quarter] = { sum: 0 };
        }
        quarterlyData[quarter].sum += value;
        return;
      }

      if (pathParts.length === 3 && pathParts[2] === "Amalda") {
        const quarter = pathParts[1].split(" ")[0];
        if (!quarterlyData[quarter]) {
          quarterlyData[quarter] = { sum: 0 };
        }
      }
    });

    return quarterlyData;
  }

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

      const planColumns = allStepsEmptyCols.filter(
        (col: any) => col.type === "plan"
      );

      const requests = planColumns.map(async (col: any) => {
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
          console.error(
            `Error fetching plan value for column ${col.id}:`,
            error
          );
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

  const handleInputChange = (id: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  const allColumns = useMemo(
    () => allEmptyColumnsByStep.flat(),
    [allEmptyColumnsByStep]
  );

  const quarterlyAmalda = useMemo(
    () => calculateQuarterlyAmalda(allColumns, formValues),
    [allColumns, formValues]
  );

  const yearlyTushumValue = useMemo(
    () => Object.values(quarterlyAmalda).reduce((sum, q) => sum + q.sum, 0),
    [quarterlyAmalda]
  );

  // Calculate percentage in useEffect
  useEffect(() => {
    if (currentEmptyColumns.length > 0) {
      const yearlyPlanColumn = currentEmptyColumns.find((c) =>
        c.fullParentChain.includes("Yillik reja")
      );

      if (yearlyPlanColumn) {
        const yearlyPlanValue = Number(planListMap[yearlyPlanColumn.id] || 0);
        const percentage =
          yearlyPlanValue !== 0
            ? ((yearlyTushumValue / yearlyPlanValue) * 100).toFixed(2)
            : "0";
        setPlanPercentage(percentage);
      }
    }
  }, [currentEmptyColumns, planListMap, yearlyTushumValue]);

  const calculatePercentage = (planPath: string, actualPath: string) => {
    const planCol = currentEmptyColumns.find(
      (c) => c.fullParentChain === planPath
    );
    const actualCol = currentEmptyColumns.find(
      (c) => c.fullParentChain === actualPath
    );

    const planValue = planCol
      ? parseFloat(String(planListMap[planCol.id] ?? "0"))
      : 0;
    const actualValue = actualCol
      ? parseFloat(String(formValues[actualCol.id] ?? "0"))
      : 0;

    return planValue !== 0 ? ((actualValue / planValue) * 100).toFixed(2) : "0";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDeadlineId) {
      alert("Iltimos, muddatni tanlang");
      return;
    }

    const hasOrganizationColumn = currentEmptyColumns.some(
      (col) => col.type === "organization"
    );

    if (hasOrganizationColumn && !selectedOrganizationId) {
      alert("Iltimos, tashkilotni tanlang");
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();

    // Recompute quarterly Amalda
    const quarterlyAmalda = calculateQuarterlyAmalda(allColumns, formValues);

    // Find the Jami column
    const jamiColumn = allColumns.find(
      (col) =>
        col.fullParentChain.includes("Jami") &&
        col.fullParentChain.includes(
          "2025 yil davomida topilgan daromadlar haqida MA'LUMOT"
        )
    );

    // Calculate the correct total for Jami (EXCLUDING Amalda)
    let jamiTotal = 0;
    const incomeColumns = allColumns.filter(
      (col) =>
        col.fullParentChain.includes(
          "2025 yil davomida topilgan daromadlar haqida MA'LUMOT"
        ) &&
        !col.fullParentChain.includes("Jami") &&
        !col.fullParentChain.includes("Amalda") && // Exclude Amalda from sum
        col.type === "actual"
    );

    incomeColumns.forEach((col) => {
      const value = parseFloat(formValues[col.id] || "0");
      if (!isNaN(value)) {
        jamiTotal += value;
      }
    });

    // Calculate yearly tushum sum (sum of all quarters)
    const yearlyTushumValue = Object.values(quarterlyAmalda).reduce(
      (sum, q) => sum + q.sum,
      0
    );

    // Find the yearly plan column
    const yearlyPlanColumn = allColumns.find(
      (c) => c.fullParentChain.includes("Yillik reja") && c.type === "plan"
    );

    // Calculate the yearly percentage
    const yearlyPlanValue = yearlyPlanColumn
      ? Number(planListMap[yearlyPlanColumn.id] || 0)
      : 0;

    const calculatedPercentage =
      yearlyPlanValue !== 0
        ? ((yearlyTushumValue / yearlyPlanValue) * 100).toFixed(2)
        : "0";

    const report_items = allColumns.map((col) => {
      let value: string;

      const pathParts = col.fullParentChain.split(" / ");
      const isQuarterlyAmalda =
        pathParts.length === 3 && pathParts[2] === "Amalda";
      const isYearlyTushum = col.fullParentChain.includes(
        "Yil boshidan / Tushum"
      );

      if (col.id === "14bb5dc3-15bb-4812-9008-099e677ca2d4") {
        value = calculatedPercentage;
      } else if (col.id === "fd3f105f-96a1-4938-bf18-0f2d60cce6bd") {
        value = calculatedPercentage;
      } else if (col.type === "percentage") {
        const planPath = col.fullParentChain
          .replace("Foiz", "Reja")
          .replace("Percentage", "Plan");
        const actualPath = col.fullParentChain
          .replace("Foiz", "Amalda")
          .replace("Percentage", "Actual");

        // Recalculate percentage the same way as in the UI
        const planCol = allColumns.find((c) => c.fullParentChain === planPath);
        const actualCol = allColumns.find(
          (c) => c.fullParentChain === actualPath
        );

        const planValue = planCol
          ? parseFloat(String(planListMap[planCol.id] ?? "0"))
          : 0;
        const actualValue = actualCol
          ? parseFloat(String(formValues[actualCol.id] ?? "0"))
          : 0;

        value =
          planValue !== 0 ? ((actualValue / planValue) * 100).toFixed(2) : "0";
      } else if (col.type === "plan") {
        value = String(planListMap[col.id] ?? "");
      } else if (col.type === "organization") {
        value = selectedOrganizationId;
      } else if (col.id === jamiColumn?.id) {
        value = String(jamiTotal);
      } else if (isQuarterlyAmalda) {
        const quarter = pathParts[1].split(" ")[0];
        value = String(quarterlyAmalda[quarter]?.sum || "0");
      } else if (isYearlyTushum) {
        value = String(yearlyTushumValue);
      } else if (
        col.fullParentChain ===
        `2025 yil davomida topilgan daromadlar haqida MA'LUMOT / Amalda (ming sum)`
      ) {
        value = String(yearlyTushumValue);
      } else {
        value = String(formValues[col.id] || "");
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
      console.log("Final submission payload:", payload);
      const res = await createReportItem(payload).unwrap();
      console.log("Report submitted successfully:", res);
      removeCookie("reportId");
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
    } catch (err: any) {
      console.error("Submission error:", err?.data || err?.message);
      alert("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  };

  if (isDeadlinesLoading || isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Loading...</p>;

  if (deadlinesError || headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>Error occurred:</p>
        <ul className="list-disc list-inside">
          {deadlinesError && <li>Error loading deadlines</li>}
          {headersError && <li>Error loading table columns</li>}
          {orgError && <li>Error loading organizations</li>}
        </ul>
      </div>
    );

  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title || `Step ${currentStep + 1}`;

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
              <SelectValue placeholder="Select deadline" />
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
                // In your table rendering, replace the percentage block with:
                if (col.fullParentChain.includes("Yillik rejaga nisbatan %")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={`${planPercentage}%`}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }
                // In your table rendering, replace the percentage block with:
                if (col.fullParentChain.includes("Rejaga nisbatan %")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={`${planPercentage}%`}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }
                // Plan columns (read-only from database)
                if (col.type === "plan") {
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

                // Percentage columns (auto-calculated)
                if (col.type === "percentage") {
                  const planPath = col.fullParentChain
                    .replace("Foiz", "Reja")
                    .replace("Percentage", "Plan");
                  const actualPath = col.fullParentChain
                    .replace("Foiz", "Amalda")
                    .replace("Percentage", "Actual");

                  const percentage = calculatePercentage(planPath, actualPath);

                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={`${percentage}%`}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Organization selection
                if (col.type === "organization") {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Select
                          value={selectedOrganizationId}
                          onValueChange={(value) => {
                            handleInputChange(col.id, value);
                            setSelectedOrganizationId(value);
                          }}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizationsData?.results.map((item: any) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Check if this is the "Jami" (Total) row for income section
                const isTotalRow =
                  col.fullParentChain.includes("Jami") &&
                  col.fullParentChain.includes(
                    "2025 yil davomida topilgan daromadlar haqida MA'LUMOT"
                  );

                // In the TableBody rendering:
                if (isTotalRow) {
                  const total = calculateIncomeSum(
                    currentEmptyColumns,
                    formValues
                  );
                  return (
                    <TableRow key={col.id}>
                      <TableCell className="font-bold">
                        {col.fullParentChain}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={total.displayValue}
                          disabled
                          className="bg-gray-100 font-bold"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Handle quarterly Amalda specially
                const pathParts = col.fullParentChain.split(" / ");
                const isQuarterlyAmalda =
                  pathParts.length === 3 && pathParts[2] === "Amalda";

                if (isQuarterlyAmalda) {
                  const quarter = pathParts[1].split(" ")[0];
                  const quarterlySum = quarterlyAmalda[quarter]?.sum || 0;

                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={quarterlySum}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Yearly tushum
                if (
                  col.fullParentChain ===
                  "2025 yil holatiga daromad tushumi to‘g‘risida ma’lumot / Yil boshidan / Tushum"
                ) {
                  const yearlySum = Object.values(quarterlyAmalda).reduce(
                    (sum, q) => sum + q.sum,
                    0
                  );
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={yearlySum}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Amalda (ming sum)
                if (
                  col.fullParentChain ===
                  "2025 yil davomida topilgan daromadlar haqida MA'LUMOT / Amalda (ming sum)"
                ) {
                  const yearlySum = Object.values(quarterlyAmalda).reduce(
                    (sum, q) => sum + q.sum,
                    0
                  );
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={yearlySum}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                // Regular actual value inputs (editable)
                return (
                  <TableRow key={col.id}>
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        step="0.01"
                        value={formValues[col.id] || ""}
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
        <p>No columns to fill in this step.</p>
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
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default CreateFinanceReport;
