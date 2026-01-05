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
  useCreateReportMutation,
  useGetStatementColumnsReportQuery,
  reportApi,
  useGetDeadlinesReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
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

function AllCreateReportItem() {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
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
    { statementId: reportIds as string, lang, isUser: "true" },
    { skip: !reportIds }
  );

  // 🔹 Deadline state
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
    // Faqat o'zgarganda yangilash - JSON.stringify bilan solishtirish
    const currentString = JSON.stringify(allEmptyColumnsByStep);
    const newString = JSON.stringify(allEmptyColumnsByStepMemo);
    
    if (currentString !== newString) {
      setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
      setCurrentStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEmptyColumnsByStepMemo]);

  // Boshlang'ich qiymatlar
  useEffect(() => {
    if (!allEmptyColumnsByStep[currentStep]?.length) return;

    const initialValues: Record<string, string> = {};
    allEmptyColumnsByStep[currentStep].forEach((col) => {
      if (
        !col.title.toLowerCase().includes("tashkilot nomi") &&
        !col.title.toLowerCase().includes("Названия регионов") &&
        !col.title.toLowerCase().includes("reja")
      ) {
        if (!formValues[col.id]) {
          initialValues[col.id] = "";
        }
      }
    });
    
    // Faqat yangi qiymatlar bo'lsa yangilash
    if (Object.keys(initialValues).length > 0) {
      setFormValues((prev) => {
        const hasNewValues = Object.keys(initialValues).some(
          (key) => !prev[key]
        );
        return hasNewValues ? { ...prev, ...initialValues } : prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, allEmptyColumnsByStep]);

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
        // Season tanlanmagan bo'lsa, plan ma'lumotlarini tozalash
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
            "Plan ma'lumotlarini olishda xatolik yuz berdi",
          ]);
        }
      }
    };

    fetchPlanDataForColumns();
    return () => {
      isMounted = false;
    };
  }, [allEmptyColumnsByStep, selectedOrganizationId, reportIds, selectedSeason, dispatch]);

  const [
    createReportItem,
    { isLoading: isSubmitting, error: createReportError },
  ] = useCreateReportMutation();

  // 🔹 ERROR LARNI BOSHQARISH
  useEffect(() => {
    const errors: string[] = [];

    // Backend xatoliklarini qo'shish
    if (createReportError) {
      const errorData = (createReportError as any)?.data;

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
        // Field xatoliklarini formatlash
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
        errors.push(t("submit_error_unknown"));
      }
    }

    // Boshqa API xatoliklari
    if (headersError) {
      errors.push(t("columns_load_error"));
    }

    if (orgError) {
      errors.push(t("organizations_load_error"));
    }

    if (deadlineError) {
      errors.push(t("deadline_load_error"));
    }

    if (errors.length > 0) {
      setFormErrors(errors);
    }
  }, [createReportError, headersError, orgError, deadlineError]);

  const handleInputChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
    // Agar xatoliklar bo'lsa va foydalanuvchi qiymat o'zgartirsa, xatoliklarni tozalash
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];

    if (!selectedDeadlineId) {
      errors.push("Iltimos, deadline tanlang");
    }
    if (
      allEmptyColumnsByStep[currentStep]?.some(
        (col) =>
          col.title.toLowerCase().includes("tashkilot nomi") ||
          col.title.toLowerCase().includes("Названия регионов")
      ) &&
      !selectedOrganizationId
    ) {
      errors.push("Iltimos, tashkilot tanlang");
    }

    allEmptyColumnsByStep[currentStep]?.forEach((col) => {
      if (
        !col.title.toLowerCase().includes("reja") &&
        !col.title.toLowerCase().includes("tashkilot nomi") &&
        !col.title.toLowerCase().includes("Названия регионов") &&
        (!formValues[col.id] || formValues[col.id].toString().trim() === "")
      ) {
        errors.push(`"${col.fullParentChain}" uchun qiymat kiritish shart`);
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      errors.forEach((err) => toast.error(err)); // 🔹 toast error ko‘rsatish
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();

    const report_items = allColumns.map((col) => {
      const isOrganizationColumn =
        col.title.toLowerCase().includes("tashkilot nomi") ||
        col.title.toLowerCase().includes("Названия регионов");
      const isRejaColumn = col.title.toLowerCase().includes("reja");

      let rawValue: string = "";

      if (isOrganizationColumn) {
        rawValue = selectedOrganizationId || "";
      } else if (isRejaColumn) {
        const planItem = planItems.find((item) => item.columnId === col.id);
        rawValue = planItem ? planItem.plan_value : "";
      } else {
        rawValue = formValues[col.id] || "";
      }

      return {
        statement_column: col.id,
        inners: [{ value: rawValue }],
      };
    });

    const payload = { 
      deadline: selectedDeadlineId, 
      report_items,
      season: selectedSeason || null,
      foot_note: footNote || ""
    };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
      setFormErrors([]);
      toast.success(t("report_created_successfully")); // 🔹 success toast
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err);
      toast.error(err.message); // 🔹 umumiy error toast
    }
  };

  if (isHeaderLoading || isOrgLoading || deadlineLoading)
    return <p className="p-4 text-lg">{t("loading")}</p>;

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `Qadam ${currentStep + 1}`;

  // 🔹 Deadline matnini formatlash funksiyasi
  const formatDeadlineText = (submitAt: string) => {
    if (!submitAt) return t("unknown");

    if (submitAt.includes("CHORAK")) {
      // "2025-CHORAK_1" -> "2025 yil 1-chorak"
      return submitAt.replace("CHORAK_", " yil ").replace("_", "-chorak");
    }

    return submitAt;
  };

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
        {/* ✅ BARCHA XATOLIKLARNI KO'RSATISH */}
        {formErrors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold text-lg mb-2">Xatoliklar:</h3>
            <ul className="list-disc list-inside space-y-1">
              {formErrors.map((error, idx) => (
                <li key={idx} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ✅ TO'G'RILANGAN DEADLINE SELECT */}
        {/* DEADLINE SELECT */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div>
            <label className="block mb-1 text-lg font-medium">
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
                {/* LOADING */}
                {deadlineLoading && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      {t("loading")}
                    </div>
                )}

                {/* ERROR */}
                {deadlineError && (
                  <div className="p-2 text-center text-red-500 text-sm">
                    Ma'lumotlarni yuklashda xatolik
                  </div>
                )}

                {/* DATA */}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.results?.length > 0 &&
                  deadlineData.results.map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {formatDeadlineText(item.submit_at)}
                    </SelectItem>
                  ))}

                {/* AGAR BO‘SH BO‘LSA */}
                {!deadlineLoading &&
                  !deadlineError &&
                  deadlineData?.results?.length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Deadline mavjud emas
                    </div>
                  )}

                {/* PAGINATION */}
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
         {(reportIds == "1186b75c-d84c-44e6-999e-d6be3c5118ff" || reportIds == "671577ba-6a86-4619-b31c-86fff20ad305") && (
          <div>
            <label className="block mb-1 text-lg font-medium">
              Season:
            </label>
            <Select
              value={selectedSeason}
              onValueChange={(val) => setSelectedSeason(val)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spring">Bahor</SelectItem>
                <SelectItem value="autumn">Kuz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        </div>

        {/* ✅ QOLGAN KOD — TABLE STEP */}
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
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead className="min-w-[300px]">{t("value")}</TableHead>
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

                  if (
                    lowerTitle.includes("tashkilot nomi") ||
                    lowerTitle.includes("Названия регионов")
                  ) {
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
                      <TableCell className="whitespace-normal break-words">
                        {col.fullParentChain}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={formValues[col.id] || ""}
                          onChange={(e) =>
                            handleInputChange(col.id, e.target.value)
                          }
                          required
                          className={
                            formErrors.some((err) =>
                              err.includes(col.fullParentChain)
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
        ) : (
          <p>Ushbu qadamda to'ldirish uchun ustunlar yo'q.</p>
        )}

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

        {/* ✅ STEP BOSHQARISH */}
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
              {isSubmitting ? `⏳ ${t("sending")}` : t("submit")}
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

export default AllCreateReportItem;
