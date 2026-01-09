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
import { Textarea } from "@/components/ui/textarea";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/store";
import {
  useUpdateReportMutation,
  useGetStatementColumnsReportQuery,
  useGetReportByIdQuery,
  reportApi,
  useGetDeadlinesReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";

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

function InnersUpdateReportItem() {
  const { id } = useParams();
  const [formGroups, setFormGroups] = useState<Record<string, string>[]>([{}]);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [footNote, setFootNote] = useState<string>("");
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
  const { t } = useTranslation();

  // mavjud reportni olish
  const {
    data: existingReport,
    isLoading: isReportLoading,
    error: reportError,
  } = useGetReportByIdQuery(
    id ? { id: id, is_user_input: "true" } : skipToken
  );

  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery({ lang });

  const {
    data: tableHeadersData = [],
    isLoading: isHeaderLoading,
    error: headersError,
  } = useGetStatementColumnsReportQuery(
    reportIds ? { statementId: reportIds, lang, isUser: "true" } : skipToken
  );

  const [deadlinePage, setDeadlinePage] = useState(1);
  const perPage = 5;

  const {
    data: deadlineData,
    isLoading: deadlineLoading,
    error: deadlineError,
  } = useGetDeadlinesReportQuery(
    {
      statement: reportIds as string,
      page: deadlinePage,
      perPage,
      statement__period: "",
    },
    { skip: !reportIds }
  );

  const formatDeadlineText = (submitAt: string) => {
    if (!submitAt) return t("unknown");

    if (submitAt.includes("CHORAK")) {
      return submitAt.replace("CHORAK_", " yil ").replace("_", "-chorak");
    }

    return submitAt;
  };

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

  useEffect(() => {
    setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
    setCurrentStep(0);
  }, [allEmptyColumnsByStepMemo]);

  // mavjud reportdan boshlang'ich qiymatlarni olish
  useEffect(() => {
    if (existingReport?.report_items) {
      // 🔹 Har bir column'dan maximum inners sonini topish
      // Agar N ta object bo'lsa, N ta form bo'lishi kerak
      const maxInnersCount = Math.max(
        ...existingReport.report_items.map((item: any) => item.inners?.length || 0),
        1 // Minimum 1 ta form
      );

      console.log("DEBUG InnersUpdate: maxInnersCount =", maxInnersCount);
      console.log("DEBUG InnersUpdate: report_items =", existingReport.report_items);

      // Har bir inner uchun alohida form yaratish
      // inner[0] -> form[0], inner[1] -> form[1], va hokazo
      const initialFormGroups: Record<string, string>[] = [];
      
      for (let innerIndex = 0; innerIndex < maxInnersCount; innerIndex++) {
        const form: Record<string, string> = {};
        
        // Har bir column'dan shu innerIndex'dagi inner'ni olish
        existingReport.report_items.forEach((item: any) => {
          const isOrganizationColumn = item.statement_column_title
            ?.toLowerCase()
            .includes("tashkilot");
          
          // Tashkilot column'ini skip qilish
          if (!isOrganizationColumn) {
            // Agar bu column'da innerIndex'dagi inner mavjud bo'lsa, uni olish
            if (item.inners?.[innerIndex]) {
              form[item.statement_column] = item.inners[innerIndex].value || "";
            }
            // Agar inner mavjud bo'lmasa, bo'sh string qoldirish
            // (ba'zi column'larda inner'lar kam bo'lishi mumkin)
          }
        });
        
        initialFormGroups.push(form);
      }

      console.log("DEBUG InnersUpdate: Created", initialFormGroups.length, "forms");
      setFormGroups(initialFormGroups.length > 0 ? initialFormGroups : [{}]);
      setSelectedDeadlineId(existingReport.deadline || "");
      setFootNote(existingReport.foot_note || "");

      // Tashkilot ID ni topish
      const orgItem = existingReport.report_items.find((it: any) =>
        it.statement_column_title?.toLowerCase()?.includes("tashkilot")
      );
      if (orgItem?.inners?.[0]?.value) {
        setSelectedOrganizationId(orgItem.inners[0].value);
      }

      // Season ni topish (agar mavjud bo'lsa)
      if (existingReport.season) {
        setSelectedSeason(existingReport.season);
      }
    }
  }, [existingReport]);

  // 🔹 PLAN MA'LUMOTLARI
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = allEmptyColumnsByStep
        .flat()
        .filter((col) => col.title.toLowerCase().includes("reja"));

      if (rejaColumns.length === 0 || !reportIds || !selectedOrganizationId)
        return;

      // Agar season select mavjud bo'lsa (bu reportIds uchun), season tanlangandan keyin plan olinadi
      const hasSeasonSelect =
        reportIds === "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
        reportIds === "671577ba-6a86-4619-b31c-86fff20ad305";

      if (hasSeasonSelect && !selectedSeason) {
        setPlanItems([]);
        return;
      }

      try {
        const results = await Promise.all(
          rejaColumns.map((col) =>
            dispatch(
              reportApi.endpoints.getPlanItemsReport.initiate({
                organization_id: selectedOrganizationId,
                statement_id: reportIds as string,
                year: "2025",
                column: col.id,
                ...(selectedSeason && { season: selectedSeason }),
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
            t("plan_fetch_error"),
          ]);
        }
      }
    };

    fetchPlanDataForColumns();
    return () => {
      isMounted = false;
    };
  }, [
    allEmptyColumnsByStep,
    selectedOrganizationId,
    reportIds,
    selectedSeason,
    dispatch,
  ]);

  const [updateReport, { isLoading: isSubmitting }] =
    useUpdateReportMutation();

  const handleInputChange = (formIndex: number, id: string, value: string) => {
    setFormGroups((prev) =>
      prev.map((form, idx) =>
        idx === formIndex ? { ...form, [id]: value } : form
      )
    );
  };

  const handleAddForm = () => {
    setFormGroups((prev) => [...prev, {}]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!selectedDeadlineId) {
      errors.push(t("please_select_deadline"));
    }
    if (
      allEmptyColumnsByStep[currentStep]?.some((col) =>
        col.title.toLowerCase().includes("tashkilot")
      ) &&
      !selectedOrganizationId
    ) {
      errors.push(t("please_select_organization_simple"));
    }
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

      let inners;
      if (isOrganizationColumn) {
        inners = [{ id: col.id, value: selectedOrganizationId || "" }];
      } else if (isRejaColumn) {
        const planItem = planItems.find((item) => item.columnId === col.id);
        const planValue = planItem ? planItem.plan_value : "";
        inners = formGroups.map(() => ({
          id: col.id,
          value: planValue,
        }));
      } else {
        inners = formGroups.map((form) => ({
          id: col.id,
          value: form[col.id] || "",
        }));
      }

      return {
        statement_column: col.id,
        inners,
      };
    });

    const payload = {
      id: id,
      deadline: selectedDeadlineId,
      report_items,
      ...(selectedSeason && { season: selectedSeason }),
      foot_note: footNote || "",
    };

    try {
      await updateReport(payload).unwrap();
      removeCookie("reportId");
      navigate(-1);
      toast.success(t("updated_successfully"));
      setFormErrors([]);
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        t("update_error");
      setFormErrors((prev) => [...prev, errorMessage]);
      console.error("Yangilashda xatolik:", err);
      toast.error(errorMessage);
    }
  };

  if (isHeaderLoading || isOrgLoading || isReportLoading)
    return <p className="p-4 text-lg">{t("loading")}</p>;
  if (headersError || orgError || reportError)
    return (
      <div className="text-red-500 p-4">
        <p>{t("loading_error")}</p>
      </div>
    );

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `Qadam ${currentStep + 1}`;

  return (
    <>
      <div>
        <Button
          className="min-w-[50px] min-h-[25px] bg-ice text-black text-sm border-1 border-black"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} />
          <span className="text-sm">{t("back")}</span>
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`max-w-full m-6 p-6 border rounded-lg shadow space-y-6 bg-ice ${
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

        <div className="flex items-end justify-between gap-4 sm:flex-row">
          <div>
            <label className="block mb-1 text-sm font-medium">
              {t("deadline")}:
            </label>
            <Select
              value={selectedDeadlineId}
              onValueChange={(val) => setSelectedDeadlineId(val)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue
                    placeholder={
                      deadlineLoading
                        ? t("loading")
                        : deadlineError
                        ? t("loading_error")
                        : t("selectDeadline")
                    }
                />
              </SelectTrigger>
              <SelectContent>
                {deadlineLoading && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      {t("loading")}
                    </div>
                )}
                {deadlineError && (
                  <div className="p-2 text-center text-red-500 text-sm">
                    {t("data_load_error")}
                  </div>
                )}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.results?.length > 0 &&
                  deadlineData.results.map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {formatDeadlineText(item.submit_at)}
                    </SelectItem>
                  ))}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.results?.length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Deadline mavjud emas
                    </div>
                  )}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.count > perPage && (
                    <div className="flex items-center justify-between px-2 py-1 border-t">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deadlinePage === 1}
                        onClick={() =>
                          setDeadlinePage((p) => Math.max(p - 1, 1))
                        }
                      >
                        {t("before")}
                      </Button>
                      <span className="text-xs text-gray-500">
                        {deadlinePage} /{" "}
                        {Math.ceil(deadlineData.count / perPage)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          deadlinePage >=
                          Math.ceil(deadlineData.count / perPage)
                        }
                        onClick={() =>
                          setDeadlinePage((p) =>
                            Math.min(
                              p + 1,
                              Math.ceil(deadlineData.count / perPage)
                            )
                          )
                        }
                      >
                        {t("next")}
                      </Button>
                    </div>
                  )}
              </SelectContent>
            </Select>
          </div>
          {(reportIds === "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
            reportIds === "671577ba-6a86-4619-b31c-86fff20ad305") && (
            <div>
              <label className="block mb-1 text-sm font-medium">Season:</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="border rounded px-2 py-1 w-[300px]"
              >
                <option value="">Tanlang</option>
                <option value="spring">Bahor</option>
                <option value="autumn">Kuz</option>
              </select>
            </div>
          )}
          <div>
            <Button type="button" onClick={handleAddForm}>
              {t("add")}
            </Button>
          </div>
        </div>

        {formGroups.map((formValues, formIndex) => (
          <div
            key={formIndex}
            className="overflow-x-auto mb-6 border rounded-lg p-4 bg-gray-50"
          >
            <div className="mb-4 flex justify-between">
              <h2 className="text-lg font-semibold">
                {currentStepTitle} – {formIndex + 1}-{t("table")}
              </h2>
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead className="min-w-[300px]">{t("value")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEmptyColumns.map((col) => {
                  const lowerTitle = col.title.toLowerCase();

                  if (lowerTitle.includes("tashkilot")) {
                    if (formIndex !== 0) return null;
                    return (
                      <TableRow key={col.id}>
                        <TableCell className="whitespace-normal break-words">
                          {col.fullParentChain}
                        </TableCell>
                        <TableCell>
                          <select
                            value={selectedOrganizationId}
                            onChange={(e) => {
                              setSelectedOrganizationId(e.target.value);
                              handleInputChange(
                                formIndex,
                                col.id,
                                e.target.value
                              );
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

                  if (lowerTitle.includes("reja")) {
                    const planItem = planItems.find(
                      (item) => item.columnId === col.id
                    );
                    const planValue = planItem ? planItem.plan_value : "";
                    return (
                      <TableRow key={col.id}>
                        <TableCell className="whitespace-normal break-words">
                          {col.fullParentChain}
                        </TableCell>
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

                  return (
                    <TableRow key={col.id}>
                      <TableCell className="whitespace-normal break-words">
                        {col.fullParentChain}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={formValues[col.id] || ""}
                          onChange={(e) =>
                            handleInputChange(formIndex, col.id, e.target.value)
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
        ))}

        <div className="flex justify-between items-center pt-4">
          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
              disabled={currentStep === 0 || isSubmitting}
            >
              {t("before")}
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
                {t("next")}
              </Button>
            )}
          </div>
          {currentStep === totalSteps - 1 && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? `⏳ ${t("updating")}` : t("update")}
            </Button>
          )}
        </div>

        {/* ✅ FOOT NOTE TEXTAREA - Faqat oxirgi qadamda */}
        {currentStep === totalSteps - 1 && (
          <div className="mt-6">
            <label className="block mb-2 text-lg font-medium">
              {t("note_optional")}
            </label>
            <Textarea
              value={footNote}
              onChange={(e) => setFootNote(e.target.value)}
              placeholder={t("enter_note")}
              className="min-h-[100px] bg-ice border-white/30 focus:border-[#3B82F6]"
              rows={4}
            />
          </div>
        )}
      </form>
    </>
  );
}

export default InnersUpdateReportItem;

