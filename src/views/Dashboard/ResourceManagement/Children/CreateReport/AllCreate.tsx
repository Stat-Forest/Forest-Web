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
  useGetReportSourceReportsQuery,
  useGetUsersReportQuery,
} from "@/services/reportsApi";
import {
  generalApi,
  useGetOrganizationReportsQuery,
} from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import { extractYearFromDeadline } from "@/utils/i18nHelpers";
import ImportExcelButton from "@/components/ImportExcelButton/ImportExcelButton";
import ImportTemplateButton from "@/components/ImportExcelButton/ImportTemplateButton";
import { ParsedExcelReport } from "@/utils/parseExcelReport";
import { ImportParseResponse } from "@/types/importReport";
import {
  findByName,
  getExcelSheets,
  matchSheetsToColumns,
  normalizeExcelText,
} from "@/utils/matchExcelColumns";

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

/** Butun ustunlar daraxtidan `id -> sarlavha zanjiri` xaritasini yig'adi */
function collectColumnChains(tree: any[]): Map<string, string> {
  const chainById = new Map<string, string>();

  const walk = (nodes: any[], parentChain: string[]) => {
    (nodes || []).forEach((node) => {
      if (!node) return;
      const chain = [...parentChain, node.title];
      if (node.id != null) chainById.set(String(node.id), chain.join(" / "));
      if (Array.isArray(node.children)) walk(node.children, chain);
    });
  };

  // Yuqori qavat — qadamlar (ilovalar), forma zanjiri ularning ichidan boshlanadi
  (tree || []).forEach((step: any) => walk(step?.children || [], []));

  return chainById;
}

function AllCreateReportItem() {
  const { reportName } = useParams();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  /** Qaysi location.state allaqachon import qilingani — takroriy import bo'lmasin */
  const appliedImportStateRef = useRef<unknown>(null);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [footNote, setFootNote] = useState<string>("");
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    ColumnItem[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  /** Import paytida joylanmagan qiymatlar / bo'sh qolgan ustunlar ro'yxati */
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [planItems, setPlanItems] = useState<
    {
      columnId: string;
      plan_value: string;
      fullParentChain: string;
    }[]
  >([]);

  const [yearPlan, setYearPlan] = useState<string>("");

  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const user_id = useSelector((state: RootState) => state.auth.user?.user_id);
  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  // Tashkilotlar hook orqali hali kelmagan bo'lishi mumkin — import paytida aniq so'raymiz
  const fetchOrganizations = async (): Promise<{ id: string; name: string }[]> => {
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

    const newValues: Record<string, string> = {};

    // Bitta formulali hisobot — har bir varaqning birinchi qatori birlashtiriladi
    sheetMatches.forEach(({ columnToExcel, rows }) => {
      const row = rows[0];
      if (!row) return;

      allCols.forEach((col) => {
        if (col.is_organization === true) return;
        if (newValues[col.id]) return;

        const excelIndex = columnToExcel[col.id];
        if (excelIndex === undefined) return;

        const cellValue = (row.cells[excelIndex] ?? "").trim();
        if (cellValue !== "") newValues[col.id] = cellValue;
      });
    });

    if (matchedOrg) {
      allCols.forEach((col) => {
        if (col.is_organization === true) newValues[col.id] = matchedOrg.id;
      });
    }

    if (matchedOrg) setSelectedOrganizationId(matchedOrg.id);

    if (Object.keys(newValues).length === 0) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    setFormValues((prev) => ({ ...prev, ...newValues }));
  };

  /**
   * Backend `/reports/import-parse/` javobi — ustunlar UUID bo'yicha keladi.
   */
  const applyImportPayload = async (payload: ImportParseResponse) => {
    const allCols = allEmptyColumnsByStep.flat();
    if (allCols.length === 0) {
      toast.error(t("excelImportNoTable"));
      return;
    }

    const columnById = new Map(allCols.map((col) => [String(col.id), col]));

    // Yangi formatdagi rows yoki items/plants bo'yicha qiymatlarni yig'amiz
    const rows = payload.rows || [];
    let payloadOrg = "";
    const items = [
      ...rows.flatMap((r) => {
        if (r.organization && !payloadOrg) payloadOrg = r.organization;
        return r.items || [];
      }),
      ...(payload.items || []),
      ...(payload.plants || []).flatMap((plant) => plant.items || []),
    ];

    // Avval kelgan qiymatlarni UUID bo'yicha yig'amiz (diagnostika uchun ham kerak)
    const receivedById = new Map<string, string>();
    const unmatched: { column: string; value: string }[] = [];
    /** Nom bo'yicha bog'lab olingan UUID lar */
    const resolvedIds = new Set<string>();
    const resolvedByTitle: string[] = [];
    /** Hisobot ustunlari daraxtida umuman uchramagan UUID lar */
    const missingInTree = new Set<string>();

    items.forEach((item) => {
      const columnId = String(item.column ?? "");
      const value = String(item.value ?? "").trim();

      if (!columnById.has(columnId)) {
        unmatched.push({ column: columnId, value });
        return;
      }
      receivedById.set(columnId, value);
    });

    // Backend formada yo'q UUID qaytarsa — o'sha ustunning nomini aniqlab,
    // shu nomdagi formadagi ustunga bog'laymiz (backend sarlavha bo'yicha
    // moslashtirganda boshqa ustun UUID sini berib yuborishi mumkin)
    if (unmatched.length > 0 && reportIds) {
      try {
        const fullTree = await dispatch(
          reportApi.endpoints.getStatementColumnsReport.initiate({
            statementId: reportIds as string,
            lang,
          }),
        ).unwrap();

        // Javob massiv yoki {results: [...]} ko'rinishida bo'lishi mumkin
        const treeNodes = Array.isArray(fullTree)
          ? fullTree
          : fullTree?.results || [];

        const chainById = collectColumnChains(treeNodes);

        console.info(
          `import-parse: to'liq ustunlar daraxtida ${chainById.size} ta ustun topildi`,
          unmatched.map(({ column }) => ({
            id: column,
            daraxtdagi_nomi: chainById.get(column) || "— daraxtda ham yo'q",
          })),
        );

        unmatched.forEach(({ column }) => {
          if (!chainById.has(column)) missingInTree.add(column);
        });

        // Formadagi ustunlarni nom bo'yicha izlash uchun tayyorlaymiz
        const formColumnsByChain = new Map<string, ColumnItem>();
        const formColumnsByTitle = new Map<string, ColumnItem>();
        allCols.forEach((column) => {
          const chain = normalizeExcelText(column.fullParentChain);
          const title = normalizeExcelText(column.title);
          if (!formColumnsByChain.has(chain)) {
            formColumnsByChain.set(chain, column);
          }
          if (!formColumnsByTitle.has(title)) {
            formColumnsByTitle.set(title, column);
          }
        });

        unmatched.forEach(({ column: columnId, value }) => {
          const chain = chainById.get(columnId);
          if (!chain || !value) return;

          const normalizedChain = normalizeExcelText(chain);
          const leaf = normalizeExcelText(chain.split("/").pop() || "");

          const target =
            formColumnsByChain.get(normalizedChain) ||
            formColumnsByTitle.get(leaf);

          // Faqat hali qiymat kelmagan ustunni to'ldiramiz
          if (!target || receivedById.has(String(target.id))) return;

          receivedById.set(String(target.id), value);
          resolvedIds.add(columnId);
          resolvedByTitle.push(`${chain} → ${target.fullParentChain}`);
        });
      } catch (error) {
        console.warn(
          "import-parse: noma'lum UUID larni nom bo'yicha aniqlab bo'lmadi",
          error,
        );
      }
    }

    if (resolvedByTitle.length > 0) {
      console.info("import-parse: nom bo'yicha bog'landi", resolvedByTitle);
    }

    const newValues: Record<string, string> = {};
    let organizationValue = payloadOrg || "";

    allCols.forEach((column) => {
      const value = receivedById.get(String(column.id));
      if (!value) return;

      if (column.is_organization === true) {
        organizationValue = value;
        return;
      }

      // Reja ustuni disabled — uni backenddan olingan qiymat bilan almashtirmaymiz
      if (column.status_plan != null) return;

      newValues[column.id] = value;
    });

    // Qaysi ustunga nima kelgani ko'rinib tursin — bo'sh qolgan ustunni tekshirish uchun
    console.info("import-parse natijasi:");
    console.table(
      allCols.map((column) => ({
        ustun: column.fullParentChain,
        id: String(column.id),
        turi: column.is_organization
          ? "tashkilot"
          : column.status_plan != null
            ? "reja (disabled)"
            : "input",
        kelgan_qiymat: receivedById.has(String(column.id))
          ? receivedById.get(String(column.id)) || "(bo'sh)"
          : "— backend yubormadi",
      })),
    );

    if (unmatched.length > 0) {
      console.warn(
        "import-parse: bu ustun UUID lari formada topilmadi",
        unmatched,
      );
    }

    // Foydalanuvchi DevTools ochmasdan ham sababini ko'rsin
    const issues: string[] = [
      ...unmatched
        .filter(({ column }) => !resolvedIds.has(column))
        .map(
          ({ column, value }) =>
            `«${value || "—"}» — ${t("excelImportUnknownColumn")} (ID: ${column})${
              missingInTree.has(column)
                ? ` — ${t("excelImportColumnNotInStatement")}`
                : ""
            }`,
        ),
      ...allCols
        .filter(
          (column) =>
            column.status_plan == null && // reja qiymati plan API dan keladi
            column.is_organization !== true && // tashkilot doim qo'lda tanlanadi
            !receivedById.get(String(column.id)),
        )
        .map((column) => `${column.fullParentChain} — ${t("excelImportNoValue")}`),
    ];

    setImportIssues(issues);

    if (organizationValue) {
      const organizations = await fetchOrganizations();

      // Qiymat UUID bo'lib kelishi ham mumkin — avval ID bo'yicha tekshiramiz
      const matchedOrg =
        organizations.find((org) => String(org.id) === organizationValue) ||
        findByName(organizations, organizationValue, (org) => org.name);

      if (matchedOrg) {
        setSelectedOrganizationId(matchedOrg.id);
        const orgColumn = allCols.find((col) => col.is_organization === true);
        if (orgColumn) newValues[orgColumn.id] = matchedOrg.id;
      } else {
        // Tashkilot doim qo'lda tanlanadi — foydalanuvchini bezovta qilmaymiz
        console.info("import-parse: tashkilot topilmadi", organizationValue);
      }
    }

    if (Object.keys(newValues).length === 0) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    setFormValues((prev) => ({ ...prev, ...newValues }));
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

    // Ilovalar alohida varaqlarda bo'lsa, backend odatda faqat birinchisini o'qiydi —
    // bunday faylni o'zimiz o'qiganimiz to'liqroq bo'ladi
    if (imported && getExcelSheets(imported).length > 1) {
      console.info(
        `import: faylda ${getExcelSheets(imported).length} ta varaq bor — fayl bo'yicha to'ldiramiz`,
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

  const { data: userById } = useGetUsersReportQuery(
    {
      user_id: user_id ? String(user_id) : "",
      page: 1,
      perPage: 10,
      search: "",
      organization: "",
      role: "",
    },
    { skip: !user_id },
  );

  const { data: sourceReports, isLoading: isSourceReportsLoading } = useGetReportSourceReportsQuery(
    { userById: userById?.results[0]?.organization },
    { skip: !userById?.results?.[0]?.organization }
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
    const currentString = JSON.stringify(allEmptyColumnsByStep);
    const newString = JSON.stringify(allEmptyColumnsByStepMemo);

    if (currentString !== newString) {
      setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
      setCurrentStep(0);
      // Tanlangan tashkilotni tozalash
      setSelectedOrganizationId("");
    }
  }, [allEmptyColumnsByStepMemo]);

  // Boshlang'ich qiymatlar
  useEffect(() => {
    if (!allEmptyColumnsByStep[currentStep]?.length) return;

    const initialValues: Record<string, string> = {};
    allEmptyColumnsByStep[currentStep].forEach((col) => {
      // Faqat oddiy input ustunlar uchun (tashkilot va reja emas)
      if (!col.is_organization && col.status_plan == null) {
        if (!formValues[col.id]) {
          initialValues[col.id] = "";
        }
      }
    });

    if (Object.keys(initialValues).length > 0) {
      setFormValues((prev) => {
        const hasNewValues = Object.keys(initialValues).some(
          (key) => !prev[key],
        );
        return hasNewValues ? { ...prev, ...initialValues } : prev;
      });
    }
  }, [currentStep, allEmptyColumnsByStep]);

  // Reja ma'lumotlarini olish
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = allEmptyColumnsByStep
        .flat()
        .filter((col) => col.status_plan != null);

      const targetYear = extractYearFromDeadline(yearPlan);

      if (rejaColumns.length === 0 || !reportIds || !selectedOrganizationId || !targetYear) {
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
                year: targetYear,
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
    yearPlan,
    dispatch,
    t,
  ]);

  const [
    createReportItem,
    { isLoading: isSubmitting, error: createReportError },
  ] = useCreateReportMutation();

  // Error larni boshqarish
  useEffect(() => {
    const errors: string[] = [];

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
  }, [createReportError, headersError, orgError, deadlineError, t]);

  const handleInputChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
    if (formErrors.length > 0) {
      setFormErrors([]);
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

    // Majburiy maydonlarni tekshirish (oddiy inputlar)
    allEmptyColumnsByStep[currentStep]?.forEach((col) => {
      if (!col.is_organization && col.status_plan == null) {
        if (
          !formValues[col.id] ||
          formValues[col.id].toString().trim() === ""
        ) {
          errors.push(`"${col.fullParentChain}" ${t("field_required")}`);
        }
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      errors.forEach((err) => toast.error(err));
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();

    const report_items = allColumns.map((col) => {
      let rawValue: string = "";

      if (col.is_organization === true) {
        rawValue = selectedOrganizationId || "";
      } else if (col.status_plan != null) {
        const planItem = planItems.find((item) => item.columnId === col.id);
        rawValue = planItem?.plan_value || "";
      } else {
        rawValue = formValues[col.id] || "";
      }

      return {
        statement_column: col.id,
        inners: [{ value: rawValue }],
      };
    });

    const seasonValue =
      reportName == "Ko'chat va Nihol Yetishtirish Jami"
        ? ""
        : selectedSeason || null;

    const payload = {
      deadline: selectedDeadlineId,
      report_items,
      season: seasonValue,
      ...(reportName == "Ko'chat va Nihol Yetishtirish Jami" &&
        selectedReportType && {
          source_report: selectedReportType,
        }),
      foot_note: footNote || "",
    };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      toast.success(t("report_created_successfully"));
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
      setFormErrors([]);
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err);
      toast.error(err?.data?.message || err?.message || t("submit_error"));
    }
  };

  if (isHeaderLoading || isOrgLoading || deadlineLoading) {
    return <p className="p-4 text-lg">{t("loading")}</p>;
  }

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;

  // Import qilishdan oldin muddat va tashkilot tanlangan bo'lishi shart:
  // reja qiymatlari aynan shu ikkisiga qarab yuklanadi
  const formHasOrganizationColumn = allEmptyColumnsByStep
    .flat()
    .some((col) => col.is_organization === true);

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
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `${t("step")} ${currentStep + 1}`;

  const formatDeadlineText = (submitAt: string) => {
    if (!submitAt) return t("unknown");

    if (submitAt.includes("CHORAK")) {
      return submitAt.replace("CHORAK_", " yil ").replace("_", "-chorak");
    }

    return submitAt;
  };

  return (
    <>
      <div className="p-6 flex items-center justify-between gap-3">
        <Button
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
              organizationId={selectedOrganizationId || undefined}
              year={yearPlan || undefined}
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

        {/* Import bo'yicha eslatmalar */}
        {importIssues.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                {t("excelImportIssuesTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setImportIssues([])}
                className="text-xs text-amber-700 dark:text-amber-300 underline cursor-pointer"
              >
                {t("excelPreviewClose")}
              </button>
            </div>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {importIssues.map((issue, idx) => (
                <li
                  key={idx}
                  className="text-sm text-amber-800 dark:text-amber-200"
                >
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Deadline va Season */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div>
            <label className="block mb-1 text-lg font-medium">
              {t("deadline")}:
            </label>
            <Select
              value={selectedDeadlineId}
              onValueChange={(val) => {
                setSelectedDeadlineId(val);
                const selectedItem = deadlineData?.results?.find(
                  (item: any) => item.id.toString() === val,
                );
                setYearPlan(
                  selectedItem ? extractYearFromDeadline(selectedItem) : "",
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

          {(reportIds === "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
            reportIds === "671577ba-6a86-4619-b31c-86fff20ad305") && (
            <div>
              <label className="block mb-1 text-lg font-medium">
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
          {reportName == "Ko'chat va Nihol Yetishtirish Jami" && (
            <div>
              <label className="block mb-1 text-lg font-medium">
                {t("report_type")}:
              </label>
              <Select
                value={selectedReportType}
                onValueChange={(val) => setSelectedReportType(val)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={t("select_report_type")} />
                </SelectTrigger>
                <SelectContent>
                  {isSourceReportsLoading && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      {t("loading")}
                    </div>
                  )}
                  {sourceReports?.results?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.statement_name} {item?.submit_at}
                    </SelectItem>
                  ))}
                  {sourceReports && sourceReports.results?.length === 0 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      {t("noData")}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Table */}
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
                  // Plan ustuni (status_plan != null)
                  if (col.status_plan != null) {
                    const planItem = planItems.find(
                      (item) => item.columnId === col.id,
                    );
                    return (
                      <TableRow key={col.id}>
                        <TableCell className="whitespace-normal break-words">
                          {col.fullParentChain}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={planItem?.plan_value || ""}
                            disabled
                            className="bg-slate-100 dark:!bg-slate-950/80 dark:!text-slate-400 dark:!border-slate-800 cursor-not-allowed"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Tashkilot ustuni (is_organization = true)
                  if (col.is_organization === true) {
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
                            <option value="">{t("selectOrganization")}</option>
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
                            handleInputChange(col.id, e.target.value)
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
        ) : (
          <p>{t("no_columns_in_step")}</p>
        )}

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
              {isSubmitting ? `⏳ ${t("sending")}` : t("submit")}
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

export default AllCreateReportItem;
