import { useReducer, useEffect, useMemo, useRef, useState } from "react";
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
  useGetStatementColumnsReportQuery,
  reportApi,
  useGetDeadlinesReportQuery,
  useGetPlantsReportQuery,
  usePlantCreateMutation,
} from "@/services/reportsApi";
import {
  generalApi,
  useGetOrganizationReportsQuery,
} from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ImportExcelButton from "@/components/ImportExcelButton/ImportExcelButton";
import ImportTemplateButton from "@/components/ImportExcelButton/ImportTemplateButton";
import { ParsedExcelReport } from "@/utils/parseExcelReport";
import {
  ImportParseResponse,
  splitImportItemsIntoRows,
} from "@/types/importReport";
import {
  countExcelDataRows,
  excelNameKey,
  excelNamesMatch,
  findByName,
  findSpecialExcelColumns,
  getExcelDataRows,
  getExcelSheets,
  matchSheetsToColumns,
  normalizeExcelText,
} from "@/utils/matchExcelColumns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { findEmptyChildrenColumnIds } from "@/utils/findEmptyChildrenColumnIds";
import {
  plantCreateReducer,
  plantCreateInitialState,
} from "@/reducers/plantCreateReducer";
import { FormGroup, EmptyColumn } from "@/types/plantCreateTypes";
import { extractYearFromDeadline } from "@/utils/i18nHelpers";

// Interface for API response data
interface Category {
  id: string;
  name: string;
  children: Plant[];
}

interface Plant {
  id: string;
  name: string;
}

interface Deadline {
  id: string;
  submit_at: string;
}

interface Organization {
  id: string;
  name: string;
}

interface TableHeaderData {
  id: string;
  title: string;
  children?: any[];
  is_organization?: boolean;
  status_plan?: any;
}

const EMPTY_TABLE_HEADERS: TableHeaderData[] = [];

function PlantCreate() {
  const [state, dispatch] = useReducer(
    plantCreateReducer,
    plantCreateInitialState,
  );

  // Cache o'simlik label'larini pagination bo'ylab saqlash
  const [plantMetaById, setPlantMetaById] = useState<
    Record<string, { name: string; categoryName?: string }>
  >({});
  // Muddat nomlarini paginatsiya bo'ylab saqlash (tanlangani boshqa sahifada bo'lsa ham ko'rinsin)
  const [deadlineMetaById, setDeadlineMetaById] = useState<
    Record<string, string>
  >({});
  const [footNote, setFootNote] = useState<string>("");
  const { reportName } = useParams<{ reportName?: string }>();
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");

  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const reduxDispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [yearPlan, setYearPlan] = useState<string>("");
  const isDaromadReport = reportName === "Daromad";

  /** Qaysi location.state allaqachon import qilingani — takroriy import bo'lmasin */
  const appliedImportStateRef = useRef<unknown>(null);

  /**
   * Deadline matnini formatlash.
   * `const` emas, `function` — u komponent tepasidagi effect/state updater'larda
   * ham chaqiriladi, hoisting bo'lmasa "before initialization" xatosi chiqadi.
   */
  function formatDeadlineText(submitAt: string) {
    if (!submitAt) return t("unknown");

    if (submitAt.includes("CHORAK")) {
      return submitAt.replace("CHORAK_", " yil ").replace("_", "-chorak");
    }

    return submitAt;
  }



  const quarterLabelsByKey: Record<string, string> = {
    q1: "1-chorak",
    q2: "2-chorak",
    q3: "3-chorak",
    q4: "4-chorak",
  };

  const getQuarterFromColumn = (column: EmptyColumn): string | null => {
    const chain = (column.fullParentChain || "").toLowerCase();

    for (const [quarterKey, quarterLabel] of Object.entries(quarterLabelsByKey)) {
      if (chain.includes(quarterLabel.toLowerCase())) {
        return quarterKey;
      }
    }

    return null;
  };

  const isEditableForSelectedQuarter = (column: EmptyColumn): boolean => {
    if (!isDaromadReport) return true;

    const columnQuarter = getQuarterFromColumn(column);
    if (!columnQuarter) return true;
    if (!selectedQuarter) return false;

    return columnQuarter === selectedQuarter;
  };

  const shouldIncludeColumnInPayload = (_column: EmptyColumn): boolean => {
    return true;
  };

  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery({ lang });

  const {
    data: tableHeadersData = EMPTY_TABLE_HEADERS,
    isLoading: isHeaderLoading,
    error: headersError,
  } = useGetStatementColumnsReportQuery(
    { statementId: reportIds || "", lang, isUser: "true" },
    { skip: !reportIds },
  );

  // Plants state with pagination
  const plantsPerPage = 5;

  const {
    data: plantsData,
    isLoading: plantsLoading,
    error: plantsError,
  } = useGetPlantsReportQuery(
    {
      statement: reportIds || "",
      lang,
      parent: "",
      page: state.plantsPage,
      perPage: plantsPerPage,
    },
    { skip: !reportIds },
  );

  // PlantsData kelgan sayin o'simlik nomlarini cache'ga qo'shib boramiz
  useEffect(() => {
    const results = (plantsData as any)?.results;
    if (!Array.isArray(results) || results.length === 0) return;

    setPlantMetaById((prev) => {
      let changed = false;
      const next = { ...prev };
      results.forEach((category: Category) => {
        const categoryName = category?.name || "";
        (category?.children || []).forEach((child: Plant) => {
          const id = child?.id?.toString?.() ?? "";
          if (!id) return;
          const name = child?.name || `ID: ${id}`;
          const existing = next[id];
          if (
            !existing ||
            existing.name !== name ||
            existing.categoryName !== categoryName
          ) {
            next[id] = { name, categoryName };
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [plantsData]);

  // Deadline state
  const deadlinePerPage = 5;

  const {
    data: deadlineData,
    isLoading: deadlineLoading,
    error: deadlineError,
  } = useGetDeadlinesReportQuery(
    {
      statement: reportIds || "",
      page: state.deadlinePage,
      perPage: deadlinePerPage,
      statement__period: "",
      is_new_deadline: "true",
    },
    { skip: !reportIds },
  );

  // Muddat nomlarini cache'ga yig'ib boramiz
  useEffect(() => {
    const results = (deadlineData as any)?.results;
    if (!Array.isArray(results) || results.length === 0) return;

    setDeadlineMetaById((prev) => {
      let changed = false;
      const next = { ...prev };
      results.forEach((item: Deadline) => {
        const id = item?.id?.toString?.() ?? "";
        if (!id) return;
        const label = formatDeadlineText(item.submit_at);
        if (next[id] !== label) {
          next[id] = label;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [deadlineData]);

  const tableHeadersDataMemo = useMemo(
    () => tableHeadersData,
    [tableHeadersData],
  );

  // Maxsus: "Ko‘chat va Nihol" ilovalari uchun o'simlik tanlash kerak emas
  const isKoChatVaNiholIlova1Step = (stepIndex: number): boolean => {
    const title =
      (tableHeadersData as TableHeaderData[])?.[stepIndex]?.title ?? "";
    if (!title) return false;

    const normalized = title
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ");

    return (
      normalized.includes("ko'chat") &&
      normalized.includes("nihol") &&
      normalized.includes("ilova")
    );
  };

  const allEmptyColumnsByStepMemo = useMemo(() => {
    return (tableHeadersDataMemo as TableHeaderData[]).map((obj) =>
      Array.isArray(obj.children)
        ? findEmptyChildrenColumnIds(obj.children)
        : [],
    );
  }, [tableHeadersDataMemo]);

  useEffect(() => {
    // Type assertion - allEmptyColumnsByStepMemo EmptyColumn[][] ekanligiga ishonch hosil qilamiz
    dispatch({
      type: "SET_EMPTY_COLUMNS",
      payload: allEmptyColumnsByStepMemo as EmptyColumn[][],
    });

    // Boshlang'ich formula guruhlari — faqat hali yaratilmagan bo'lsa.
    // Ustunlar qayta yuklanganda (refetch) to'ldirilgan formulalar o'chib
    // ketmasligi uchun mavjud guruhlarga tegmaymiz.
    if (
      allEmptyColumnsByStepMemo.length > 0 &&
      state.formGroups.length !== allEmptyColumnsByStepMemo.length
    ) {
      const initialFormGroups = allEmptyColumnsByStepMemo.map(
        (_: any, stepIndex: number) => ({
          step: stepIndex,
          forms: [{ values: {}, plantId: "" }],
        }),
      );
      dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });
    }
    // state.formGroups — faqat tekshiruv uchun, unga qarab qayta ishga tushmasin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEmptyColumnsByStepMemo]);

  // Excel select'lari uchun to'liq ro'yxatlar (select'lar paginatsiyali bo'lgani uchun)
  const fetchAllPlants = async (): Promise<
    { id: string; name: string; categoryName: string }[]
  > => {
    if (!reportIds) return [];
    try {
      const res: any = await reduxDispatch(
        reportApi.endpoints.getPlantsReport.initiate({
          statement: reportIds,
          lang,
          parent: "",
          page: 1,
          perPage: 1000,
        }),
      ).unwrap();

      return ((res?.results as Category[]) || []).flatMap((category) =>
        (category?.children || []).map((child) => ({
          id: child.id.toString(),
          name: child.name,
          categoryName: category.name || "",
        })),
      );
    } catch (error) {
      console.error("Excel import: o'simliklarni olishda xatolik", error);
      return [];
    }
  };

  // Tashkilotlar hook orqali hali kelmagan bo'lishi mumkin — import paytida aniq so'raymiz
  const fetchOrganizations = async (): Promise<Organization[]> => {
    const loaded = (organizationsData as Organization[]) || [];
    if (loaded.length > 0) return loaded;

    try {
      const res: any = await reduxDispatch(
        generalApi.endpoints.getOrganizationReports.initiate({ lang }),
      ).unwrap();

      return (Array.isArray(res) ? res : res?.results || []) as Organization[];
    } catch (error) {
      console.error("Excel import: tashkilotlarni olishda xatolik", error);
      return [];
    }
  };

  const fetchAllDeadlines = async (): Promise<Deadline[]> => {
    if (!reportIds) return [];
    try {
      const res: any = await reduxDispatch(
        reportApi.endpoints.getDeadlinesReport.initiate({
          statement: reportIds,
          page: 1,
          perPage: 1000,
          statement__period: "",
          is_new_deadline: "true",
        }),
      ).unwrap();

      return (res?.results as Deadline[]) || [];
    } catch (error) {
      console.error("Excel import: muddatlarni olishda xatolik", error);
      return [];
    }
  };

  const handleExcelImport = async (data: ParsedExcelReport) => {
    const stepsColumns = (allEmptyColumnsByStepMemo || []) as EmptyColumn[][];
    if (!data || stepsColumns.length === 0) return;

    // Har bir ilova alohida varaqda bo'lishi mumkin — hammasini olamiz
    const sheets = getExcelSheets(data);

    if (sheets.length === 0) {
      toast.error(t("excelImportNoTable"));
      return;
    }

    // 1. Tashkilot ustuni (select) — Exceldagi tashkilot nomi bo'yicha.
    // Tashkilot nomi qaysi varaqda uchrasa — o'shanisi yetarli.
    let excelOrgName = "";
    sheets.some((sheet) => {
      const special = findSpecialExcelColumns(sheet.headerChains);
      if (special.organizationIndex < 0) return false;

      const rows = getExcelDataRows(sheet.dataRows, [
        special.numberIndex,
        special.organizationIndex,
        special.plantIndex,
      ]);
      excelOrgName = (rows[0]?.cells[special.organizationIndex] ?? "").trim();
      return excelOrgName !== "";
    });

    const matchedOrg = excelOrgName
      ? findByName(await fetchOrganizations(), excelOrgName, (org) => org.name)
      : undefined;

    // 2. O'simlik ustuni (select) — har bir Excel qatori alohida formula bo'ladi
    const needsPlants = sheets.some(
      (sheet) => findSpecialExcelColumns(sheet.headerChains).plantIndex >= 0,
    );
    const allPlants = needsPlants ? await fetchAllPlants() : [];

    if (allPlants.length > 0) {
      setPlantMetaById((prev) => {
        const next = { ...prev };
        allPlants.forEach((plant) => {
          next[plant.id] = {
            name: plant.name,
            categoryName: plant.categoryName,
          };
        });
        return next;
      });
    }

    // 3. Har bir qadam uchun formulalarni Excel qatorlaridan yig'amiz
    let matchedColumnCount = 0;
    const unmatchedPlantNames: string[] = [];

    // Nomi biror qadam nomiga to'g'ri keladigan varaqlar — faqat o'sha qadamniki
    const stepTitles = stepsColumns.map(
      (_, stepIndex) =>
        (tableHeadersData as TableHeaderData[])?.[stepIndex]?.title ?? "",
    );
    const reservedSheetKeys = new Set(
      sheets
        .filter((sheet) =>
          stepTitles.some((title) => excelNamesMatch(sheet.name, title)),
        )
        .map((sheet) => excelNameKey(sheet.name)),
    );

    const newFormGroups: FormGroup[] = stepsColumns.map(
      (stepColumns, stepIndex) => {
        const existingGroup = state.formGroups.find(
          (group) => group.step === stepIndex,
        );
        const fallbackGroup: FormGroup = existingGroup || {
          step: stepIndex,
          forms: [{ values: {}, plantId: "" }],
        };

        // Qadam ustunlari bir nechta varaqda uchrashi mumkin (ilovalarning
        // ustun nomlari deyarli bir xil) — shuning uchun avval varaq nomini
        // qadam nomi bilan solishtiramiz, keyingina moslik bahosiga qaraymiz.
        const stepTitle =
          (tableHeadersData as TableHeaderData[])?.[stepIndex]?.title ?? "";
        const matches = matchSheetsToColumns(sheets, stepColumns).filter(
          (match) => match.matchedCount > 0,
        );

        const byName = stepTitle
          ? matches.find((match) => excelNamesMatch(match.sheet.name, stepTitle))
          : undefined;

        // Nom bo'yicha topilmasa — boshqa qadamga atalgan varaqdan olmaymiz.
        const freeMatch = matches.find(
          (match) => !reservedSheetKeys.has(excelNameKey(match.sheet.name)),
        );

        // Gar varaq nomi bo'yicha mos kelmasa:
        // 1) Boshqa qadamga biriktirilgan (reserved) varaq bo'lsa, bu qadamga olib kelmaymiz.
        // 2) Bitta varaqli fayl bo'lib, uning nomi boshqa qadam bilan mos kelsa, bu qadamga TEGMAYMIZ!
        let best = byName;
        if (!best) {
          if (freeMatch) {
            best = freeMatch;
          } else if (sheets.length === 1) {
            const singleSheetName = sheets[0].name;
            const isReservedForOtherStep = stepTitles.some(
              (title, idx) =>
                idx !== stepIndex && excelNamesMatch(singleSheetName, title),
            );
            if (!isReservedForOtherStep && matches.length > 0) {
              best = matches[0];
            }
          }
        }

        // Bu qadam ustunlari Excelda topilmadi, mos emas yoki varaq bo'sh — eski to'ldirilgan ma'lumotni saqlaymiz!
        if (!best || best.filledCount === 0) return fallbackGroup;

        const { columnToExcel, special, rows: filledRows } = best;
        console.info(
          `import: ${stepIndex + 1}-qadam ("${stepTitle}") uchun "${best.sheet.name || "varaq"}" varag'i tanlandi — ${best.matchedCount} ta ustun, ${filledRows.length} ta qator${byName ? " (nom bo'yicha)" : ""}`,
        );

        let plantColIndex = special.plantIndex;
        if (plantColIndex < 0 && allPlants.length > 0 && filledRows.length > 0) {
          const sampleRow = filledRows[0];
          const foundIdx = sampleRow.cells.findIndex((cell) => {
            const val = (cell ?? "").trim();
            return val ? findByName(allPlants, val, (item) => item.name) !== undefined : false;
          });
          if (foundIdx >= 0) {
            plantColIndex = foundIdx;
          }
        }

        const usePlantRows =
          plantColIndex >= 0 && !isKoChatVaNiholIlova1Step(stepIndex);
        const rows = usePlantRows ? filledRows : filledRows.slice(0, 1);

        const forms = rows.map((row) => {
          const values: Record<string, string> = {};

          stepColumns.forEach((col) => {
            // Tashkilot ustuni qiymati — tashkilot ID si
            if (col.is_organization === true) {
              if (matchedOrg) values[col.id] = matchedOrg.id;
              return;
            }

            const excelIndex = columnToExcel[col.id];
            if (excelIndex === undefined) return;

            const cellValue = (row.cells[excelIndex] ?? "").trim();
            if (cellValue !== "") {
              values[col.id] = cellValue;
              matchedColumnCount += 1;
            }
          });

          let plantId = "";
          if (usePlantRows && plantColIndex >= 0) {
            const plantName = (row.cells[plantColIndex] ?? "").trim();
            const plant = plantName
              ? findByName(allPlants, plantName, (item) => item.name)
              : undefined;

            if (plant) {
              plantId = plant.id;
            } else if (plantName) {
              unmatchedPlantNames.push(plantName);
            }
          }

          return { values, plantId };
        });

        return { step: stepIndex, forms };
      },
    );

    dispatch({ type: "SET_FORM_GROUPS", payload: newFormGroups });

    if (matchedOrg) {
      dispatch({ type: "SET_ORGANIZATION", payload: matchedOrg.id });
    }

    // 4. Muddat (deadline) — Excel matnida muddat nomi uchrasa tanlaymiz.
    // "Export qilingan vaqt" — hisobot muddati emas, uni hisobga olmaymiz.
    const sheetText = (data.sheets || [{ grid: data.grid || [] }])
      .flatMap((sheet) => sheet.grid || [])
      .flatMap((row) => row.cells.map((cell) => normalizeExcelText(cell.value)))
      .filter(Boolean)
      .filter(
        (text) => !text.includes("export qilingan") && !text.includes("экспорт"),
      );

    const allDeadlines = await fetchAllDeadlines();
    const deadlineMatches = allDeadlines.filter((item) => {
      const label = normalizeExcelText(formatDeadlineText(item.submit_at));
      if (label.length < 4) return false;
      return sheetText.some((text) => text.includes(label));
    });

    // Bir nechta muddat mos kelsa — noto'g'ri tanlamaymiz, foydalanuvchi o'zi tanlaydi
    const matchedDeadline =
      deadlineMatches.length === 1 ? deadlineMatches[0] : undefined;

    if (matchedDeadline) {
      setDeadlineMetaById((prev) => ({
        ...prev,
        [matchedDeadline.id.toString()]: formatDeadlineText(
          matchedDeadline.submit_at,
        ),
      }));
      dispatch({
        type: "SET_DEADLINE",
        payload: matchedDeadline.id.toString(),
      });
      setYearPlan(extractYearFromDeadline(matchedDeadline));
    }

    // 5. Natijani foydalanuvchiga aytamiz
    if (matchedColumnCount === 0) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    if (unmatchedPlantNames.length > 0) {
      toast.warning(
        `${t("excelImportPlantsNotFound")}: ${Array.from(new Set(unmatchedPlantNames)).join(", ")}`,
      );
    }

    if (excelOrgName && !matchedOrg) {
      // Tashkilot doim qo'lda tanlanadi — faqat konsolga yozamiz
      console.info("excel-import: tashkilot topilmadi", excelOrgName);
    }

    if (!matchedDeadline) {
      toast.info(t("excelImportSelectDeadline"));
    }
  };

  const isPlantColumn = (col: any): boolean => {
    if (
      col?.is_virtual === true ||
      col?.statement_column_id === "plant_name_virtual" ||
      col?.id === "plant_name_virtual"
    ) {
      return true;
    }
    const name = (
      col?.statement_column_name ??
      col?.statement_column_title ??
      col?.title ??
      col?.fullParentChain ??
      ""
    )
      .toString()
      .toLowerCase();
    return (
      name === "o'simlik nomi" ||
      name === "osimlik nomi" ||
      name === "o‘simlik nomi" ||
      name === "o`simlik nomi" ||
      name === "название растения" ||
      name === "наименование растения" ||
      name === "ўсимлик номи" ||
      name === "plant_name" ||
      (name.includes("o'simlik") && name.includes("nomi")) ||
      (name.includes("osimlik") && name.includes("nomi")) ||
      (name.includes("o‘simlik") && name.includes("nomi")) ||
      (name.includes("o`simlik") && name.includes("nomi")) ||
      (name.includes("растени") &&
        (name.includes("назван") || name.includes("наименов")))
    );
  };

  /**
   * Backend `/reports/import-parse/` javobini formaga qo'llash.
   * Bu yerda ustunlar UUID bo'yicha keladi — nom bo'yicha taxmin qilish shart emas.
   */
  const applyImportPayload = async (payload: ImportParseResponse) => {
    const stepsColumns = (allEmptyColumnsByStepMemo || []) as EmptyColumn[][];
    if (stepsColumns.length === 0) return;

    const items = payload.items || [];
    const plants = payload.plants || [];
    const rows = payload.rows || [];

    // Barcha o'simliklar ro'yxatini yuklaymiz (ID yoki nom bo'yicha avtomatik bog'lash uchun)
    const allPlants = await fetchAllPlants();
    if (allPlants.length > 0) {
      setPlantMetaById((prev) => {
        const next = { ...prev };
        allPlants.forEach((p) => {
          next[p.id] = { name: p.name, categoryName: p.categoryName };
        });
        return next;
      });
    }

    const findMatchingPlant = (plantIdentifier: string) => {
      if (!plantIdentifier) return undefined;
      const clean = plantIdentifier.trim();
      if (!clean) return undefined;
      // 1. To'g'ridan-to'g'ri ID bo'yicha
      const byId = allPlants.find((p) => String(p.id) === clean);
      if (byId) return byId;
      // 2. Nom bo'yicha
      const byName = findByName(allPlants, clean, (p) => p.name);
      if (byName) return byName;
      // 3. Qisman moslik
      const cleanLower = clean.toLowerCase();
      return allPlants.find((p) => {
        const pName = p.name.toLowerCase();
        return pName.includes(cleanLower) || cleanLower.includes(pName);
      });
    };

    // Ustun UUID -> qaysi qadamda ekani va ustun ma'lumoti
    const columnById = new Map<string, { step: number; column: EmptyColumn }>();
    stepsColumns.forEach((columns, stepIndex) => {
      columns.forEach((column) => {
        columnById.set(String(column.id), { step: stepIndex, column });
      });
    });

    // Mavjud formulalardan nusxa olamiz
    const nextGroups: FormGroup[] = stepsColumns.map((_, stepIndex) => {
      const existing = state.formGroups.find((group) => group.step === stepIndex);
      return existing
        ? {
            step: stepIndex,
            forms: existing.forms.map((form) => ({
              ...form,
              values: { ...form.values },
            })),
          }
        : { step: stepIndex, forms: [{ values: {}, plantId: "" }] };
    });

    let filledCount = 0;
    let organizationValue = "";

    const unmatched: string[] = [];

    const setValue = (columnId: string, rawValue: string, formIndex: number) => {
      const found = columnById.get(columnId);
      if (!found) {
        unmatched.push(columnId);
        return;
      }

      const value = rawValue.trim();
      if (value === "") return;

      // Tashkilot ustuni — qiymat nom bo'lib kelishi mumkin, keyinroq ID ga aylantiramiz
      if (found.column.is_organization === true) {
        organizationValue = value;
        return;
      }

      // O'simlik nomi ustuni bo'lsa — plantId ni topib biriktiramiz
      if (isPlantColumn(found.column)) {
        const matched = findMatchingPlant(value);
        if (matched) {
          nextGroups.forEach((group) => {
            while (group.forms.length <= formIndex) {
              group.forms.push({ values: {}, plantId: "" });
            }
            group.forms[formIndex].plantId = String(matched.id);
          });
        }
        return;
      }

      const group = nextGroups.find((item) => item.step === found.step);
      if (!group) return;

      while (group.forms.length <= formIndex) {
        group.forms.push({ values: {}, plantId: "" });
      }

      group.forms[formIndex].values[columnId] = value;
      filledCount += 1;
    };

    // 1. O'simlik kesimidagi hisobot — har bir o'simlik alohida formula (payload.plants)
    if (plants.length > 0) {
      plants.forEach((plant, plantIndex) => {
        (plant.items || []).forEach((item) => {
          setValue(String(item.column), String(item.value ?? ""), plantIndex);
        });

        const plantIdent = plant.plant ? String(plant.plant) : plant.plant_name || "";
        const matched = findMatchingPlant(plantIdent);
        const resolvedPlantId = matched ? String(matched.id) : plantIdent;

        if (resolvedPlantId && plant.plant_name) {
          setPlantMetaById((prev) => ({
            ...prev,
            [resolvedPlantId]: { name: plant.plant_name || (matched?.name ?? resolvedPlantId) },
          }));
        }

        // Qaysi qadamda o'simlik ustunlari bo'lsa, o'sha formulaga plantId yozamiz
        nextGroups.forEach((group) => {
          while (group.forms.length <= plantIndex) {
            group.forms.push({ values: {}, plantId: "" });
          }
          if (group.forms[plantIndex]) {
            group.forms[plantIndex].plantId = resolvedPlantId;
          }
        });
      });
    } else if (rows.length > 0) {
      // 2. Yangi format: barcha qatorlar bo'yicha guruhlangan (rows)
      rows.forEach((rowEntry, rowIndex) => {
        if (rowEntry.organization && !organizationValue) {
          organizationValue = rowEntry.organization;
        }

        const rowPlantIdent = (rowEntry as any).plant || (rowEntry as any).plant_name || "";
        if (rowPlantIdent) {
          const matched = findMatchingPlant(String(rowPlantIdent));
          if (matched) {
            nextGroups.forEach((group) => {
              while (group.forms.length <= rowIndex) {
                group.forms.push({ values: {}, plantId: "" });
              }
              group.forms[rowIndex].plantId = String(matched.id);
            });
          }
        }

        (rowEntry.items || []).forEach((item) => {
          const rawVal = String(item.value ?? "").trim();
          const found = columnById.get(String(item.column));
          if (found && isPlantColumn(found.column)) {
            const matched = findMatchingPlant(rawVal);
            if (matched) {
              nextGroups.forEach((group) => {
                while (group.forms.length <= rowIndex) {
                  group.forms.push({ values: {}, plantId: "" });
                }
                group.forms[rowIndex].plantId = String(matched.id);
              });
            }
          } else if (rawVal) {
            const matched = findMatchingPlant(rawVal);
            if (matched && found && !found.column.is_organization && found.column.status_plan == null) {
              const colName = (found.column.title || found.column.fullParentChain || "").toLowerCase();
              if (colName.includes("o'simlik") || colName.includes("osimlik") || colName.includes("nomi") || colName.includes("растени")) {
                nextGroups.forEach((group) => {
                  while (group.forms.length <= rowIndex) {
                    group.forms.push({ values: {}, plantId: "" });
                  }
                  group.forms[rowIndex].plantId = String(matched.id);
                });
              }
            }
          }

          setValue(String(item.column), rawVal, rowIndex);
        });
      });
    } else {
      // 3. Oddiy (flat) hisobot (takrorlangan ustun UUID lari bo'yicha qatorlarga bo'lamiz)
      const itemRows = splitImportItemsIntoRows(items);
      itemRows.forEach((rowItems, rowIndex) => {
        rowItems.forEach((item) => {
          const rawVal = String(item.value ?? "").trim();
          const found = columnById.get(String(item.column));
          if (found && isPlantColumn(found.column)) {
            const matched = findMatchingPlant(rawVal);
            if (matched) {
              nextGroups.forEach((group) => {
                while (group.forms.length <= rowIndex) {
                  group.forms.push({ values: {}, plantId: "" });
                }
                group.forms[rowIndex].plantId = String(matched.id);
              });
            }
          }
          setValue(String(item.column), rawVal, rowIndex);
        });
      });
    }

    console.info("import-parse hajmi:", {
      plants: plants.length,
      rows: rows.length,
      items: items.length,
      formulalar:
        plants.length > 0
          ? plants.length
          : rows.length > 0
            ? rows.length
            : splitImportItemsIntoRows(items).length,
    });

    dispatch({ type: "SET_FORM_GROUPS", payload: nextGroups });

    if (unmatched.length > 0) {
      console.warn(
        "import-parse: bu ustun UUID lari formada topilmadi",
        unmatched,
        "formadagi ustunlar:",
        Array.from(columnById.keys()),
      );
    }

    // 3. Tashkilot ustuni bo'lsa — nomni ID ga aylantiramiz
    if (organizationValue) {
      const organizations = await fetchOrganizations();
      const matchedOrg =
        organizations.find((org) => String(org.id) === organizationValue) ||
        findByName(organizations, organizationValue, (org) => org.name);

      if (matchedOrg) {
        dispatch({ type: "SET_ORGANIZATION", payload: matchedOrg.id });
      } else {
        // Tashkilot doim qo'lda tanlanadi — foydalanuvchini bezovta qilmaymiz
        console.info("import-parse: tashkilot topilmadi", organizationValue);
      }
    }

    if (filledCount === 0) {
      toast.error(t("excelImportNoMatch"));
      return;
    }

    if (!state.selectedDeadlineId) {
      toast.info(t("excelImportSelectDeadline"));
    }
  };

  useEffect(() => {
    if (allEmptyColumnsByStepMemo.length === 0) return;

    // Import bir marta qo'llaniladi: ustunlar qayta yuklanganda (refetch) yoki
    // sahifa qayta chizilganda foydalanuvchi kiritgan qiymatlar ustidan yozilmasin
    if (appliedImportStateRef.current === location.state) return;

    // Backend parse qilgan payload ustunroq — UUID aniq keladi
    const payload = (location.state as any)?.importedPayload as
      | ImportParseResponse
      | undefined;
    const imported = (location.state as any)?.importedExcelData as
      | ParsedExcelReport
      | undefined;

    if (!payload && !imported) return;

    appliedImportStateRef.current = location.state;

    // Backend faylning hamma qatorini o'qimasligi mumkin (masalan 4 qatordan 1 tasi).
    // Shunday holatda faylning o'zidan o'qigan natijamiz to'liqroq bo'ladi.
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
  }, [location.state, allEmptyColumnsByStepMemo]);

  // Reja ma'lumotlari (per-plant per-column)
  const [planByColumnAndPlant, setPlanByColumnAndPlant] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    let mounted = true;

    const rejaColumns = state.allEmptyColumnsByStep
      .flat()
      .filter((col) => col.status_plan != null);

    if (
      rejaColumns.length === 0 ||
      !reportIds ||
      !state.selectedOrganizationId ||
      !yearPlan
    ) {
      if (mounted) setPlanByColumnAndPlant({});
      return;
    }

    const allPlantIds = Array.from(
      new Set(
        state.formGroups
          .flatMap((g) => g.forms.map((f) => f.plantId))
          .filter(Boolean),
      ),
    );

    if (allPlantIds.length === 0) {
      if (mounted) setPlanByColumnAndPlant({});
      return;
    }

    const targetYear = extractYearFromDeadline(yearPlan);
    if (!targetYear || !state.selectedOrganizationId) return;

    const tasks: Promise<void>[] = [];

    rejaColumns.forEach((col) => {
      allPlantIds.forEach((pId) => {
        if (planByColumnAndPlant[col.id]?.[pId] !== undefined) return;

        const task = (async () => {
          try {
            const res = await reduxDispatch(
              reportApi.endpoints.getPlanItemsReport.initiate({
                organization_id: state.selectedOrganizationId,
                statement_id: reportIds,
                year: targetYear,
                column: col.id,
                plant_id: pId,
              }),
            ).unwrap();

            const planValue = (res?.[0]?.plan_value ?? "")?.toString?.() || "";

            if (!mounted) return;

            setPlanByColumnAndPlant((prev) => ({
              ...prev,
              [col.id]: {
                ...(prev[col.id] || {}),
                [pId]: planValue,
              },
            }));
          } catch (err) {
            console.error("Plan fetch error", col.id, pId, err);
            if (!mounted) return;
            setPlanByColumnAndPlant((prev) => ({
              ...prev,
              [col.id]: {
                ...(prev[col.id] || {}),
                [pId]: "",
              },
            }));
          }
        })();

        tasks.push(task);
      });
    });

    Promise.all(tasks).catch((e) => console.error(e));

    return () => {
      mounted = false;
    };
  }, [
    state.allEmptyColumnsByStep,
    state.formGroups,
    state.selectedOrganizationId,
    reportIds,
    yearPlan,
    reduxDispatch,
  ]);

  const [createReportItem, { isLoading: isSubmitting, error: createError }] =
    usePlantCreateMutation();

  // Error larni boshqarish
  useEffect(() => {
    const errors: string[] = [];

    if (createError) {
      const errorData = (createError as any)?.data;

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

    if (plantsError) {
      errors.push(t("plants_load_error"));
    }

    if (errors.length > 0) {
      dispatch({ type: "SET_FORM_ERRORS", payload: errors });
    }
  }, [createError, headersError, orgError, deadlineError, plantsError, t]);

  // Input o'zgartirish funksiyasi
  const handleInputChange = (
    stepIndex: number,
    formIndex: number,
    id: string,
    value: string,
  ) => {
    dispatch({
      type: "UPDATE_FORM_VALUE",
      payload: { stepIndex, formIndex, id, value },
    });
    if (state.formErrors.length > 0) {
      dispatch({ type: "SET_FORM_ERRORS", payload: [] });
    }
  };

  // O'simlik o'zgartirish funksiyasi
  const handlePlantChange = (
    stepIndex: number,
    formIndex: number,
    plantId: string,
  ) => {
    if (plantId) {
      dispatch({ type: "ADD_USED_PLANT_ID", payload: plantId });
    }

    dispatch({
      type: "UPDATE_PLANT_ID",
      payload: { stepIndex, formIndex, plantId },
    });
  };

  const getPlantLabel = (plantId: string) => {
    if (!plantId) return "";
    return plantMetaById[plantId]?.name || `ID: ${plantId}`;
  };

  const getPlantCategory = (plantId: string) => {
    if (!plantId) return "";
    return plantMetaById[plantId]?.categoryName || "";
  };

  // Formula qo'shish funksiyasi
  const handleAddForm = (stepIndex: number) => {
    dispatch({ type: "ADD_FORM", payload: stepIndex });
  };

  // Formula o'chirish funksiyasi
  const handleRemoveForm = (stepIndex: number, formIndex: number) => {
    dispatch({ type: "REMOVE_FORM", payload: { stepIndex, formIndex } });
  };

  // Tanlangan o'simlik ID larni joriy qadam (step) uchun hisoblash
  const getUsedPlantIdsForCurrentStep = useMemo(() => {
    const usedIds = new Set<string>();
    const currentGroup = state.formGroups.find(
      (group) => group.step === state.currentStep,
    );
    if (currentGroup) {
      currentGroup.forms.forEach((form) => {
        if (form.plantId) {
          usedIds.add(form.plantId);
        }
      });
    }
    return usedIds;
  }, [state.formGroups, state.currentStep]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: "SET_FORM_ERRORS", payload: [] });

    const errors: string[] = [];

    // Deadline tekshiruvi
    if (!state.selectedDeadlineId) {
      errors.push(t("select_deadline_required"));
    }

    if (isDaromadReport && !selectedQuarter) {
      errors.push("Chorakni tanlang");
    }

    // Tashkilot ustuni mavjudligini tekshirish
    const hasOrganizationColumn = state.allEmptyColumnsByStep
      .flat()
      .some((col) => col.is_organization === true);

    if (hasOrganizationColumn && !state.selectedOrganizationId) {
      errors.push(t("select_organization_required"));
    }

    // O'simlik duplikatsiyasini har bir qadam (step) ichida alohida tekshiramiz
    state.formGroups.forEach((group) => {
      const skipPlantForStep = isKoChatVaNiholIlova1Step(group.step);
      if (skipPlantForStep) {
        return;
      }

      const stepPlantIds: string[] = [];
      group.forms.forEach((form) => {
        if (form.plantId) {
          if (stepPlantIds.includes(form.plantId)) {
            errors.push(
              `${group.step + 1}-${t("step")}: ${t("duplicate_plant")}`,
            );
          }
          stepPlantIds.push(form.plantId);
        }
      });
    });

    // Har bir formula uchun o'simlik tanlanganligini tekshiramiz
    state.formGroups.forEach((group) => {
      const skipPlantForStep = isKoChatVaNiholIlova1Step(group.step);
      if (skipPlantForStep) {
        return;
      }

      group.forms.forEach((form, formIndex) => {
        if (!form.plantId) {
          errors.push(
            t("please_select_plant", {
              step: group.step + 1,
              form: formIndex + 1,
            }),
          );
        }
      });
    });

    // Har bir formula uchun majburiy maydonlarni tekshiramiz
    state.formGroups.forEach((group) => {
      group.forms.forEach((form, formIndex) => {
        state.allEmptyColumnsByStep[group.step]?.forEach((col) => {
          if (!isEditableForSelectedQuarter(col)) return;

          // Tashkilot va reja ustunlarini tekshirishdan o'tkazib yuboramiz
          if (col.is_organization === true) return;
          if (col.status_plan != null) return;

          if (
            !form.values[col.id] ||
            form.values[col.id].toString().trim() === ""
          ) {
            errors.push(
              `${group.step + 1}-qadam ${formIndex + 1}-formula uchun "${
                col.fullParentChain
              }" ${t("field_required")}`,
            );
          }
        });
      });
    });

    if (errors.length > 0) {
      dispatch({ type: "SET_FORM_ERRORS", payload: errors });
      errors.forEach((err) => toast.error(err));
      return;
    }

    // Backend strukturasiga mos report_items yaratish
    const report_items = state.allEmptyColumnsByStep.flatMap(
      (stepColumns, stepIndex) => {
        const currentFormGroup = state.formGroups.find(
          (group) => group.step === stepIndex,
        );

        if (!currentFormGroup) return [];

        const filteredStepColumns = stepColumns.filter(
          shouldIncludeColumnInPayload,
        );

        return filteredStepColumns.map((col) => {
          if (col.is_organization === true) {
            // Tashkilot ustuni - faqat bir marta
            return {
              statement_column: col.id,
              inners: [{ value: state.selectedOrganizationId || "" }],
            };
          } else if (col.status_plan != null) {
            // Reja ustuni - har bir formula uchun alohida
            const inners = currentFormGroup.forms.map((form) => {
              const value =
                planByColumnAndPlant?.[col.id]?.[form.plantId] ||
                form.values[col.id] ||
                "";
              const plant = isKoChatVaNiholIlova1Step(stepIndex)
                ? null
                : form.plantId || null;

              return {
                plant,
                value,
              };
            });

            return {
              statement_column: col.id,
              inners,
            };
          } else {
            // Boshqa maydonlar - har bir formula uchun alohida
            const isKoChatVaNiholStep = isKoChatVaNiholIlova1Step(stepIndex);
            const inners = currentFormGroup.forms.map((form) => {
              const finalValue = isEditableForSelectedQuarter(col)
                ? form.values[col.id] || ""
                : "0";

              if (isKoChatVaNiholStep) {
                return {
                  plant: null,
                  value: finalValue,
                };
              } else {
                return {
                  ...(form.plantId && { plant: form.plantId }),
                  value: finalValue,
                };
              }
            });

            return {
              statement_column: col.id,
              inners,
            };
          }
        });
      },
    );

    const payload = {
      deadline: state.selectedDeadlineId,
      ...(isDaromadReport ? { quarter: selectedQuarter } : {}),
      report_items,
      foot_note: footNote || "",
    };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      toast.success(t("report_created_successfully"));
      navigate(-1);

      // Reset
      const initialFormGroups = allEmptyColumnsByStepMemo.map(
        (_: any, stepIndex: number) => ({
          step: stepIndex,
          forms: [{ values: {}, plantId: "" }],
        }),
      );
      dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });
      dispatch({ type: "SET_CURRENT_STEP", payload: 0 });
      dispatch({ type: "SET_FORM_ERRORS", payload: [] });
      dispatch({ type: "RESET_FORM" });
      setSelectedQuarter("");
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err);
      toast.error(err?.data?.message || err?.message || t("submit_error"));
      dispatch({
        type: "ADD_FORM_ERROR",
        payload: err?.data?.message || err?.message || t("submit_error"),
      });
    }
  };

  if (isHeaderLoading || isOrgLoading || deadlineLoading || plantsLoading)
    return <p className="p-4 text-lg">{t("loading")}</p>;

  if (headersError || orgError || deadlineError || plantsError)
    return (
      <div className="text-red-500 p-4">
        <p>{t("loading_error")}</p>
        <p className="text-sm">
          {String(deadlineError || headersError || orgError || plantsError)}
        </p>
      </div>
    );

  const currentEmptyColumns =
    state.allEmptyColumnsByStep[state.currentStep] || [];
  const totalSteps = state.allEmptyColumnsByStep.length;
  const currentStepTitle =
    (tableHeadersData as TableHeaderData[])?.[state.currentStep]?.title ??
    `${t("step")} ${state.currentStep + 1}`;
  const currentFormGroup = state.formGroups.find(
    (group) => group.step === state.currentStep,
  );

  // Reja qiymatlari muddat va tashkilotga bog'liq — import shulardan keyin bo'lishi kerak
  const formHasOrganizationColumn = state.allEmptyColumnsByStep
    .flat()
    .some((col) => col.is_organization === true);

  // Import tartibi: avval muddat, keyin tashkilot — undan so'nggina Excel fayl
  const orgStillNeeded =
    formHasOrganizationColumn && !state.selectedOrganizationId;
  const importDisabledReason =
    !state.selectedDeadlineId && orgStillNeeded
      ? t("excelImportOrderHint")
      : !state.selectedDeadlineId
        ? t("excelImportSelectDeadlineFirst")
        : orgStillNeeded
          ? t("excelImportSelectOrgFirst")
          : "";

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
        {state.formErrors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold text-lg mb-2">{t("errors")}:</h3>
            <ul className="list-disc list-inside space-y-1">
              {state.formErrors.map((error: string, idx: number) => (
                <li key={idx} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-6 items-end">
          {/* Deadline Select */}
          <div>
            <label className="block mb-1 text-lg font-medium">
              {t("deadline")}:
            </label>
            <Select
              value={state.selectedDeadlineId}
              onValueChange={(val) => {
                const selectedItem = (deadlineData as any)?.results?.find(
                  (item: Deadline) => item.id.toString() === val,
                );

                dispatch({ type: "SET_DEADLINE", payload: val });

                setYearPlan(
                  selectedItem ? extractYearFromDeadline(selectedItem) : "",
                );
              }}
            >
              <SelectTrigger className="w-[300px]">
                {/* Tanlangan muddat boshqa sahifada bo'lsa ham nomi ko'rinishi uchun */}
                <SelectValue asChild>
                  <span
                    className={
                      !state.selectedDeadlineId ? "text-muted-foreground" : ""
                    }
                  >
                    {state.selectedDeadlineId
                      ? deadlineMetaById[state.selectedDeadlineId] ||
                        `ID: ${state.selectedDeadlineId}`
                      : deadlineLoading
                        ? t("loading")
                        : deadlineError
                          ? t("loading_error")
                          : t("selectDeadline")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {deadlineLoading ? (
                  <div className="p-2 text-center text-muted-foreground text-sm">
                    {t("loading")}
                  </div>
                ) : deadlineError ? (
                  <div className="p-2 text-center text-red-500 text-sm">
                    {t("data_load_error")}
                  </div>
                ) : (deadlineData as any)?.results?.length > 0 ? (
                  <>
                    {(deadlineData as any).results.map((item: Deadline) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {formatDeadlineText(item.submit_at)}
                      </SelectItem>
                    ))}

                    {/* Deadline Pagination Controls */}
                    {(deadlineData as any).count > deadlinePerPage && (
                      <div className="flex items-center justify-between px-2 py-1 border-t">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={state.deadlinePage === 1}
                          onClick={() =>
                            dispatch({
                              type: "SET_DEADLINE_PAGE",
                              payload: Math.max(state.deadlinePage - 1, 1),
                            })
                          }
                        >
                          {t("before")}
                        </Button>
                        <span className="text-xs text-gray-500">
                          {state.deadlinePage} /{" "}
                          {Math.ceil(
                            (deadlineData as any).count / deadlinePerPage,
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            state.deadlinePage >=
                            Math.ceil(
                              (deadlineData as any).count / deadlinePerPage,
                            )
                          }
                          onClick={() =>
                            dispatch({
                              type: "SET_DEADLINE_PAGE",
                              payload: Math.min(
                                state.deadlinePage + 1,
                                Math.ceil(
                                  (deadlineData as any).count / deadlinePerPage,
                                ),
                              ),
                            })
                          }
                        >
                          {t("next")}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-2 text-center text-muted-foreground text-sm">
                    {t("no_deadlines")}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
         {isDaromadReport ? (
           <div>
            <label className="block mb-1 text-lg font-medium">
              Chorakni tanlang
            </label>

            <Select
              value={selectedQuarter}
              onValueChange={(value) => setSelectedQuarter(value)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Chorakni tanlang" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="q1">1-chorak</SelectItem>
                <SelectItem value="q2">2-chorak</SelectItem>
                <SelectItem value="q3">3-chorak</SelectItem>
                <SelectItem value="q4">4-chorak</SelectItem>
              </SelectContent>
            </Select>
          </div> ) : null}
        </div>

        {/* Joriy qadam formula guruhlari */}
        {currentFormGroup && (
          <div className="space-y-6">
            {currentFormGroup.forms.map((form, formIndex) => (
              <div
                key={formIndex}
                className="overflow-x-auto mb-6 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/80 dark:bg-slate-950/80 transition-colors shadow-xs"
              >
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {currentStepTitle} – {formIndex + 1}-{t("formula")}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {state.currentStep + 1} / {totalSteps}
                    </span>
                    {currentFormGroup.forms.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleRemoveForm(state.currentStep, formIndex)
                        }
                      >
                        {t("delete")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Formula bo'yicha o'simlik tanlash */}
                {!isKoChatVaNiholIlova1Step(state.currentStep) && (
                  <div className="mb-4">
                    <label className="block mb-1 text-lg font-medium">
                      {t("select_plant_for_form", { formIndex: formIndex + 1 })}
                    </label>
                    <Select
                      value={form.plantId}
                      onValueChange={(plantId) =>
                        handlePlantChange(state.currentStep, formIndex, plantId)
                      }
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue asChild>
                          <span
                            className={
                              !form.plantId ? "text-muted-foreground" : ""
                            }
                          >
                            {form.plantId
                              ? getPlantLabel(form.plantId)
                              : plantsLoading
                                ? t("loading")
                                : plantsError
                                  ? t("loading_error")
                                  : t("please_select")}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {plantsLoading ? (
                          <div className="p-2 text-center text-muted-foreground text-sm">
                            {t("loading")}
                          </div>
                        ) : plantsError ? (
                          <div className="p-2 text-center text-red-500 text-sm">
                            {t("data_load_error")}
                          </div>
                        ) : (plantsData as any)?.results?.length > 0 ? (
                          <>
                            {(plantsData as any).results.flatMap(
                              (category: Category) => [
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                  disabled
                                  className="font-semibold bg-gray-100 text-gray-500 cursor-not-allowed"
                                >
                                  {category.name}
                                </SelectItem>,
                                ...category.children.map((child: Plant) => {
                                  const isUsed = getUsedPlantIdsForCurrentStep.has(
                                    child.id.toString(),
                                  );
                                  const isCurrentFormPlant =
                                    form.plantId === child.id.toString();

                                  return (
                                    <SelectItem
                                      key={child.id}
                                      value={child.id.toString()}
                                      className="pl-6"
                                      disabled={isUsed && !isCurrentFormPlant}
                                    >
                                      {child.name}
                                      {isUsed &&
                                        !isCurrentFormPlant &&
                                        ` (${t("selected")})`}
                                    </SelectItem>
                                  );
                                }),
                              ],
                            )}

                            {/* Plants Pagination Controls */}
                            {(plantsData as any).count > plantsPerPage && (
                              <div className="flex items-center justify-between px-2 py-1 border-t">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={state.plantsPage === 1}
                                  onClick={() =>
                                    dispatch({
                                      type: "SET_PLANTS_PAGE",
                                      payload: Math.max(
                                        state.plantsPage - 1,
                                        1,
                                      ),
                                    })
                                  }
                                >
                                  {t("before")}
                                </Button>
                                <span className="text-xs text-gray-500">
                                  {state.plantsPage} /{" "}
                                  {Math.ceil(
                                    (plantsData as any).count / plantsPerPage,
                                  )}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    state.plantsPage >=
                                    Math.ceil(
                                      (plantsData as any).count / plantsPerPage,
                                    )
                                  }
                                  onClick={() =>
                                    dispatch({
                                      type: "SET_PLANTS_PAGE",
                                      payload: Math.min(
                                        state.plantsPage + 1,
                                        Math.ceil(
                                          (plantsData as any).count /
                                            plantsPerPage,
                                        ),
                                      ),
                                    })
                                  }
                                >
                                  {t("next")}
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-2 text-center text-muted-foreground text-sm">
                            {t("plant_not_found")}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Table */}
                {currentEmptyColumns.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnName")}</TableHead>
                        <TableHead className="min-w-[300px]">
                          {t("value")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentEmptyColumns.map((col: EmptyColumn) => {
                        const isQuarterEditable =
                          isEditableForSelectedQuarter(col);

                        // Plan ustuni (status_plan != null)
                        if (col.status_plan != null) {
                          const planValue = form.plantId
                            ? planByColumnAndPlant?.[col.id]?.[form.plantId] ||
                              form.values[col.id] ||
                              ""
                            : form.values[col.id] || "";

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
                                  onChange={(e) =>
                                    handleInputChange(
                                      state.currentStep,
                                      formIndex,
                                      col.id,
                                      e.target.value,
                                    )
                                  }
                                  className={planValue ? "bg-green-50" : ""}
                                />
                                {planByColumnAndPlant?.[col.id]?.[
                                  form.plantId
                                ] && (
                                  <div className="text-xs text-green-600 mt-1"></div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        // Tashkilot ustuni (is_organization = true)
                        if (col.is_organization === true) {
                          // Faqat birinchi formulada ko'rinadi
                          if (formIndex !== 0) return null;

                          return (
                            <TableRow key={col.id}>
                              <TableCell className="whitespace-normal break-words">
                                {col.fullParentChain}
                              </TableCell>
                              <TableCell>
                                <select
                                  value={state.selectedOrganizationId}
                                  disabled={!isQuarterEditable}
                                  onChange={(e) => {
                                    dispatch({
                                      type: "SET_ORGANIZATION",
                                      payload: e.target.value,
                                    });
                                    handleInputChange(
                                      state.currentStep,
                                      formIndex,
                                      col.id,
                                      e.target.value,
                                    );
                                  }}
                                  className="w-full border rounded px-2 py-1"
                                  required
                                >
                                  <option value="">{t("please_select")}</option>
                                  {(organizationsData as Organization[])?.map(
                                    (item: Organization) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name}
                                      </option>
                                    ),
                                  )}
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
                                  value={
                                    isQuarterEditable
                                      ? form.values[col.id] || ""
                                      : "0"
                                  }
                                  disabled={!isQuarterEditable}
                                onChange={(e) =>
                                  handleInputChange(
                                    state.currentStep,
                                    formIndex,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                  required={isQuarterEditable}
                                className={
                                  state.formErrors.some((err) =>
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
                ) : (
                  <p>{t("no_columns_in_step")}</p>
                )}
              </div>
            ))}

            {/* Formula qo'shish tugmasi */}
            <div className="flex justify-center my-4">
              <Button
                type="button"
                onClick={() => handleAddForm(state.currentStep)}
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 !text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                + {t("add_new_form")}
              </Button>
            </div>
          </div>
        )}

        {/* Step boshqarish */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                dispatch({
                  type: "SET_CURRENT_STEP",
                  payload: Math.max(state.currentStep - 1, 0),
                })
              }
              disabled={state.currentStep === 0 || isSubmitting}
              className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-sm transition-colors cursor-pointer"
            >
              {t("before")}
            </Button>
            {state.currentStep < totalSteps - 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  dispatch({
                    type: "SET_CURRENT_STEP",
                    payload: Math.min(state.currentStep + 1, totalSteps - 1),
                  })
                }
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                {t("next")}
              </Button>
            )}
          </div>
          {state.currentStep === totalSteps - 1 && (
            <Button type="submit" disabled={isSubmitting} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 !text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer">
              {isSubmitting ? `⏳ ${t("sending")}` : t("submit")}
            </Button>
          )}
        </div>

        {/* Foot note - faqat oxirgi qadamda */}
        {state.currentStep === totalSteps - 1 && (
          <div className="mt-6">
            <label className="block mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100 font-sans">
              {t("note_optional")}
            </label>
            <Textarea
              value={footNote}
              onChange={(e) => setFootNote(e.target.value)}
              placeholder={t("enter_note")}
              className="min-h-[100px] rounded-2xl bg-white dark:!bg-slate-950 border border-slate-200 dark:!border-slate-800 text-slate-800 dark:!text-slate-100 placeholder:text-slate-400 p-4 font-sans text-sm shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              rows={4}
            />
          </div>
        )}

        {/* Tanlangan o'simliklarni ko'rsatish */}
        <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3 font-sans">{t("selected_plants")}</h3>
          {state.formGroups.map((group: FormGroup) =>
            group.forms.map((form, formIndex) => {
              const plantName = form.plantId
                ? getPlantLabel(form.plantId)
                : t("not_selected");
              const plantCategory = form.plantId
                ? getPlantCategory(form.plantId)
                : "";

              return (
                <div
                  key={`${group.step}-${formIndex}`}
                  className="text-sm mb-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-slate-200 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <strong className="font-semibold text-blue-600 dark:text-blue-400">
                      {t("step")} {group.step + 1} {t("form")} {formIndex + 1}:
                    </strong>{" "}
                    <span className="font-medium">{plantName}</span>
                  </div>
                  {plantCategory && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {plantCategory}
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </form>
    </>
  );
}

export default PlantCreate;
