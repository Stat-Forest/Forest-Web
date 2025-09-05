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
  useUpdateReportMutation,
  useGetStatementColumnsReportQuery,
  useGetReportByIdQuery,
  reportApi,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate, useParams } from "react-router-dom";
import InfiniteSelect from "@/components/ui/InfiniteSelect";
import { skipToken } from "@reduxjs/toolkit/query";

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

function AllUpdateReportItem() {
  const { id } = useParams();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [planItems, setPlanItems] = useState<
    { columnId: string; plan_value: string; fullParentChain: string }[]
  >([]);

  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // mavjud reportni olish
  const {
    data: existingReport,
    isLoading: isReportLoading,
    error: reportError,
  } = useGetReportByIdQuery(id ?? skipToken);

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
    reportIds ? { statementId: reportIds, lang, isUser: "true" } : skipToken
  );

  const tableHeadersDataMemo = useMemo(
    () => tableHeadersData,
    [tableHeadersData]
  );

  const allEmptyColumnsByStepMemo = useMemo(() => {
    return tableHeadersDataMemo.map((obj: any) =>
      Array.isArray(obj.children)
        ? findEmptyChildrenColumnIds(obj.children)
        : []
    );
  }, [tableHeadersDataMemo]);

  // ✅ faqat yangi qiymat bo‘lsa state yangilanadi
  useEffect(() => {
    if (allEmptyColumnsByStepMemo.length > 0) {
      const isDifferent =
        JSON.stringify(allEmptyColumnsByStepMemo) !==
        JSON.stringify(allEmptyColumnsByStep);
      if (isDifferent) {
        setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
        setCurrentStep(0);
      }
    }
  }, [allEmptyColumnsByStepMemo]);

  // mavjud reportdan boshlang‘ich qiymatlarni olish
  useEffect(() => {
    if (existingReport?.report_items) {
      const initialValues: Record<string, string> = {};
      existingReport.report_items.forEach((item: any) => {
        initialValues[item.statement_column] = item.inners?.[0]?.value || "";
      });
      setFormValues(initialValues);
      setSelectedDeadlineId(existingReport.deadline || "");
      const orgItem = existingReport.report_items.find((it: any) =>
        it.statement_column_title?.toLowerCase()?.includes("tashkilot")
      );
      if (orgItem) setSelectedOrganizationId(orgItem.inners?.[0]?.value || "");
    }
  }, [existingReport]);

  // reja qiymatlarini olish
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = allEmptyColumnsByStep
        .flat()
        .filter((col) => col.title.toLowerCase().includes("reja"));

      if (rejaColumns.length === 0 || !reportIds || !selectedOrganizationId)
        return;

      try {
        const results = await Promise.all(
          rejaColumns.map((col) =>
            dispatch(
              reportApi.endpoints.getPlanItemsReport.initiate({
                organization_id: selectedOrganizationId,
                statement_id: reportIds,
                year: "2025",
                column: col.id,
              })
            ).unwrap()
          )
        );

        if (isMounted) {
          const mergedResults = rejaColumns.map((col, idx) => {
            const res = results[idx]?.[0];
            return {
              columnId: col.id,
              fullParentChain: col.fullParentChain,
              plan_value: res?.plan_value?.toString() || "",
            };
          });
          setPlanItems(mergedResults);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Plan olishda xatolik:", error);
          setFormErrors((prev) => [
            ...prev,
            "Plan ma'lumotlarini olishda xatolik yuz berdi",
          ]);
        }
      }
    };

    fetchPlanDataForColumns();
    return () => {
      isMounted = false;
    };
  }, [allEmptyColumnsByStep, selectedOrganizationId, reportIds, dispatch]);

  // update mutation
  const [updateReport, { isLoading: isSubmitting }] = useUpdateReportMutation();

  const handleInputChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors([]);

    if (!reportIds) {
      setFormErrors(["Report ID topilmadi"]);
      return;
    }

    const errors: string[] = [];
    if (!selectedDeadlineId) errors.push("Iltimos, deadline tanlang");
    if (
      allEmptyColumnsByStep[currentStep]?.some((col) =>
        col.title.toLowerCase().includes("tashkilot")
      ) &&
      !selectedOrganizationId
    ) {
      errors.push("Iltimos, tashkilot tanlang");
    }

    allEmptyColumnsByStep[currentStep]?.forEach((col) => {
      if (
        !col.title.toLowerCase().includes("reja") &&
        !col.title.toLowerCase().includes("tashkilot") &&
        (!formValues[col.id] || formValues[col.id].toString().trim() === "")
      ) {
        errors.push(`"${col.fullParentChain}" uchun qiymat kiritish shart`);
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();
    const report_items = allColumns.map((col) => {
      const isOrganizationColumn = col.title
        .toLowerCase()
        .includes("tashkilot");
      const isRejaColumn = col.title.toLowerCase().includes("reja");

      let rawValue: string = "";
      if (isOrganizationColumn) rawValue = selectedOrganizationId || "";
      else if (isRejaColumn) {
        const planItem = planItems.find((item) => item.columnId === col.id);
        rawValue = planItem ? planItem.plan_value : "";
      } else rawValue = formValues[col.id] || "";

      return { statement_column: col.id, inners: [{ value: rawValue }] };
    });

    const payload = {
      id: id,
      deadline: selectedDeadlineId,
      report_items,
    };

    console.log(payload);

    try {
      await updateReport(payload).unwrap();
      console.log("✅ Yangilandi");
      removeCookie("reportId");
      navigate(-1);
      setFormErrors([]);
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Ma'lumotlarni yangilashda xatolik yuz berdi";
      setFormErrors((prev) => [...prev, errorMessage]);
      console.error("Update xatolik:", err);
    }
  };

  if (isHeaderLoading || isOrgLoading || isReportLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;
  if (headersError || orgError || reportError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi</p>
      </div>
    );

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `Qadam ${currentStep + 1}`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`max-w-full m-6 p-6 border rounded-lg shadow space-y-6 ${
        isSubmitting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {formErrors.length > 0 && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <ul>
            {formErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

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
                const lowerTitle = col.title.toLowerCase();
                if (lowerTitle.includes("reja")) {
                  const planItem = planItems.find(
                    (item) => item.columnId === col.id
                  );
                  const planValue = planItem ? planItem.plan_value : "";
                  return (
                    <TableRow key={col.id}>
                      <TableCell className="whitespace-normal break-words">{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={planValue}
                          disabled
                          className="bg-gray-100 cursor-not-allowed"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (lowerTitle.includes("tashkilot")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell className="whitespace-normal break-words">{col.fullParentChain}</TableCell>
                      <TableCell>
                        <select
                          value={selectedOrganizationId}
                          onChange={(e) => {
                            setSelectedOrganizationId(e.target.value);
                            handleInputChange(col.id, e.target.value);
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
                    <TableCell className="whitespace-normal break-words">{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
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
        <p>Ushbu qadamda to‘ldirish uchun ustunlar yo‘q.</p>
      )}

      <div className="flex justify-between items-center pt-4">
        <div className="space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0 || isSubmitting}
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
              disabled={isSubmitting}
            >
              Keyingi
            </Button>
          )}
        </div>
        {currentStep === totalSteps - 1 && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "⏳ Yangilanmoqda..." : "Yangilash"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default AllUpdateReportItem;
