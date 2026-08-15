import { useState, useEffect, useMemo, useRef } from "react";
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
import {
  generalApi,
  useGetOrganizationReportsQuery,
} from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import ImportExcelButton from "@/components/ImportExcelButton/ImportExcelButton";
import ImportTemplateButton from "@/components/ImportExcelButton/ImportTemplateButton";
import { ParsedExcelReport } from "@/utils/parseExcelReport";
import {
  ImportParseResponse,
  splitImportItemsIntoRows,
} from "@/types/importReport";
import {
  countExcelDataRows,
  findByName,
  getExcelSheets,
  matchSheetsToColumns,
} from "@/utils/matchExcelColumns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function findEmptyChildrenColumnIds(
  children: any[],
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

function InnersCreateReportItem() {
  const [formGroups, setFormGroups] = useState<Record<string, string>[]>([{}]);
  /** Qaysi location.state allaqachon import qilingani — takroriy import bo'lmasin */
  const appliedImportStateRef = useRef<unknown>(null);
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
  const [yearPlan, setYearPlan] = useState<string>("");
  const [planItems, setPlanItems] = useState<
    { columnId: string; plan_value: string; fullParentChain: string }[]
  >([]);
  const { t } = useTranslation();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  // Tashkilotlar hook orqali hali kelmagan bo'lishi mumkin — import paytida aniq so'raymiz
  const fetchOrganizations = async (): Promise<
    { id: string; name: string }[]
  > => {
    const loaded = (organizationsData as { id: string; name: string }[]) || [];
    if (loaded.length > 0) return loaded;

    try {
      const res: any = await dispatch(
        generalApi.endpoints.getOrganizationReports.initiate({ lang }),
      ).unwrap();

      return Array.isArray(res) ? res : res?.results || [];
    } catch (error) {
      console.error("Excel import: tashkilotlarni olishda xatolik", error);
      return [];
    }
  };

  const handleExcelImport = async (data: ParsedExcelReport) => {
    if (!data || !allEmptyColumnsByStep) return;

    // Ilovalar alohida varaqlarda bo'lishi mumkin — hammasini o'qiymiz
    const sheets = getExcelSheets(data);

    if (sheets.length === 0) {
      toast.error(t("excelImportNoTable"));
      return;
    }

    const allCols = allEmptyColumnsByStep.flat();
    const sheetMatches = matchSheetsToColumns(sheets, allCols).filter(
      (match) => match.matchedCount > 0,
    );

    if (sheetMatches.length === 0) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    // Tashkilot select'i — Exceldagi tashkilot nomi bo'yicha (qaysi varaqda bo'lsa)
    let excelOrgName = "";
    sheetMatches.some(({ special, rows }) => {
      if (special.organizationIndex < 0) return false;
      excelOrgName = (rows[0]?.cells[special.organizationIndex] ?? "").trim();
      return excelOrgName !== "";
    });

    const matchedOrg = excelOrgName
      ? findByName(await fetchOrganizations(), excelOrgName, (org) => org.name)
      : undefined;

    // Har bir qator — alohida formula; qiymatlar hamma varaqlardan yig'iladi
    const rowCount = Math.max(...sheetMatches.map((match) => match.rows.length));

    const newGroups = Array.from({ length: rowCount }, (_, rowIndex) => {
      const values: Record<string, string> = {};

      sheetMatches.forEach(({ columnToExcel, rows }) => {
        const row = rows[rowIndex];
        if (!row) return;

        allCols.forEach((col) => {
          if (col.title.toLowerCase().includes("tashkilot")) return;
          if (values[col.id]) return; // ustunroq varaqdan olingan qiymat saqlanadi

          const excelIndex = columnToExcel[col.id];
          if (excelIndex === undefined) return;

          const cellValue = (row.cells[excelIndex] ?? "").trim();
          if (cellValue !== "") values[col.id] = cellValue;
        });
      });

      if (matchedOrg) {
        allCols.forEach((col) => {
          if (col.title.toLowerCase().includes("tashkilot")) {
            values[col.id] = matchedOrg.id;
          }
        });
      }

      return values;
    });

    if (matchedOrg) setSelectedOrganizationId(matchedOrg.id);

    if (newGroups.every((group) => Object.keys(group).length === 0)) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    setFormGroups(newGroups);
  };

  /**
   * Backend `/reports/import-parse/` javobi — ustunlar UUID bo'yicha keladi.
   * Har bir o'simlik/obyekt alohida formula bo'ladi.
   */
  const applyImportPayload = async (payload: ImportParseResponse) => {
    const allCols = allEmptyColumnsByStep.flat();
    if (allCols.length === 0) return;

    const columnIds = new Set(allCols.map((col) => String(col.id)));
    const orgColumn = allCols.find((col) =>
      col.title.toLowerCase().includes("tashkilot"),
    );

    let organizationValue = "";

    const unmatched: string[] = [];

    const toValues = (items: ImportParseResponse["items"] = []) => {
      const values: Record<string, string> = {};
      items.forEach((item) => {
        const columnId = String(item.column ?? "");
        if (!columnIds.has(columnId)) {
          unmatched.push(columnId);
          return;
        }

        const value = String(item.value ?? "").trim();
        if (value === "") return;

        if (orgColumn && columnId === String(orgColumn.id)) {
          organizationValue = value;
          return;
        }

        values[columnId] = value;
      });
      return values;
    };

    const plants = payload.plants || [];
    // `plants` kelmagan bo'lsa ham fayl bir nechta qatordan iborat bo'lishi mumkin —
    // takrorlangan ustun UUID lari bo'yicha alohida formulalarga ajratamiz
    const groups =
      plants.length > 0
        ? plants.map((plant) => toValues(plant.items))
        : splitImportItemsIntoRows(payload.items).map((rowItems) =>
            toValues(rowItems),
          );

    const filledGroups = groups.filter(
      (group) => Object.keys(group).length > 0,
    );

    if (unmatched.length > 0) {
      console.warn(
        "import-parse: bu ustun UUID lari formada topilmadi",
        unmatched,
        "formadagi ustunlar:",
        allCols.map((col) => col.id),
      );
    }

    if (organizationValue) {
      const organizations = await fetchOrganizations();
      const matchedOrg =
        organizations.find((org) => String(org.id) === organizationValue) ||
        findByName(organizations, organizationValue, (org) => org.name);

      if (matchedOrg) {
        setSelectedOrganizationId(matchedOrg.id);
        if (orgColumn) {
          filledGroups.forEach((group) => {
            group[orgColumn.id] = matchedOrg.id;
          });
        }
      } else {
        // Tashkilot doim qo'lda tanlanadi — foydalanuvchini bezovta qilmaymiz
        console.info("import-parse: tashkilot topilmadi", organizationValue);
      }
    }

    if (filledGroups.length === 0) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    setFormGroups(filledGroups);
  };

  useEffect(() => {
    if (allEmptyColumnsByStep.length === 0) return;

    // Import bir marta qo'llaniladi — keyingi qayta chizishlarda foydalanuvchi
    // kiritgan qiymatlar ustidan yozilmasin
    if (appliedImportStateRef.current === location.state) return;

    const payload = (location.state as any)?.importedPayload as
      | ImportParseResponse
      | undefined;
    const imported = (location.state as any)?.importedExcelData as
      | ParsedExcelReport
      | undefined;

    if (!payload && !imported) return;

    appliedImportStateRef.current = location.state;

    // Backend fayldagi hamma qatorni qaytarmagan bo'lsa — faylning o'zidan o'qiymiz
    const payloadRowCount = payload
      ? payload.plants?.length ||
        splitImportItemsIntoRows(payload.items).length ||
        0
      : 0;
    const excelRowCount = countExcelDataRows(imported);
    // Har bir ilova alohida varaqda bo'lsa, backend odatda faqat birinchisini o'qiydi
    const sheetCount = getExcelSheets(imported).length;

    if (imported && (sheetCount > 1 || excelRowCount > payloadRowCount)) {
      console.info(
        `import: backend ${payloadRowCount} ta formula qaytardi, faylda ${sheetCount} ta varaq / ${excelRowCount} ta qator bor — fayl bo'yicha to'ldiramiz`,
      );
      handleExcelImport(imported);
      return;
    }

    if (payload) {
      applyImportPayload(payload);
      return;
    }

    if (imported) {
      handleExcelImport(imported);
    }
  }, [location.state, allEmptyColumnsByStep]);

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
      is_new_deadline: "true",
    },
    { skip: !reportIds },
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
    { statementId: reportIds as string, lang, isUser: "true" },
    { skip: !reportIds },
  );

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
  }, [allEmptyColumnsByStepMemo]);

  // 🔹 REJA MA'LUMOTLARI
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = allEmptyColumnsByStep
        .flat()
        .filter((col) => col.title.toLowerCase().includes("reja"));

      if (rejaColumns.length === 0 || !reportIds || !selectedOrganizationId)
        return;

      // Agar season select mavjud bo'lsa (bu reportIds uchun), season tanlangandan keyin reja olinadi
      const hasSeasonSelect =
        reportIds === "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
        reportIds === "671577ba-6a86-4619-b31c-86fff20ad305";

      if (hasSeasonSelect && !selectedSeason) {
        // Season tanlanmagan bo'lsa, reja ma'lumotlarini tozalash
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
                year: yearPlan,
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
    dispatch,
  ]);

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();

  const handleInputChange = (formIndex: number, id: string, value: string) => {
    setFormGroups((prev) =>
      prev.map((form, idx) =>
        idx === formIndex ? { ...form, [id]: value } : form,
      ),
    );
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
      errors.push(t("please_select_deadline"));
    }
    if (
      allEmptyColumnsByStep[currentStep]?.some((col) =>
        col.title.toLowerCase().includes("tashkilot"),
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
        // ❗ faqat bitta inners (birinchi formuladan)
        inners = [{ id: col.id, value: selectedOrganizationId || "" }];
      } else if (isRejaColumn) {
        // Reja qiymatini olish
        const planItem = planItems.find((item) => item.columnId === col.id);
        const planValue = planItem ? planItem.plan_value : "";
        // Reja qiymatini barcha formulalar uchun bir xil qilish
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
      deadline: selectedDeadlineId,
      report_items,
      ...(selectedSeason && { season: selectedSeason }),
      foot_note: footNote || "",
    };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      navigate(-1);
      setFormGroups([{}]);
      setCurrentStep(0);
      setFormErrors([]);
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || t("submit_error");
      setFormErrors((prev) => [...prev, errorMessage]);
      console.error("Yuborishda xatolik:", err);
    }
  };

  // 🔹 Deadline matnini formatlash funksiyasi
  const formatDeadlineText = (submitAt: string) => {
    if (!submitAt) return t("unknown") || "Noma'lum";

    if (submitAt.includes("CHORAK")) {
      // "2025-CHORAK_1" -> "2025 yil 1-chorak"
      return submitAt.replace("CHORAK_", " yil ").replace("_", "-chorak");
    }

    return submitAt;
  };

  if (isHeaderLoading || isOrgLoading || deadlineLoading)
    return <p className="p-4 text-lg">{t("loading")}</p>;
  if (headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>{t("loading_error")}</p>
      </div>
    );

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `Qadam ${currentStep + 1}`;

  // Reja qiymatlari muddat va tashkilotga bog'liq — import shulardan keyin bo'lishi kerak
  const formHasOrganizationColumn = allEmptyColumnsByStep
    .flat()
    .some((col) => col.title?.toLowerCase().includes("tashkilot"));

  // Import tartibi: avval muddat, keyin tashkilot — undan so'nggina Excel fayl
  const orgStillNeeded = formHasOrganizationColumn && !selectedOrganizationId;
  const importDisabledReason =
    !selectedDeadlineId && orgStillNeeded
      ? t("excelImportOrderHint")
      : !selectedDeadlineId
        ? t("excelImportSelectDeadlineFirst")
        : orgStillNeeded
          ? t("excelImportSelectOrgFirst")
          : "";

  return (
    <>
      <div className="px-6 pt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={18} />
          <span className="text-sm">{t("back")}</span>
        </Button>
        {/* Shablon + Excel import — faqat tashkilot hodimi uchun */}
        {user_role === "tashkilot_hodimi" && (
          <div className="flex items-start gap-3 flex-wrap justify-end">
            <ImportTemplateButton statementId={reportIds ?? undefined} />
            <ImportExcelButton
              statementId={reportIds ?? undefined}
              onParsed={applyImportPayload}
              onImportSuccess={handleExcelImport}
              disabledReason={importDisabledReason}
            />
          </div>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
      className={`max-w-full m-6 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-6 bg-white dark:bg-slate-900 transition-colors ${
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
            {t("deadline") || "Deadline"}:
          </label>
          <Select
            value={selectedDeadlineId}
            onValueChange={(val) => {
              setSelectedDeadlineId(val);
              const selectedItem = deadlineData?.results?.find(
                (item: any) => item.id.toString() === val,
              );
              setYearPlan(
                selectedItem ? formatDeadlineText(selectedItem.submit_at) : "",
              );
            }}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue
                placeholder={
                  deadlineLoading
                    ? t("loading")
                    : deadlineError
                      ? t("loading_error")
                      : t("selectDeadline") || "Tanlang"
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

              {/* AGAR BO'SH BO'LSA */}
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
                      onClick={() => setDeadlinePage((p) => Math.max(p - 1, 1))}
                    >
                      {t("before")}
                    </Button>

                    <span className="text-xs text-gray-500">
                      {deadlinePage} / {Math.ceil(deadlineData.count / perPage)}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        deadlinePage >= Math.ceil(deadlineData.count / perPage)
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
            </SelectContent>
          </Select>
        </div>
        {/* <div className="flex flex-col gap-2">
          <label htmlFor="year">{t("year")}</label>
          <div className="flex flex-col gap-1">
            <input
              value={yearPlan}
              onChange={(e) => setYearPlan(e.target.value)}
              type="number"
              className="no-spinner border border-gray-950 shadow py-1 rounded-md p-3"
            />
            <span className="text-sm">
              Faqatkina "reja" mavjud bo'lgan hisobodlar uchun
            </span>
          </div>
        </div> */}
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
      </div>

      {formGroups.map((formValues, formIndex) => (
        <div
          key={formIndex}
          className="overflow-x-auto mb-6 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/80 dark:bg-slate-950/80 transition-colors shadow-xs"
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
                  {t("delete") || "O'chirish"}
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
                const lowerTitle = col.title.toLowerCase();

                if (lowerTitle.includes("tashkilot")) {
                  if (formIndex !== 0) return null; // ❗ faqat birinchi formulada ko‘rinadi
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
                    (item) => item.columnId === col.id,
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

      {/* ✅ FORMULA QO'SHISH TUGMASI (PlantCreate dagi kabi) */}
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={handleAddForm}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {t("add_new_form") || t("add")}
        </Button>
      </div>

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

export default InnersCreateReportItem;
