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

interface ColumnItem {
  id: string;
  title: string;
  fullParentChain: string;
  is_organization?: boolean;
  status_plan?: any;
}

function findEmptyChildrenColumnIds(children: any[]): ColumnItem[] {
  const result: ColumnItem[] = [];
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
          is_organization: col.is_organization ?? false,
          status_plan: col.status_plan ?? null,
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
    ColumnItem[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [planItems, setPlanItems] = useState<
    { columnId: string; plan_value: string; fullParentChain: string }[]
  >([]);
  const [planYear, setPlanYear] = useState<string>("");

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
  } = useGetReportByIdQuery(id ? { id: id, is_user_input: "true" } : skipToken);

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
    reportIds ? { statementId: reportIds, lang, isUser: "true" } : skipToken,
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
      is_new_deadline: "",
    },
    { skip: !reportIds },
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
    [tableHeadersData],
  );

  const allEmptyColumnsByStepMemo = useMemo(() => {
    return tableHeadersDataMemo.map((obj: any) =>
      Array.isArray(obj.children)
        ? findEmptyChildrenColumnIds(obj.children)
        : [],
    );
  }, [tableHeadersDataMemo]);

  useEffect(() => {
    setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
    setCurrentStep(0);
    // Tanlangan tashkilotni tozalash
    setSelectedOrganizationId("");
  }, [allEmptyColumnsByStepMemo]);

  // mavjud reportdan boshlang'ich qiymatlarni olish
  useEffect(() => {
    if (existingReport?.report_items) {
      const maxInnersCount = Math.max(
        ...existingReport.report_items.map(
          (item: any) => item.inners?.length || 0,
        ),
        1,
      );

      console.log("DEBUG InnersUpdate: maxInnersCount =", maxInnersCount);
      console.log(
        "DEBUG InnersUpdate: report_items =",
        existingReport.report_items,
      );

      // Har bir inner uchun alohida formula yaratish
      const initialFormGroups: Record<string, string>[] = [];

      for (let innerIndex = 0; innerIndex < maxInnersCount; innerIndex++) {
        const form: Record<string, string> = {};

        existingReport.report_items.forEach((item: any) => {
          // Tashkilot column'ini skip qilish (is_organization propertisi orqali)
          // Biz tashkilot ID sini alohida state'da saqlaymiz
          const isOrganizationColumn = false; // Endi title orqali emas, property orqali tekshiramiz

          if (!isOrganizationColumn) {
            if (item.inners?.[innerIndex]) {
              form[item.statement_column] = item.inners[innerIndex].value || "";
            }
          }
        });

        initialFormGroups.push(form);
      }

      console.log(
        "DEBUG InnersUpdate: Created",
        initialFormGroups.length,
        "formulas",
      );
      setFormGroups(initialFormGroups.length > 0 ? initialFormGroups : [{}]);
      setSelectedDeadlineId(existingReport.deadline || "");
      setFootNote(existingReport.foot_note || "");

      // Deadline'dan year ni olish
      if (existingReport.deadline) {
        const selectedDeadline = deadlineData?.results?.find(
          (item: any) =>
            item.id.toString() === existingReport.deadline.toString(),
        );
        if (selectedDeadline) {
          setPlanYear(formatDeadlineText(selectedDeadline.submit_at));
        }
      }

      // Season ni topish (agar mavjud bo'lsa)
      if (existingReport.season) {
        setSelectedSeason(existingReport.season);
      }
    }
  }, [existingReport, deadlineData]);

  // Reja ma'lumotlarini olish
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = allEmptyColumnsByStep
        .flat()
        .filter((col) => col.status_plan != null);

      if (rejaColumns.length === 0 || !reportIds || !selectedOrganizationId) {
        setPlanItems([]);
        return;
      }

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
                year: planYear,
                column: col.id,
                ...(selectedSeason && { season: selectedSeason }),
              }),
            ).unwrap(),
          ),
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
          console.error("Reja olishda xatolik:", error);
          toast.error(t("plan_fetch_error"));
          setFormErrors((prev) => [...prev, t("plan_fetch_error")]);
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
    planYear,
    dispatch,
    t,
  ]);

  const [updateReport, { isLoading: isSubmitting, error: updateError }] =
    useUpdateReportMutation();

  // Error larni boshqarish
  useEffect(() => {
    const errors: string[] = [];

    if (updateError) {
      const errorData = (updateError as any)?.data;

      if (typeof errorData === "string") {
        errors.push(errorData);
      } else if (errorData?.message) {
        errors.push(errorData.message);
      } else if (
        errorData?.non_field_errors &&
        Array.isArray(errorData.non_field_errors)
      ) {
        errors.push(...errorData.non_field_errors);
      } else if (errorData && typeof errorData === "object") {
        Object.keys(errorData).forEach((field) => {
          if (Array.isArray(errorData[field])) {
            errorData[field].forEach((errMsg: string) => {
              errors.push(`${field}: ${errMsg}`);
            });
          } else if (typeof errorData[field] === "string") {
            errors.push(`${field}: ${errorData[field]}`);
          }
        });
      } else {
        errors.push(t("update_error_unknown"));
      }
    }

    if (headersError) {
      errors.push(t("columns_load_error"));
    }

    if (orgError) {
      errors.push(t("organizations_load_error"));
    }

    if (deadlineError) {
      errors.push(t("deadline_load_error"));
    }

    if (reportError) {
      errors.push(t("report_load_error"));
    }

    if (errors.length > 0) {
      setFormErrors(errors);
    }
  }, [updateError, headersError, orgError, deadlineError, reportError, t]);

  const handleInputChange = (formIndex: number, id: string, value: string) => {
    setFormGroups((prev) =>
      prev.map((form, idx) =>
        idx === formIndex ? { ...form, [id]: value } : form,
      ),
    );
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const handleAddForm = () => {
    setFormGroups((prev) => [...prev, {}]);
  };

  const handleRemoveForm = (formIndex: number) => {
    if (formGroups.length > 1) {
      setFormGroups((prev) => prev.filter((_, idx) => idx !== formIndex));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];

    if (!selectedDeadlineId) {
      errors.push(t("select_deadline_required"));
    }

    // Tashkilot ustuni mavjudligini tekshirish
    const hasOrganizationColumn = allEmptyColumnsByStep
      .flat()
      .some((col) => col.is_organization === true);

    if (hasOrganizationColumn && !selectedOrganizationId) {
      errors.push(t("select_organization_required"));
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      errors.forEach((err) => toast.error(err));
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();

    const report_items = allColumns.map((col) => {
      let inners;

      if (col.is_organization === true) {
        // Tashkilot ustuni - faqat birinchi formuladan
        inners = [{ value: selectedOrganizationId || "" }];
      } else if (col.status_plan != null) {
        // Reja ustuni - barcha formulalar uchun bir xil qiymat
        const planItem = planItems.find((item) => item.columnId === col.id);
        const planValue = planItem?.plan_value || "";
        inners = formGroups.map(() => ({
          value: planValue,
        }));
      } else {
        // Oddiy input ustun - har bir formula uchun alohida qiymat
        inners = formGroups.map((form) => ({
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
      toast.success(t("updated_successfully"));
      navigate(-1);
      setFormErrors([]);
    } catch (err: any) {
      console.error("Yangilashda xatolik:", err);
      toast.error(err?.data?.message || err?.message || t("update_error"));
    }
  };

  if (isHeaderLoading || isOrgLoading || isReportLoading || deadlineLoading) {
    return <p className="p-4 text-lg">{t("loading")}</p>;
  }

  if (headersError || orgError || reportError) {
    return (
      <div className="text-red-500 p-4">
        <p>{t("loading_error")}</p>
      </div>
    );
  }

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `${t("step")} ${currentStep + 1}`;

  return (
    <>
      <div className="p-6">
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
        {/* Xatoliklar */}
        {formErrors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold text-lg mb-2">{t("errors")}:</h3>
            <ul className="list-disc list-inside space-y-1">
              {formErrors.map((error, idx) => (
                <li key={idx} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          {/* Deadline Select */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              {t("deadline")}:
            </label>
            <Select
              value={selectedDeadlineId}
              onValueChange={(val) => {
                setSelectedDeadlineId(val);
                const selectedItem = deadlineData?.results?.find(
                  (item: any) => item.id.toString() === val,
                );
                setPlanYear(
                  selectedItem
                    ? formatDeadlineText(selectedItem.year)
                    : "",
                );
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={t("selectDeadline")} />
              </SelectTrigger>
              <SelectContent>
                {deadlineLoading && (
                  <div className="p-2 text-center text-muted-foreground text-sm">
                    {t("loading")}
                  </div>
                )}
                {deadlineError && (
                  <div className="p-2 text-center text-red-500 text-sm">
                    {t("loading_error")}
                  </div>
                )}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.results?.length > 0 && (
                    <>
                      {deadlineData.results.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {formatDeadlineText(item.submit_at)}
                        </SelectItem>
                      ))}
                      {deadlineData?.count > perPage && (
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
                                  Math.ceil(deadlineData.count / perPage),
                                ),
                              )
                            }
                          >
                            {t("next")}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.results?.length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      {t("no_deadlines")}
                    </div>
                  )}
              </SelectContent>
            </Select>
          </div>

          {/* Season Select */}
          {(reportIds === "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
            reportIds === "671577ba-6a86-4619-b31c-86fff20ad305") && (
            <div>
              <label className="block mb-1 text-sm font-medium">
                {t("season")}:
              </label>
              <Select
                value={selectedSeason}
                onValueChange={(val) => setSelectedSeason(val)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={t("select_season")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spring">{t("spring")}</SelectItem>
                  <SelectItem value="autumn">{t("autumn")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add Form Button */}
          <div>
            <Button
              type="button"
              onClick={handleAddForm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t("add_new_form")}
            </Button>
          </div>
        </div>

        {/* Form Groups */}
        {formGroups.map((formValues, formIndex) => (
          <div
            key={formIndex}
            className="overflow-x-auto mb-6 border rounded-lg p-4 bg-gray-50"
          >
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {currentStepTitle} – {formIndex + 1}-{t("table")}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {currentStep + 1} / {totalSteps}
                </span>
                {formGroups.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveForm(formIndex)}
                  >
                    {t("delete")}
                  </Button>
                )}
              </div>
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
                  // Tashkilot ustuni (is_organization = true)
                  if (col.is_organization === true) {
                    // Faqat birinchi formulada ko'rsatish
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
                                e.target.value,
                              );
                            }}
                            className="w-full border rounded px-2 py-1"
                            required
                          >
                            <option value="">{t("select")}</option>
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

                  // Plan ustuni (status_plan != null)
                  if (col.status_plan != null) {
                    const planItem = planItems.find(
                      (item) => item.columnId === col.id,
                    );
                    const planValue = planItem?.plan_value || "";

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

                  // Oddiy input ustun
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
                          className={
                            formErrors.some((err) =>
                              err.includes(col.fullParentChain),
                            )
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}

        {/* Step boshqarish */}
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

        {/* Foot note - faqat oxirgi qadamda */}
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
