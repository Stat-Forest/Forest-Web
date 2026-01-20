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

// Component for fetching and displaying o'simlik plan data for "Daromad 1" columns
function PlantColumnRow({
  plantId,
  formIndex,
  stepIndex,
  column,
  organizationId,
  statementId,
  year,
  value,
  onValueChange,
}: {
  plantId: string;
  formIndex: number;
  stepIndex: number;
  column: EmptyColumn;
  organizationId: string;
  statementId: string;
  year: string;
  value: string;
  onValueChange: (stepIndex: number, formIndex: number, id: string, value: string) => void;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedValue, setFetchedValue] = useState<string | null>(null);

  // Fetch plan data when o'simlik is selected
  useEffect(() => {
    if (!plantId || !organizationId || !statementId || !year || value) {
      return; // Skip if already has value or missing required params
    }

    setIsLoading(true);
    reduxDispatch(
      reportApi.endpoints.getPlanItemsReport.initiate({
        organization_id: organizationId,
        statement_id: statementId,
        year: year,
        column: column.id,
        plant_id: plantId,
      })
    )
      .unwrap()
      .then((result: any) => {
        if (result && result.length > 0) {
          const planItem = result[0];
          if (planItem?.plan_value !== undefined) {
            const planValue = planItem.plan_value.toString();
            setFetchedValue(planValue);
            onValueChange(stepIndex, formIndex, column.id, planValue);
          }
        }
        setIsLoading(false);
      })
      .catch((error: any) => {
        console.error(
          `O'simlik ${plantId} uchun column ${column.id} ma'lumot olishda xatolik:`,
          error
        );
        setIsLoading(false);
      });
  }, [plantId, organizationId, statementId, year, column.id, value, stepIndex, formIndex, onValueChange, reduxDispatch]);

  const displayValue = value || fetchedValue || "";

  return (
    <TableRow>
      <TableCell className="whitespace-normal break-words">
        {column.fullParentChain}
      </TableCell>
      <TableCell>
        <Input
          type="text"
          value={displayValue}
          onChange={(e) => onValueChange(stepIndex, formIndex, column.id, e.target.value)}
          placeholder={isLoading ? "Yuklanmoqda..." : "Qiymat kiriting"}
          disabled={isLoading}
          required
        />
      </TableCell>
    </TableRow>
  );
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatValue = (value: string): string => {
  if (!value || value.trim() === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num % 1 === 0) {
    return num.toString();
  }
  return num.toString();
};

const findMatchingColumnId = (
  apiColumnName: string,
  formColumns: EmptyColumn[]
): string | null => {
  const normalizedApiName = normalizeText(apiColumnName);

  for (const formCol of formColumns) {
    const formName = formCol.fullParentChain || formCol.title || "";
    const normalizedFormName = normalizeText(formName);

    if (normalizedFormName === normalizedApiName) {
      return formCol.id;
    }

    if (
      normalizedFormName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedFormName)
    ) {
      return formCol.id;
    }

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

  // 🔹 Cache o'simlik label'larini pagination bo'ylab saqlash
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

  // 🔹 Mavjud report ma'lumotlarini olish
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

  // 🔹 PlantsData kelgan sayin o'simlik nomlarini cache'ga qo'shib boramiz
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
      is_new_deadline:"true"
    },
    { skip: !reportIds }
  );

  const tableHeadersDataMemo = useMemo(
    () => tableHeadersData,
    [tableHeadersData]
  );

  // 🔹 Maxsus: "Ko'chat va Nihol" ilovalari uchun (Ko'chat-va-Nihol-ilova) o'simlik tanlash kerak emas
  const isKoChatVaNiholIlova1Step = (stepIndex: number): boolean => {
    const title =
      (tableHeadersData as TableHeaderData[])?.[stepIndex]?.title ?? "";
    if (!title) return false;

    const normalized = title
      .toLowerCase()
      .replace(/[''']/g, "'")
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
        : []
    );
  }, [tableHeadersDataMemo]);

  useEffect(() => {
    dispatch({ type: "SET_EMPTY_COLUMNS", payload: allEmptyColumnsByStepMemo });
  }, [allEmptyColumnsByStepMemo]);

  // 🔹 Mavjud ma'lumotlarni yuklash va formulani to'ldirish
  useEffect(() => {
    if (existingReportData && allEmptyColumnsByStepMemo.length > 0 && !isInitialized) {
      try {
        const data = existingReportData as ExistingReportResponse;
        if (data.deadline) dispatch({ type: "SET_DEADLINE", payload: data.deadline });
        if (data.organization) dispatch({ type: "SET_ORGANIZATION", payload: data.organization });
        if (data.foot_note) setFootNote(data.foot_note);

        if (data.report_items && data.report_items.length > 0) {
          const reportItem = data.report_items[0];
          const apiColumns = reportItem.statement_columns;
          const allColumns = allEmptyColumnsByStepMemo.flat();

          // Column mapping
          const columnIdMap = new Map<string, string>();
          const plantMetaMap: Record<string, { name: string; categoryName?: string }> = {};
          
          apiColumns.forEach(apiColumn => {
            const formColId = findMatchingColumnId(apiColumn.statement_column_name, allColumns) || apiColumn.statement_column_id;
            columnIdMap.set(apiColumn.statement_column_id, formColId);
            
            apiColumn.inners?.forEach((inner: any) => {
              if (inner.plant_id && inner.plant_name && !plantMetaMap[String(inner.plant_id)]) {
                plantMetaMap[String(inner.plant_id)] = { name: String(inner.plant_name), categoryName: "" };
              }
            });
          });
          
          if (Object.keys(plantMetaMap).length > 0) {
            setPlantMetaById(prev => ({ ...prev, ...plantMetaMap }));
          }

          // Formula guruhlarini yaratish
          const formGroups = allEmptyColumnsByStepMemo.map((stepColumns, stepIndex) => {
            const stepColumnIds = new Set(stepColumns.map(col => col.id));
            const stepApiColumns = apiColumns.filter(apiCol => {
              const formColId = columnIdMap.get(apiCol.statement_column_id);
              return formColId && stepColumnIds.has(formColId);
            });

            // Har bir column'dan maximum inner sonini topish
            const maxInnerCount = Math.max(...stepApiColumns.map(col => col.inners?.length || 0), 0);
            if (maxInnerCount === 0) {
              return { step: stepIndex, forms: [{ values: {}, plantId: "" }] };
            }

            // Har bir inner index uchun formula yaratish
            const forms: Array<{ plantId: string; values: Record<string, string> }> = [];
            
            for (let innerIndex = 0; innerIndex < maxInnerCount; innerIndex++) {
              const form: { plantId: string; values: Record<string, string> } = {
                plantId: "",
                values: {}
              };

              // Har bir column'dan shu index'dagi inner'ni olish
              stepApiColumns.forEach(apiCol => {
                const formColId = columnIdMap.get(apiCol.statement_column_id) || apiCol.statement_column_id;
                const lowerName = apiCol.statement_column_name.toLowerCase();
                const isOrgOrReja = lowerName.includes("tashkilot nomi") || lowerName.includes("названия регионов") || lowerName.includes("reja");
                
                if (isOrgOrReja) return;

                const inner = apiCol.inners?.[innerIndex];
                if (inner) {
                  // O'simlik ID ni olish (faqat birinchi marta topilganda)
                  if (inner.plant_id && !form.plantId) {
                    form.plantId = String(inner.plant_id);
                    dispatch({ type: "ADD_USED_PLANT_ID", payload: form.plantId });
                  }
                  
                  // Value ni olish
                  if (inner.value !== undefined && inner.value !== null) {
                    form.values[formColId] = formatValue(String(inner.value));
                  }
                }
              });

              // Step columns uchun value'larni to'ldirish
              stepColumns.forEach((col: EmptyColumn) => {
                const lowerTitle = col.title.toLowerCase();
                if (lowerTitle.includes("tashkilot nomi") || lowerTitle.includes("названия регионов") || lowerTitle.includes("reja")) {
                  return;
                }
                if (!form.values[col.id]) {
                  form.values[col.id] = "";
                }
              });

              forms.push(form);
            }

            return { step: stepIndex, forms: forms.length > 0 ? forms : [{ values: {}, plantId: "" }] };
          });

          dispatch({ type: "SET_FORM_GROUPS", payload: formGroups });

          // Plan items
          const rejaColumns = allEmptyColumnsByStepMemo.flat().filter(col => col.title.toLowerCase().includes("reja"));
          if (rejaColumns.length > 0) {
            const planItems = rejaColumns.map(col => {
              const apiCol = apiColumns.find(ac => columnIdMap.get(ac.statement_column_id) === col.id);
              return {
                columnId: col.id,
                fullParentChain: col.fullParentChain || col.title,
                plan_value: formatValue(apiCol?.inners?.[0]?.value || "")
              };
            });
            dispatch({ type: "SET_PLAN_ITEMS", payload: planItems });
          }
          setIsInitialized(true);
        } else {
          const initialFormGroups = allEmptyColumnsByStepMemo.map((_, stepIndex) => ({
            step: stepIndex,
            forms: [{ values: {}, plantId: "" }]
          }));
          dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Mavjud ma'lumotlarni yuklashda xatolik:", error);
        toast.error(t("existing_data_load_error"));
        setIsInitialized(true);
      }
    } else if (allEmptyColumnsByStepMemo.length > 0 && !existingReportData && !isInitialized) {
      const initialFormGroups = allEmptyColumnsByStepMemo.map((_, stepIndex) => ({
        step: stepIndex,
        forms: [{ values: {}, plantId: "" }]
      }));
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

  // 🔹 O'simlik o'zgartirish funksiyasi
  const handlePlantChange = (
    stepIndex: number,
    formIndex: number,
    plantId: string
  ) => {
    // 1. Eski o'simlik ID ni olib tashlash
    const currentFormGroup = state.formGroups.find((g) => g.step === stepIndex);
    if (currentFormGroup && currentFormGroup.forms[formIndex]?.plantId) {
      const oldPlantId = currentFormGroup.forms[formIndex].plantId;
      if (oldPlantId) {
        dispatch({ type: "REMOVE_USED_PLANT_ID", payload: oldPlantId });
      }
    }

    // 2. Yangi o'simlik ID ni qo'shish
    if (plantId) {
      dispatch({ type: "ADD_USED_PLANT_ID", payload: plantId });

      // 3. O'simlik nomini darhol cache'ga qo'shish
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

  // 🔹 Formula qo'shish funksiyasi (faqat joriy step uchun)
  const handleAddForm = (stepIndex: number) => {
    dispatch({ type: "ADD_FORM", payload: stepIndex });
  };

  // 🔹 Formula o'chirish funksiyasi (faqat joriy step uchun)
  const handleRemoveForm = (stepIndex: number, formIndex: number) => {
    dispatch({ type: "REMOVE_FORM", payload: { stepIndex, formIndex } });
  };

  // 🔹 Tanlangan barcha o'simlik ID larni hisoblash
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

    // 🔹 O'simlik duplikatsiyasi va majburiyligini faqat o'simlik tanlash bor bo'lgan step'lar uchun tekshiramiz
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

    // 🔹 Har bir step va har bir formula uchun o'simlik tanlanganligini tekshiramiz
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

    // 🔹 Har bir formula uchun majburiy maydonlarni tekshiramiz
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
              `${group.step + 1}-qadam ${formIndex + 1}-formula uchun "${
                col.fullParentChain
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

    // 🔹 Backend strukturasiga mos report_items yaratish - HAR BIR FORMULA UCHUN ALOHIDA
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
            // 🔹 Reja - HAR BIR FORMULA UCHUN ALOHIDA (o'simlik yuborilmaydi, faqat value)
            const planItem = state.planItems.find(
              (item) => item.columnId === col.id
            );
            const planValue = planItem ? planItem.plan_value : "";

            const inners = currentFormGroup.forms.map(() => ({
              value: planValue, // Har bir formula uchun reja qiymati (o'simlik yo'q)
            }));

            return {
              statement_column: col.id,
              inners,
            };
          } else {
            // 🔹 Boshqa maydonlar - HAR BIR FORMULA UCHUN ALOHIDA
            // 🔹 Maxsus: "Ko'chat va Nihol" ilovalari uchun (Ko'chat-va-Nihol-ilova) o'simlik o'rniga null yuboriladi
            const isKoChatVaNiholStep = isKoChatVaNiholIlova1Step(stepIndex);
            const inners = currentFormGroup.forms.map((form) => {
              if (isKoChatVaNiholStep) {
                // "Ko'chat va Nihol" ilovasi uchun o'simlik o'rniga null yuborish
                return {
                  plant: null,
                  value: form.values[col.id] || "",
                };
              } else {
                // Boshqa ilovalar uchun o'simlik ID yuborish (agar mavjud bo'lsa)
                return {
                  ...(form.plantId && { plant: form.plantId }),
                  value: form.values[col.id] || "",
                };
              }
            });

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
      <form
        onSubmit={handleSubmit}
        className={`max-w-full m-6 p-6 border rounded-lg shadow space-y-6 bg-ice ${
          isSubmitting ? "opacity-50 pointer-events-none" : ""
        }`}
      >
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

        {/* ✅ JORIY QADAM FORMULA GURUHLARI */}
        {currentFormGroup && (
          <div className="space-y-6">
            {currentFormGroup.forms.map((form, formIndex) => (
              <div
                key={formIndex}
                className="overflow-x-auto mb-6 border rounded-lg p-4 bg-gray-50"
              >
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {currentStepTitle} – {formIndex + 1}-formula
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

                {/* ✅ FORMULA BO'YICHA O'SIMLIK TANLASH (maxsus ilova uchun yashiriladi) */}
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
                          <span className={!form.plantId ? "text-muted-foreground" : ""}>
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
                            {t("plant_not_found")}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {/* ✅ O'simlik nomi select ostida */}
                    {form.plantId && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">{t("plant_name")}: </span>
                        <span>{getPlantLabel(form.plantId)}</span>
                      </div>
                    )}
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
                        const isDaromad1Column = lowerTitle.includes("daromad 1") || lowerTitle.includes("daromad1");

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

                        // 🔹 "DAROMAD 1" COLUMN UCHUN PLANT BILAN MA'LUMOT OLISH
                        if (isDaromad1Column && form.plantId) {
                          return (
                            <PlantColumnRow
                              key={col.id}
                              plantId={form.plantId}
                              formIndex={formIndex}
                              stepIndex={state.currentStep}
                              column={col}
                              organizationId={state.selectedOrganizationId || ""}
                              statementId={reportIds || ""}
                              year="2025"
                              value={form.values[col.id] || ""}
                              onValueChange={handleInputChange}
                            />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? `⏳ ${t("sending")}` : t("update")}
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

