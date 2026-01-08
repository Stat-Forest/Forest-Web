import { useReducer, useEffect, useMemo, useState } from "react";
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
  useUpdateReportMutation,
  useGetReportPlantByIdQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { useNavigate, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { findEmptyChildrenColumnIds } from "@/utils/findEmptyChildrenColumnIds";
import {
  plantCreateReducer,
  plantCreateInitialState,
} from "@/reducers/plantCreateReducer";
import {
  FormGroup,
  EmptyColumn,
} from "@/types/plantCreateTypes";

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
}

// Existing report item structure based on API response
interface ExistingReportItem {
  organization_id: string;
  organization_name: string;
  statement_columns: {
    statement_column_id: string;
    statement_column_name: string;
    inners: {
      id: string;
      plant_id?: string;
      plant_name?: string;
      value: string;
    }[];
  }[];
}

interface ExistingReportResponse {
  id: string;
  organization: string;
  organization_name: string;
  statement: string;
  statement_name: string;
  deadline: string;
  submit_at: string;
  period: string;
  status: string;
  report_items: ExistingReportItem[];
  foot_note: string | null;
}

const EMPTY_TABLE_HEADERS: TableHeaderData[] = [];

// 🔹 Text normalizatsiya funksiyasi
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// 🔹 Value formatting: remove unnecessary decimals (e.g., "40.00" -> "40", "55.50" -> "55.5")
const formatValue = (value: string): string => {
  if (!value || value.trim() === "") return "";
  
  // Try to parse as number
  const num = parseFloat(value);
  if (isNaN(num)) return value; // Return as-is if not a number
  
  // If it's a whole number, return without decimals
  if (num % 1 === 0) {
    return num.toString();
  }
  
  // Otherwise return with decimals but remove trailing zeros
  return num.toString();
};

// 🔹 Column mapping funksiyasi
const findMatchingColumnId = (
  apiColumnName: string,
  formColumns: EmptyColumn[]
): string | null => {
  const normalizedApiName = normalizeText(apiColumnName);

  for (const formCol of formColumns) {
    const formName = formCol.fullParentChain || formCol.title || "";
    const normalizedFormName = normalizeText(formName);

    // 1. To'liq mos kelish
    if (normalizedFormName === normalizedApiName) {
      return formCol.id;
    }

    // 2. Qisman mos kelish
    if (
      normalizedFormName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedFormName)
    ) {
      return formCol.id;
    }

    // 3. Kalit so'zlar bo'yicha qidirish
    const apiKeywords = normalizedApiName.split(' ').filter((k) => k.length > 2);
    const formKeywords = normalizedFormName.split(' ').filter((k) => k.length > 2);

    if (apiKeywords.length > 0 && formKeywords.length > 0) {
      const matchingKeywords = apiKeywords.filter((keyword) =>
        formKeywords.includes(keyword)
      );

      if (
        matchingKeywords.length >=
        Math.min(apiKeywords.length, formKeywords.length) * 0.5
      ) {
        return formCol.id;
      }
    }
  }

  return null;
};


function PlantUpdate() {
  const { id } = useParams<{ id: string }>();
  const [state, dispatch] = useReducer(
    plantCreateReducer,
    plantCreateInitialState
  );

  // 🔹 Cache plant label'larini pagination bo'ylab saqlash
  const [plantMetaById, setPlantMetaById] = useState<
    Record<string, { name: string; categoryName?: string }>
  >({});
  const [footNote, setFootNote] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();
  const reduxDispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  // 🔹 Debug uchun
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // 🔹 Mavjud ma'lumotlarni olish
  // Endpoint: /api/v1/reports/report-plant/{id}/?is_user_input=true
  // Bu endpoint dan statement_column_name va statement_column_id orqali ma'lumotlar olinadi
  // Har bir column ning inners array'i ichida qancha object bo'lsa, shuncha form yaratiladi
  const {
    data: existingReportData,
    isLoading: isReportLoading,
    error: existingDataError,
    refetch: refetchExistingData,
  } = useGetReportPlantByIdQuery(
    id ? { id: String(id), is_user_input: "true" } : skipToken
  );

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
    { skip: !reportIds }
  );

  // 🔹 Plants state with pagination
  // Endpoint: /api/v1/reports/plants/
  // Bu endpoint dan barcha plant'lar olinadi va selected plant'lar belgilanadi
  // Update qilayotganda, backend dan kelgan plant_id'lar selected bo'lib qolishi kerak
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
    { skip: !reportIds }
  );

  // 🔹 PlantsData kelgan sayin plant nomlarini cache'ga qo'shish
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

  // 🔹 Deadline state
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
    },
    { skip: !reportIds }
  );

  const tableHeadersDataMemo = useMemo(
    () => tableHeadersData,
    [tableHeadersData]
  );

  const allEmptyColumnsByStepMemo = useMemo(() => {
    return (tableHeadersDataMemo as TableHeaderData[]).map((obj) =>
      Array.isArray(obj.children)
        ? findEmptyChildrenColumnIds(obj.children)
        : []
    );
  }, [tableHeadersDataMemo]);

  useEffect(() => {
    dispatch({ type: "SET_EMPTY_COLUMNS", payload: allEmptyColumnsByStepMemo });
  }, [allEmptyColumnsByStepMemo]);

  // 🔹 Maxsus: "Ko'chat va Nihol" ilovalari uchun plant select kerak emas
  const isKoChatVaNiholIlova1Step = (stepIndex: number): boolean => {
    const title =
      (tableHeadersData as TableHeaderData[])?.[stepIndex]?.title ?? "";
    if (!title) return false;

    const normalized = title
      .toLowerCase()
      .replace(/[‘'']/g, "'")
      .replace(/\s+/g, " ");

    return (
      normalized.includes("ko'chat") &&
      normalized.includes("nihol") &&
      normalized.includes("ilova")
    );
  };

  // 🔹 BACKEND MA'LUMOTLARNI TO'G'RI QAYTA ISHLASH
  useEffect(() => {
    console.log("DEBUG: existingReportData", existingReportData);
    console.log("DEBUG: tableHeadersData", tableHeadersData);
    console.log("DEBUG: allEmptyColumnsByStepMemo", allEmptyColumnsByStepMemo);

    if (existingReportData && allEmptyColumnsByStepMemo.length > 0 && !isInitialized) {
      try {
        const data = existingReportData as ExistingReportResponse;

        // Debug ma'lumotlarni saqlash
        setDebugInfo({
          reportName: data.statement_name,
          reportId: data.id,
          organization: data.organization,
          organizationName: data.organization_name,
          deadline: data.deadline,
          submitAt: data.submit_at,
          stepsCount: allEmptyColumnsByStepMemo.length,
          reportItemsCount: data.report_items?.length || 0,
          apiColumnsCount: data.report_items?.[0]?.statement_columns?.length || 0,
          formColumnsCount: allEmptyColumnsByStepMemo.flat().length
        });

        console.log("DEBUG: Starting initialization...");

        // 1. Deadline ni o'rnatish
        if (data.deadline) {
          console.log("DEBUG: Setting deadline:", data.deadline);
          dispatch({ type: "SET_DEADLINE", payload: data.deadline });
        }

        // 2. Tashkilot ID ni o'rnatish
        if (data.organization) {
          console.log("DEBUG: Setting organization:", data.organization);
          dispatch({ type: "SET_ORGANIZATION", payload: data.organization });
        }

        // 3. Footnote ni o'rnatish
        if (data.foot_note) {
          console.log("DEBUG: Setting footnote:", data.foot_note);
          setFootNote(data.foot_note);
        }

        // 4. Backend ma'lumotlarini step va formlarga aylantirish
        if (data.report_items && data.report_items.length > 0) {
          const reportItem = data.report_items[0];
          const apiColumns = reportItem.statement_columns;
          const allColumns = allEmptyColumnsByStepMemo.flat();

          console.log("DEBUG: API columns count:", apiColumns.length);

          // Step 1: Create column ID mapping (API column ID -> Form column ID)
          const columnIdMap = new Map<string, string>();
          apiColumns.forEach(apiColumn => {
            const matchingFormColumnId = findMatchingColumnId(
              apiColumn.statement_column_name,
              allColumns
            );
            if (matchingFormColumnId) {
              columnIdMap.set(apiColumn.statement_column_id, matchingFormColumnId);
            } else {
              // Fallback: use API ID directly if no match found
              columnIdMap.set(apiColumn.statement_column_id, apiColumn.statement_column_id);
            }
          });

          // Step 2: Cache all plant names from backend
          apiColumns.forEach(column => {
            column.inners?.forEach((inner: any) => {
              if (inner.plant_id && inner.plant_name) {
                const plantId = String(inner.plant_id);
                const plantName = String(inner.plant_name);
                setPlantMetaById(prev => {
                  if (prev[plantId]?.name === plantName) {
                    return prev;
                  }
                  return {
                    ...prev,
                    [plantId]: {
                      name: plantName,
                      categoryName: prev[plantId]?.categoryName || ""
                    }
                  };
                });
              }
            });
          });

          // Step 3: Har bir step uchun form guruhini yaratish
          const formGroups = allEmptyColumnsByStepMemo.map((stepColumns, stepIndex) => {
            const stepTitle = (tableHeadersData as TableHeaderData[])?.[stepIndex]?.title || "";
            const stepColumnIds = new Set(stepColumns.map(col => col.id));
            const normalizedStepTitle = normalizeText(stepTitle);

            // Find API columns that belong to this step
            // Method 1: By column ID mapping
            let stepApiColumns = apiColumns.filter(apiCol => {
              const formColId = columnIdMap.get(apiCol.statement_column_id);
              return formColId && stepColumnIds.has(formColId);
            });

            // Method 2: If no columns found by mapping, try by step title matching
            if (stepApiColumns.length === 0 && normalizedStepTitle) {
              stepApiColumns = apiColumns.filter(apiCol => {
                const normalizedApiName = normalizeText(apiCol.statement_column_name);
                // Check if API column name contains step title keywords
                if (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("nihol")) {
                  return normalizedApiName.includes("ko'chat") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("nihol");
                } else if (normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("ko'chat")) {
                  return normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("ko'chat");
                } else if (normalizedStepTitle.includes("ko'chat-va-nihol") || (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova"))) {
                  return normalizedApiName.includes("ko'chat-va-nihol") || (normalizedApiName.includes("ko'chat") && normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova"));
                }
                return false;
              });
            }

            console.log(`DEBUG: Step ${stepIndex} - stepTitle: "${stepTitle}", stepApiColumns count: ${stepApiColumns.length}`);

            // Determine form count: use maximum number of inners across all columns in this step
            // Exclude organization name and reja columns from form count calculation
            const nonOrgColumns = stepApiColumns.filter(col => {
              const lowerName = col.statement_column_name.toLowerCase();
              return !lowerName.includes("tashkilot nomi") && 
                     !lowerName.includes("названия регионов") &&
                     !lowerName.includes("reja");
            });

            // Find maximum inners count across all columns in this step
            const maxInnersCount = nonOrgColumns.length > 0
              ? Math.max(...nonOrgColumns.map(col => col.inners?.length || 0), 0)
              : 0;

            let formCount = maxInnersCount;

            // If no forms found, create one empty form
            if (formCount === 0) {
              return {
                step: stepIndex,
                forms: [{ values: {}, plantId: "" }]
              };
            }

            // Find columns with plants for plant ID extraction
            const columnsWithPlants = stepApiColumns.filter(col => {
              const lowerName = col.statement_column_name.toLowerCase();
              return !lowerName.includes("tashkilot nomi") && 
                     !lowerName.includes("названия регионов") &&
                     !lowerName.includes("reja") &&
                     col.inners && col.inners.length > 0 &&
                     col.inners.some((inner: any) => inner.plant_id);
            });

            // Find reference column (column with most inners that has plant_id)
            const referenceColumn = columnsWithPlants.length > 0
              ? columnsWithPlants.reduce((max, col) => 
                  (col.inners?.length || 0) > (max.inners?.length || 0) ? col : max
                )
              : null;

            console.log(`DEBUG: Step ${stepIndex} - Title: ${stepTitle}, FormCount: ${formCount}`);
            console.log(`DEBUG: Step ${stepIndex} - columnsWithPlants count: ${columnsWithPlants.length}`);
            console.log(`DEBUG: Step ${stepIndex} - referenceColumn: ${referenceColumn ? referenceColumn.statement_column_name : 'null'}`);
            if (columnsWithPlants.length > 0) {
              console.log(`DEBUG: Step ${stepIndex} - columnsWithPlants:`, columnsWithPlants.map(col => ({
                name: col.statement_column_name,
                innersCount: col.inners?.length || 0,
                plantIds: col.inners?.map((inner: any) => inner.plant_id).filter(Boolean)
              })));
            }

            const forms: Array<{ plantId: string; values: Record<string, string> }> = [];

            for (let formIndex = 0; formIndex < formCount; formIndex++) {
              const form: { plantId: string; values: Record<string, string> } = {
                plantId: "",
                values: {}
              };

              // Extract plant_id - comprehensive search strategy
              let foundPlantId = false;
              
              // Strategy 1: Try reference column at formIndex
              if (referenceColumn && referenceColumn.inners?.[formIndex]?.plant_id) {
                form.plantId = String(referenceColumn.inners[formIndex].plant_id);
                dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                foundPlantId = true;
                console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via referenceColumn: ${form.plantId}`);
              }
              
              // Strategy 2: Search all columns with plant_id at formIndex
              if (!foundPlantId) {
                // First try columnsWithPlants
                for (const column of columnsWithPlants) {
                  const inner = column.inners?.[formIndex];
                  if (inner?.plant_id) {
                    form.plantId = String(inner.plant_id);
                    dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                    foundPlantId = true;
                    console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 2 (columnsWithPlants): ${form.plantId}`);
                    break;
                  }
                }
                
                // If still not found and columnsWithPlants is empty, search all API columns by step title
                if (!foundPlantId && columnsWithPlants.length === 0 && normalizedStepTitle) {
                  const allStepColumns = apiColumns.filter(apiCol => {
                    const normalizedApiName = normalizeText(apiCol.statement_column_name);
                    if (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("nihol")) {
                      return normalizedApiName.includes("ko'chat") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("nihol");
                    } else if (normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("ko'chat")) {
                      return normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("ko'chat");
                    } else if (normalizedStepTitle.includes("ko'chat-va-nihol") || (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova"))) {
                      return normalizedApiName.includes("ko'chat-va-nihol") || (normalizedApiName.includes("ko'chat") && normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova"));
                    }
                    return false;
                  }).filter(col => {
                    const lowerName = col.statement_column_name.toLowerCase();
                    return !lowerName.includes("tashkilot nomi") && 
                           !lowerName.includes("названия регионов") &&
                           !lowerName.includes("reja") &&
                           col.inners && col.inners.length > 0 &&
                           col.inners.some((inner: any) => inner.plant_id);
                  });
                  
                  for (const column of allStepColumns) {
                    const inner = column.inners?.[formIndex];
                    if (inner?.plant_id) {
                      form.plantId = String(inner.plant_id);
                      dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                      foundPlantId = true;
                      console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 2 (allStepColumns): ${form.plantId}`);
                      break;
                    }
                  }
                }
              }
              
              // Strategy 3: Search all non-org columns at formIndex
              if (!foundPlantId) {
                // First try stepApiColumns
                for (const column of stepApiColumns) {
                  const lowerName = column.statement_column_name.toLowerCase();
                  if (lowerName.includes("tashkilot nomi") || 
                      lowerName.includes("названия регионов") ||
                      lowerName.includes("reja")) {
                    continue;
                  }
                  const inner = column.inners?.[formIndex];
                  if (inner?.plant_id) {
                    form.plantId = String(inner.plant_id);
                    dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                    foundPlantId = true;
                    console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 3 (stepApiColumns): ${form.plantId}`);
                    break;
                  }
                }
                
                // If still not found and stepApiColumns is empty, search all API columns by step title
                if (!foundPlantId && stepApiColumns.length === 0 && normalizedStepTitle) {
                  const allStepColumns = apiColumns.filter(apiCol => {
                    const normalizedApiName = normalizeText(apiCol.statement_column_name);
                    if (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("nihol")) {
                      return normalizedApiName.includes("ko'chat") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("nihol");
                    } else if (normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("ko'chat")) {
                      return normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("ko'chat");
                    } else if (normalizedStepTitle.includes("ko'chat-va-nihol") || (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova"))) {
                      return normalizedApiName.includes("ko'chat-va-nihol") || (normalizedApiName.includes("ko'chat") && normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova"));
                    }
                    return false;
                  });
                  
                  for (const column of allStepColumns) {
                    const lowerName = column.statement_column_name.toLowerCase();
                    if (lowerName.includes("tashkilot nomi") || 
                        lowerName.includes("названия регионов") ||
                        lowerName.includes("reja")) {
                      continue;
                    }
                    const inner = column.inners?.[formIndex];
                    if (inner?.plant_id) {
                      form.plantId = String(inner.plant_id);
                      dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                      foundPlantId = true;
                      console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 3 (allStepColumns): ${form.plantId}`);
                      break;
                    }
                  }
                }
              }
              
              // Strategy 4: For single-form steps, find any inner with plant_id (index-independent)
              if (!foundPlantId && formCount === 1) {
                // First try stepApiColumns
                for (const column of stepApiColumns) {
                  const lowerName = column.statement_column_name.toLowerCase();
                  if (lowerName.includes("tashkilot nomi") || 
                      lowerName.includes("названия регионов") ||
                      lowerName.includes("reja")) {
                    continue;
                  }
                  // Find first inner with plant_id
                  const innerWithPlant = column.inners?.find((inner: any) => inner.plant_id);
                  if (innerWithPlant?.plant_id) {
                    form.plantId = String(innerWithPlant.plant_id);
                    dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                    foundPlantId = true;
                    console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 4 (stepApiColumns): ${form.plantId}`);
                    break;
                  }
                }
                
                // If still not found and stepApiColumns is empty, search all API columns by step title
                if (!foundPlantId && stepApiColumns.length === 0 && normalizedStepTitle) {
                  const allStepColumns = apiColumns.filter(apiCol => {
                    const normalizedApiName = normalizeText(apiCol.statement_column_name);
                    if (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("nihol")) {
                      return normalizedApiName.includes("ko'chat") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("nihol");
                    } else if (normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("ko'chat")) {
                      return normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("ko'chat");
                    } else if (normalizedStepTitle.includes("ko'chat-va-nihol") || (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova"))) {
                      return normalizedApiName.includes("ko'chat-va-nihol") || (normalizedApiName.includes("ko'chat") && normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova"));
                    }
                    return false;
                  });
                  
                  for (const column of allStepColumns) {
                    const lowerName = column.statement_column_name.toLowerCase();
                    if (lowerName.includes("tashkilot nomi") || 
                        lowerName.includes("названия регионов") ||
                        lowerName.includes("reja")) {
                      continue;
                    }
                    const innerWithPlant = column.inners?.find((inner: any) => inner.plant_id);
                    if (innerWithPlant?.plant_id) {
                      form.plantId = String(innerWithPlant.plant_id);
                      dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                      foundPlantId = true;
                      console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 4 (allStepColumns): ${form.plantId}`);
                      break;
                    }
                  }
                }
              }
              
              // Strategy 5: For multi-form steps, try to find unique plant_id for this formIndex
              // by checking if there are multiple unique plant_ids and matching by position
              if (!foundPlantId && formCount > 1) {
                // Collect all unique plant_ids from columns with plants
                const uniquePlantIds = new Set<string>();
                const plantIdByIndex: Record<number, string> = {};
                
                for (const column of columnsWithPlants) {
                  column.inners?.forEach((inner: any, idx: number) => {
                    if (inner?.plant_id) {
                      const pid = String(inner.plant_id);
                      uniquePlantIds.add(pid);
                      if (!plantIdByIndex[idx]) {
                        plantIdByIndex[idx] = pid;
                      }
                    }
                  });
                }
                
                // If we have unique plant_ids matching form count, use index-based mapping
                if (uniquePlantIds.size === formCount && plantIdByIndex[formIndex]) {
                  form.plantId = plantIdByIndex[formIndex];
                  dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                  foundPlantId = true;
                  console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 5: ${form.plantId}`);
                }
              }
              
              // Strategy 6: Final fallback - search ALL API columns by step title and get first plant_id
              if (!foundPlantId && normalizedStepTitle) {
                const allStepColumns = apiColumns.filter(apiCol => {
                  const normalizedApiName = normalizeText(apiCol.statement_column_name);
                  if (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("nihol")) {
                    return normalizedApiName.includes("ko'chat") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("nihol");
                  } else if (normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("ko'chat")) {
                    return normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("ko'chat");
                  } else if (normalizedStepTitle.includes("ko'chat-va-nihol") || (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova"))) {
                    return normalizedApiName.includes("ko'chat-va-nihol") || (normalizedApiName.includes("ko'chat") && normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova"));
                  }
                  return false;
                });
                
                // Find first column with plant_id at formIndex, or any plant_id if formIndex is 0
                for (const column of allStepColumns) {
                  const lowerName = column.statement_column_name.toLowerCase();
                  if (lowerName.includes("tashkilot nomi") || 
                      lowerName.includes("названия регионов") ||
                      lowerName.includes("reja")) {
                    continue;
                  }
                  
                  // Try formIndex first
                  const inner = column.inners?.[formIndex];
                  if (inner?.plant_id) {
                    form.plantId = String(inner.plant_id);
                    dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                    foundPlantId = true;
                    console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 6 (fallback at index): ${form.plantId}`);
                    break;
                  }
                  
                  // If formIndex is 0 and no plant_id found, try any inner
                  if (formIndex === 0) {
                    const innerWithPlant = column.inners?.find((inner: any) => inner.plant_id);
                    if (innerWithPlant?.plant_id) {
                      form.plantId = String(innerWithPlant.plant_id);
                      dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                      foundPlantId = true;
                      console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} - Found plant_id via Strategy 6 (fallback any inner): ${form.plantId}`);
                      break;
                    }
                  }
                }
              }
              
              // Log if plant_id was not found
              if (!foundPlantId) {
                console.warn(`DEBUG: Step ${stepIndex} Form ${formIndex} - Plant_id NOT FOUND after all strategies!`);
                console.warn(`DEBUG: Step title: "${stepTitle}"`);
                console.warn(`DEBUG: stepApiColumns count: ${stepApiColumns.length}`);
                console.warn(`DEBUG: columnsWithPlants count: ${columnsWithPlants.length}`);
                if (columnsWithPlants.length > 0) {
                  console.warn(`DEBUG: Available columns with plants:`, columnsWithPlants.map(col => ({
                    name: col.statement_column_name,
                    inners: col.inners?.map((inner: any, idx: number) => ({
                      index: idx,
                      plant_id: inner.plant_id,
                      plant_name: inner.plant_name
                    }))
                  })));
                }
              }

              // Extract values from all columns for this form index
              stepColumns.forEach((col: EmptyColumn) => {
                const lowerTitle = col.title.toLowerCase();
                // Skip organization and reja columns
                if (lowerTitle.includes("tashkilot nomi") ||
                    lowerTitle.includes("названия регионов") ||
                    lowerTitle.includes("reja")) {
                  return;
                }

                // Find matching API column using column mapping
                let matchingApiColumn = stepApiColumns.find(apiCol => {
                  const formColId = columnIdMap.get(apiCol.statement_column_id);
                  return formColId === col.id;
                });

                // If not found by mapping, try by step title matching
                if (!matchingApiColumn && normalizedStepTitle) {
                  matchingApiColumn = apiColumns.find(apiCol => {
                    const normalizedApiName = normalizeText(apiCol.statement_column_name);
                    const normalizedColName = normalizeText(col.fullParentChain || col.title || "");
                    
                    // Check if this column belongs to current step
                    let belongsToStep = false;
                    if (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("nihol")) {
                      belongsToStep = normalizedApiName.includes("ko'chat") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("nihol");
                    } else if (normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova") && !normalizedStepTitle.includes("ko'chat")) {
                      belongsToStep = normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova") && !normalizedApiName.includes("ko'chat");
                    } else if (normalizedStepTitle.includes("ko'chat-va-nihol") || (normalizedStepTitle.includes("ko'chat") && normalizedStepTitle.includes("nihol") && normalizedStepTitle.includes("ilova"))) {
                      belongsToStep = normalizedApiName.includes("ko'chat-va-nihol") || (normalizedApiName.includes("ko'chat") && normalizedApiName.includes("nihol") && normalizedApiName.includes("ilova"));
                    }
                    
                    if (!belongsToStep) return false;
                    
                    // Check if column names match
                    return normalizedApiName.includes(normalizedColName) || 
                           normalizedColName.includes(normalizedApiName) ||
                           normalizedApiName === normalizedColName;
                  });
                }

                let value = "";
                
                if (matchingApiColumn && matchingApiColumn.inners && matchingApiColumn.inners.length > 0) {
                  // Strategy 1: If column has plant_id AND form has plant_id, find by plant_id match
                  const hasPlantId = matchingApiColumn.inners.some((inner: any) => inner.plant_id);
                  
                  if (hasPlantId && form.plantId) {
                    // Find inner with matching plant_id
                    const innerWithPlant = matchingApiColumn.inners.find(
                      (inner: any) => String(inner.plant_id) === form.plantId
                    );
                    if (innerWithPlant) {
                      value = innerWithPlant.value || "";
                      console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} Column "${col.title}" - Found value by plant_id: ${value}`);
                    } else {
                      // If plant_id doesn't match, try by index
                      if (matchingApiColumn.inners[formIndex]) {
                        value = matchingApiColumn.inners[formIndex].value || "";
                        console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} Column "${col.title}" - Found value by index (plant_id mismatch): ${value}`);
                      }
                    }
                  } else {
                    // Strategy 2: Column doesn't have plant_id OR form doesn't have plant_id, use index-based extraction
                    if (matchingApiColumn.inners[formIndex]) {
                      value = matchingApiColumn.inners[formIndex].value || "";
                      console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} Column "${col.title}" - Found value by index: ${value}`);
                    } else if (matchingApiColumn.inners.length > 0) {
                      // If formIndex is out of bounds, use appropriate inner
                      const lastIndex = matchingApiColumn.inners.length - 1;
                      if (formIndex > lastIndex) {
                        // Use last available inner if formIndex exceeds
                        value = matchingApiColumn.inners[lastIndex].value || "";
                        console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} Column "${col.title}" - Found value by lastIndex (${lastIndex}): ${value}`);
                      } else {
                        // Use first inner as fallback
                        value = matchingApiColumn.inners[0].value || "";
                        console.log(`DEBUG: Step ${stepIndex} Form ${formIndex} Column "${col.title}" - Found value by fallback (first): ${value}`);
                      }
                    }
                  }
                } else {
                  console.warn(`DEBUG: Step ${stepIndex} Form ${formIndex} Column "${col.title}" - No matching API column found!`);
                }
                
                form.values[col.id] = formatValue(value);
              });

              forms.push(form);
            }

            return {
              step: stepIndex,
              forms: forms
            };
          });

          console.log("DEBUG: Created formGroups:", formGroups);
          dispatch({ type: "SET_FORM_GROUPS", payload: formGroups });

          // Plan items ni o'rnatish (reja column lari uchun)
          const rejaColumns = allEmptyColumnsByStepMemo.flat().filter(col =>
            col.title.toLowerCase().includes("reja")
          );

          if (rejaColumns.length > 0) {
            const planItems = rejaColumns.map(col => {
              // Find matching API column using column mapping
              const matchingApiColumn = apiColumns.find(apiCol => {
                const formColId = columnIdMap.get(apiCol.statement_column_id);
                return formColId === col.id;
              });

              const rawPlanValue = matchingApiColumn && matchingApiColumn.inners && matchingApiColumn.inners[0]
                ? matchingApiColumn.inners[0].value || ""
                : "";

              return {
                columnId: col.id,
                fullParentChain: col.fullParentChain || col.title,
                plan_value: formatValue(rawPlanValue)
              };
            });

            console.log("DEBUG: Plan items:", planItems);
            dispatch({ type: "SET_PLAN_ITEMS", payload: planItems });
          }

          // Flag ni o'rnatish
          setIsInitialized(true);
          console.log("DEBUG: Initialization completed successfully!");

        } else {
          console.warn("DEBUG: No report items found, creating empty forms");
          const initialFormGroups = allEmptyColumnsByStepMemo.map(
            (_: any, stepIndex: number) => ({
              step: stepIndex,
              forms: [{ values: {}, plantId: "" }]
            })
          );
          dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });
          setIsInitialized(true);
        }

      } catch (error) {
        console.error("Mavjud ma'lumotlarni yuklashda xatolik:", error);
        toast.error(t("existing_data_load_error"));
        setIsInitialized(true);
      }
    } else if (allEmptyColumnsByStepMemo.length > 0 && !existingReportData && !isInitialized) {
      // Agar mavjud ma'lumotlar bo'lmasa, boshlang'ich form guruhini yaratish
      console.log("DEBUG: No existing data, creating initial forms");
      const initialFormGroups = allEmptyColumnsByStepMemo.map(
        (_: any, stepIndex: number) => ({
          step: stepIndex,
          forms: [{ values: {}, plantId: "" }]
        })
      );
      dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });
      setIsInitialized(true);
    }
  }, [existingReportData, allEmptyColumnsByStepMemo, tableHeadersData, dispatch, t, isInitialized]);

  // 🔹 PLAN MA'LUMOTLARI
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = state.allEmptyColumnsByStep
        .flat()
        .filter((col) => col.title.toLowerCase().includes("reja"));

      if (
        rejaColumns.length === 0 ||
        !reportIds ||
        !state.selectedOrganizationId
      )
        return;

      try {
        const results = await Promise.all(
          rejaColumns.map((col) =>
            reduxDispatch(
              reportApi.endpoints.getPlanItemsReport.initiate({
                organization_id: state.selectedOrganizationId,
                statement_id: reportIds,
                year: "2025",
                column: col.id,
              })
            ).unwrap()
          )
        );

        if (isMounted) {
          const mergedResults = rejaColumns.map((col, idx) => {
            const res = results[idx]?.[0] as any;
            return {
              columnId: col.id,
              fullParentChain: col.fullParentChain,
              plan_value: res?.plan_value?.toString() || "",
            };
          });
          dispatch({ type: "SET_PLAN_ITEMS", payload: mergedResults });
        }
      } catch (error) {
        if (isMounted) {
          console.error("Plan olishda xatolik:", error);
          dispatch({
            type: "ADD_FORM_ERROR",
            payload: t("plan_fetch_error"),
          });
        }
      }
    };

    fetchPlanDataForColumns();
    return () => {
      isMounted = false;
    };
  }, [
    state.allEmptyColumnsByStep,
    state.selectedOrganizationId,
    reportIds,
    reduxDispatch,
  ]);

  const [updateReport, { isLoading: isSubmitting }] =
    useUpdateReportMutation();

  // 🔹 Input o'zgartirish funksiyasi
  const handleInputChange = (
    stepIndex: number,
    formIndex: number,
    id: string,
    value: string
  ) => {
    dispatch({
      type: "UPDATE_FORM_VALUE",
      payload: { stepIndex, formIndex, id, value },
    });
  };

  // 🔹 Plant o'zgartirish funksiyasi
  const handlePlantChange = (
    stepIndex: number,
    formIndex: number,
    plantId: string
  ) => {
    // 1. Eski plant ID ni olib tashlash
    const currentFormGroup = state.formGroups.find((g) => g.step === stepIndex);
    if (currentFormGroup && currentFormGroup.forms[formIndex]?.plantId) {
      const oldPlantId = currentFormGroup.forms[formIndex].plantId;
      if (oldPlantId) {
        dispatch({ type: "REMOVE_USED_PLANT_ID", payload: oldPlantId });
      }
    }

    // 2. Yangi plant ID ni qo'shish
    if (plantId) {
      dispatch({ type: "ADD_USED_PLANT_ID", payload: plantId });

      // 3. Plant nomini darhol cache'ga qo'shish
      if (!plantMetaById[plantId]) {
        const results = (plantsData as any)?.results;
        let foundPlant: Plant | undefined;

        if (Array.isArray(results)) {
          for (const category of results) {
            foundPlant = category?.children?.find(
              (child: Plant) => child.id.toString() === plantId
            );
            if (foundPlant) {
              setPlantMetaById((prev) => ({
                ...prev,
                [plantId]: {
                  name: foundPlant!.name || `ID: ${plantId}`,
                  categoryName: category.name || "",
                },
              }));
              break;
            }
          }
        }

        if (!foundPlant) {
          setPlantMetaById((prev) => ({
            ...prev,
            [plantId]: { name: `ID: ${plantId}`, categoryName: "" },
          }));
        }
      }
    }

    // 4. State ni yangilash
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

  // 🔹 Form qo'shish funksiyasi (faqat joriy step uchun)
  const handleAddForm = (stepIndex: number) => {
    dispatch({ type: "ADD_FORM", payload: stepIndex });
  };

  // 🔹 Form o'chirish funksiyasi (faqat joriy step uchun)
  const handleRemoveForm = (stepIndex: number, formIndex: number) => {
    dispatch({ type: "REMOVE_FORM", payload: { stepIndex, formIndex } });
  };

  // 🔹 Tanlangan barcha plant ID larni hisoblash
  const getAllUsedPlantIds = useMemo(() => {
    const usedIds = new Set<string>();
    state.formGroups.forEach((group) => {
      group.forms.forEach((form) => {
        if (form.plantId) {
          usedIds.add(form.plantId);
        }
      });
    });
    return usedIds;
  }, [state.formGroups]);

  // 🔹 Validation logic
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: "SET_FORM_ERRORS", payload: [] });

    const errors: string[] = [];

    // Deadline tekshiruvi
    if (!state.selectedDeadlineId) {
      errors.push(t("please_select_deadline"));
    }

    // Tashkilot nomi tekshiruvi
    if (
      state.allEmptyColumnsByStep[state.currentStep]?.some(
        (col) =>
          col.title.toLowerCase().includes("tashkilot nomi") ||
          col.title.toLowerCase().includes("Названия регионов")
      ) &&
      !state.selectedOrganizationId
    ) {
      errors.push(t("please_select_organization"));
    }

    // 🔹 Plant duplikatsiyasi va majburiyligini faqat plant-select bor bo'lgan step'lar uchun tekshiramiz
    const plantIds: string[] = [];
    state.formGroups.forEach((group) => {
      const skipPlantForStep = isKoChatVaNiholIlova1Step(group.step);
      if (skipPlantForStep) {
        return;
      }

      group.forms.forEach((form) => {
        if (form.plantId) {
          if (plantIds.includes(form.plantId)) {
            errors.push(t("duplicate_plant"));
          }
          plantIds.push(form.plantId);
        }
      });
    });

    // 🔹 Har bir step va har bir form uchun plant tanlanganligini tekshiramiz
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
            })
          );
        }
      });
    });

    // 🔹 Har bir form uchun majburiy maydonlarni tekshiramiz
    state.formGroups.forEach((group) => {
      group.forms.forEach((form, formIndex) => {
        state.allEmptyColumnsByStep[group.step]?.forEach((col) => {
          if (
            !col.title.toLowerCase().includes("reja") &&
            !col.title.toLowerCase().includes("tashkilot nomi") &&
            !col.title.toLowerCase().includes("Названия регионов") &&
            (!form.values[col.id] ||
              form.values[col.id].toString().trim() === "")
          ) {
            errors.push(
              `${group.step + 1}-qadam ${formIndex + 1}-form uchun "${col.fullParentChain
              }" qiymati kiritish shart`
            );
          }
        });
      });
    });

    if (errors.length > 0) {
      dispatch({ type: "SET_FORM_ERRORS", payload: errors });
      return;
    }

    // 🔹 Backend strukturasiga mos report_items yaratish
    const report_items = state.allEmptyColumnsByStep.flatMap(
      (stepColumns, stepIndex) => {
        const currentFormGroup = state.formGroups.find(
          (group) => group.step === stepIndex
        );

        if (!currentFormGroup) return [];

        return stepColumns.map((col) => {
          const isOrganizationColumn =
            col.title.toLowerCase().includes("tashkilot nomi") ||
            col.title.toLowerCase().includes("Названия регионов");
          const isRejaColumn = col.title.toLowerCase().includes("reja");

          if (isOrganizationColumn) {
            // Tashkilot nomi - faqat bir marta
            return {
              statement_column: col.id,
              inners: [{ value: state.selectedOrganizationId || "" }],
            };
          } else if (isRejaColumn) {
            // 🔹 Reja - HAR BIR FORM UCHUN ALOHIDA (plant yuborilmaydi, faqat value)
            const planItem = state.planItems.find(
              (item) => item.columnId === col.id
            );
            const planValue = planItem ? planItem.plan_value : "";

            const inners = currentFormGroup.forms.map(() => ({
              value: planValue, // Har bir form uchun reja qiymati (plant yo'q)
            }));

            return {
              statement_column: col.id,
              inners,
            };
          } else {
            // 🔹 Boshqa maydonlar - HAR BIR FORM UCHUN ALOHIDA
            const inners = currentFormGroup.forms.map((form) => ({
              ...(form.plantId && { plant: form.plantId }),
              value: form.values[col.id] || "",
            }));

            return {
              statement_column: col.id,
              inners,
            };
          }
        });
      }
    );

    const payload = {
      deadline: state.selectedDeadlineId,
      report_items,
      foot_note: footNote || ""
    };

    if (!id) {
      dispatch({
        type: "ADD_FORM_ERROR",
        payload: "Report ID topilmadi"
      });
      return;
    }

    console.log("DEBUG: Update payload:", payload);

    try {
      await updateReport({ id, ...payload }).unwrap();
      toast.success(t("updated_successfully"));
      navigate(-1);
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        t("submit_error");
      dispatch({ type: "ADD_FORM_ERROR", payload: errorMessage });
      console.error("Yuborishda xatolik:", err);
      toast.error(errorMessage);
    }
  };

  // Yuklash holatini ko'rsatish
  if (isReportLoading || isHeaderLoading || isOrgLoading || deadlineLoading || plantsLoading)
    return (
      <div className="p-4 text-lg flex items-center gap-2">
        <Loader2 className="animate-spin" size={20} />
        {t("loading")}
      </div>
    );

  if (existingDataError)
    return (
      <div className="text-red-500 p-4">
        <p>{t("existing_data_load_error")}</p>
        <p className="text-sm">{String(existingDataError)}</p>
        <Button onClick={() => refetchExistingData()} className="mt-2">
          Qayta urinish
        </Button>
      </div>
    );
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
    `Qadam ${state.currentStep + 1}`;
  const currentFormGroup = state.formGroups.find(
    (group) => group.step === state.currentStep
  );

  // 🔹 Deadline matnini formatlash funksiyasi
  const formatDeadlineText = (submitAt: string) => {
    if (!submitAt) return t("unknown");

    if (submitAt.includes("CHORAK")) {
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

      {/* DEBUG INFO (faqat development uchun) */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="m-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-bold text-yellow-800">Debug Ma'lumotlari:</h3>
          <pre className="text-xs overflow-auto max-h-60">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          <div className="mt-2 text-sm">
            <p>Joriy step: {state.currentStep + 1} / {totalSteps}</p>
            <p>Step title: {currentStepTitle}</p>
            <p>Form guruhlari: {state.formGroups.length}</p>
            <p>Joriy step form'lari: {currentFormGroup?.forms.length || 0}</p>
            <p>Used plants: {getAllUsedPlantIds.size}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`max-w-full m-6 p-6 border rounded-lg shadow space-y-6 bg-ice ${isSubmitting ? "opacity-50 pointer-events-none" : ""
          }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {t("update_report")}
          </h1>
          {id && (
            <div className="text-sm text-gray-500">
              {t("report_id")}: {id}
            </div>
          )}
        </div>

        {state.formErrors.length > 0 && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
            <ul>
              {state.formErrors.map((error: string, idx: number) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-6 items-end">
          {/* ✅ DEADLINE SELECT */}
          <div>
            <label className="block mb-1 text-lg font-medium">
              {t("deadline")}:
            </label>
            <Select
              value={state.selectedDeadlineId}
              onValueChange={(val) =>
                dispatch({ type: "SET_DEADLINE", payload: val })
              }
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue
                  placeholder={
                    deadlineLoading
                      ? "Yuklanmoqda..."
                      : deadlineError
                        ? "Xatolik yuz berdi"
                        : t("selectDeadline")
                  }
                />
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

                    {/* ✅ Deadline Pagination Controls */}
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
                            (deadlineData as any).count / deadlinePerPage
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            state.deadlinePage >=
                            Math.ceil(
                              (deadlineData as any).count / deadlinePerPage
                            )
                          }
                          onClick={() =>
                            dispatch({
                              type: "SET_DEADLINE_PAGE",
                              payload: Math.min(
                                state.deadlinePage + 1,
                                Math.ceil(
                                  (deadlineData as any).count / deadlinePerPage
                                )
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
                    Deadline mavjud emas
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ✅ CURRENT STEP FORM GROUPS */}
        {currentFormGroup && (
          <div className="space-y-6">
            {currentFormGroup.forms.map((form, formIndex) => (
              <div
                key={formIndex}
                className="overflow-x-auto mb-6 border rounded-lg p-4 bg-gray-50"
              >
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {currentStepTitle} – {formIndex + 1}-form
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

                {/* ✅ FORM SPECIFIC PLANT SELECT (maxsus ilova uchun yashiriladi) */}
                {!isKoChatVaNiholIlova1Step(state.currentStep) && (
                  <div className="mb-4">
                    <label className="block mb-1 text-lg font-medium">
                      {formIndex + 1}-form uchun Plant:
                    </label>
                    <Select
                      value={form.plantId}
                      onValueChange={(plantId) =>
                        handlePlantChange(state.currentStep, formIndex, plantId)
                      }
                    >
                      <SelectTrigger className="w-[300px]">
                        {/* SelectValue tanlangan item joriy page'da bo'lmasa label ko'rsatmaydi.
                            Shuning uchun label'ni o'zimiz cache'dan chiqaramiz. */}
                        <SelectValue className="hidden" />
                        <span className={!form.plantId ? "text-muted-foreground" : ""}>
                          {form.plantId
                            ? getPlantLabel(form.plantId)
                            : plantsLoading
                            ? t("loading")
                            : plantsError
                            ? t("loading_error")
                            : t("please_select")}
                        </span>
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
                                  const isUsed = getAllUsedPlantIds.has(
                                    child.id.toString()
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
                              ]
                            )}

                            {/* ✅ Plants Pagination Controls */}
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
                                      payload: Math.max(state.plantsPage - 1, 1),
                                    })
                                  }
                                >
                                  {t("before")}
                                </Button>
                                <span className="text-xs text-gray-500">
                                  {state.plantsPage} /{" "}
                                  {Math.ceil(
                                    (plantsData as any).count / plantsPerPage
                                  )}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    state.plantsPage >=
                                    Math.ceil(
                                      (plantsData as any).count / plantsPerPage
                                    )
                                  }
                                  onClick={() =>
                                    dispatch({
                                      type: "SET_PLANTS_PAGE",
                                      payload: Math.min(
                                        state.plantsPage + 1,
                                        Math.ceil(
                                          (plantsData as any).count /
                                            plantsPerPage
                                        )
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
                            Plant mavjud emas
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ✅ TABLE */}
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
                        const lowerTitle = col.title.toLowerCase();

                        if (lowerTitle.includes("reja")) {
                          const planItem = state.planItems.find(
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
                          // ❗ faqat birinchi formda ko'rinadi
                          if (formIndex !== 0) return null;
                          return (
                            <TableRow key={col.id}>
                              <TableCell className="whitespace-normal break-words">
                                {col.fullParentChain}
                              </TableCell>
                              <TableCell>
                                <select
                                  value={state.selectedOrganizationId}
                                  onChange={(e) => {
                                    dispatch({
                                      type: "SET_ORGANIZATION",
                                      payload: e.target.value,
                                    });
                                    handleInputChange(
                                      state.currentStep,
                                      formIndex,
                                      col.id,
                                      e.target.value
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
                                    )
                                  )}
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
                                value={form.values[col.id] || ""}
                                onChange={(e) =>
                                  handleInputChange(
                                    state.currentStep,
                                    formIndex,
                                    col.id,
                                    e.target.value
                                  )
                                }
                                required
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p>Ushbu qadamda to'ldirish uchun ustunlar yo'q.</p>
                )}
              </div>
            ))}

            {/* ✅ ADD FORM BUTTON (faqat joriy step uchun) */}
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => handleAddForm(state.currentStep)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t("add_new_form")}
              </Button>
            </div>
          </div>
        )}

        {/* ✅ STEP BOSHQARISH */}
        <div className="flex justify-between items-center pt-4">
          <div className="space-x-2">
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
              >
                {t("next")}
              </Button>
            )}
          </div>
          {state.currentStep === totalSteps - 1 && (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting
                ? `⏳ ${t("sending")}`
                : t("update")
              }
            </Button>
          )}
        </div>

        {/* ✅ FOOT NOTE TEXTAREA - Faqat oxirgi qadamda */}
        {state.currentStep === totalSteps - 1 && (
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

        {/* ✅ TANLANGAN PLANT LARNI KO'RSATISH */}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">{t("selected_plants")}</h3>
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
                  className="text-sm mb-1 p-2 bg-white rounded border"
                >
                  <strong>
                    {t("step")} {group.step + 1} {t("form")} {formIndex + 1}:
                  </strong>{" "}
                  {plantName}
                  {plantCategory && (
                    <span className="text-gray-500 ml-2">
                      ({plantCategory})
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </form>
    </>
  );
}

export default PlantUpdate;