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
import { removeCookie } from "@/utils/cookie";
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
import { ChevronLeft } from "lucide-react";
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

const EMPTY_TABLE_HEADERS: TableHeaderData[] = [];

function PlantUpdate() {
  const { id } = useParams();
  const [state, dispatch] = useReducer(
    plantCreateReducer,
    plantCreateInitialState
  );

  // mavjud plant reportni olish
  const {
    data: existingReport,
    isLoading: isReportLoading,
    error: reportError,
  } = useGetReportPlantByIdQuery(
    id ? { id: String(id) } : skipToken
  );

  // 🔹 Cache plant label'larini pagination bo'ylab saqlash (Radix Select tanlangan value item ro'yxatida bo'lmasa label ko'rsatmaydi)
  const [plantMetaById, setPlantMetaById] = useState<
    Record<string, { name: string; categoryName?: string }>
  >({});
  const [footNote, setFootNote] = useState<string>("");

  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();
  const reduxDispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

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

  // 🔹 PlantsData kelgan sayin plant nomlarini cache'ga qo'shib boramiz (pagination almashganda ham tanlanganlar ko'rinib turadi)
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
          // Agar allaqachon mavjud bo'lsa va faqat temporary name bo'lsa (ID: xxx), uni to'liq ma'lumot bilan almashtiramiz
          // Yoki agar name o'zgargan bo'lsa, yangilaymiz
          if (
            !existing ||
            (existing.name === `ID: ${id}` && name !== `ID: ${id}`) ||
            (existing.name !== name) ||
            (existing.categoryName !== categoryName)
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

    // 🔹 Har bir step uchun boshlang'ich form guruhini yaratish yoki existingReport dan to'ldirish
    if (allEmptyColumnsByStepMemo.length > 0 && !existingReport) {
      const initialFormGroups = allEmptyColumnsByStepMemo.map(
        (_: any, stepIndex: number) => ({
          step: stepIndex,
          forms: [{ values: {}, plantId: "" }], // Har bir stepda boshlang'ich 1 forma
        })
      );
      dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });
    }
  }, [allEmptyColumnsByStepMemo, existingReport]);

  // mavjud reportdan formGroups ni to'ldirish
  useEffect(() => {
    if (existingReport?.report_items && allEmptyColumnsByStepMemo.length > 0) {
      // report_items strukturasidan formGroups ni yaratish
      const formGroupsMap: Record<number, any[]> = {};
      const plantIdsFromReport: Set<string> = new Set();
      const plantMetaMap: Record<string, { name: string; categoryName?: string }> = {};
      
      // Plant report struktura ikkala variantni ham qo'llab-quvvatlash:
      // 1. { report_items: [{ statement_column: string, inners: Array }] }
      // 2. { report_items: [{ statement_columns: Array<{ statement_column_id: string, inners: Array }> }] }
      
      // Helper function: inners ni qayta ishlash
      function processInners(
        inners: any[],
        stepIndex: number,
        columnId: string,
        formGroupsMap: Record<number, any[]>,
        plantIdsFromReport: Set<string>,
        plantMetaMap: Record<string, { name: string; categoryName?: string }>,
        allEmptyColumnsByStepMemo: { id: string; title: string; fullParentChain: string }[][]
      ) {
        const col = allEmptyColumnsByStepMemo[stepIndex]?.find(
          (c) => c.id === columnId
        );
        const isOrganizationColumn = col && (
          col.title.toLowerCase().includes("tashkilot nomi") ||
          col.title.toLowerCase().includes("Названия регионов")
        );
        const isRejaColumn = col && col.title.toLowerCase().includes("reja");
        
        inners.forEach((inner: any, innerIndex: number) => {
          if (!formGroupsMap[stepIndex]) {
            formGroupsMap[stepIndex] = [];
          }
          
          // Form yaratish (agar mavjud bo'lmasa)
          if (!formGroupsMap[stepIndex][innerIndex]) {
            formGroupsMap[stepIndex][innerIndex] = {
              values: {},
              plantId: "",
            };
          }
          
          // Plant ID ni o'rnatish (faqat plant column uchun, reja va tashkilot uchun emas)
          if (!isOrganizationColumn && !isRejaColumn && inner.plant) {
            const plantId = inner.plant.toString();
            if (!formGroupsMap[stepIndex][innerIndex].plantId) {
              formGroupsMap[stepIndex][innerIndex].plantId = plantId;
              plantIdsFromReport.add(plantId);
              
              // Plant nomini cache'ga qo'shamiz (agar plant_name kelgan bo'lsa yoki keyinroq to'ldiramiz)
              if (inner.plant_name) {
                plantMetaMap[plantId] = {
                  name: inner.plant_name,
                  categoryName: inner.plant_category_name || undefined,
                };
              } else {
                // Agar plant_name kelmagan bo'lsa, faqat ID ni saqlaymiz
                // Keyin plantsData kelganda uni to'ldiramiz
                plantMetaMap[plantId] = {
                  name: `ID: ${plantId}`, // Temporary name
                  categoryName: undefined,
                };
              }
            }
          }
          
          // Value ni qo'shish (reja va tashkilot columnlar uchun ham)
          if (col && !isRejaColumn) {
            formGroupsMap[stepIndex][innerIndex].values[columnId] =
              inner.value || "";
          }
        });
      }
      
      existingReport.report_items.forEach((reportItem: any) => {
        // Variant 1: To'g'ridan-to'g'ri statement_column va inners
        if (reportItem.statement_column && reportItem.inners) {
          const columnId = reportItem.statement_column;
          const stepIndex = allEmptyColumnsByStepMemo.findIndex((stepCols) =>
            stepCols.some((col) => col.id === columnId)
          );
          
          if (stepIndex >= 0) {
            const inners = reportItem.inners || [];
            processInners(inners, stepIndex, columnId, formGroupsMap, plantIdsFromReport, plantMetaMap, allEmptyColumnsByStepMemo);
          }
        }
        // Variant 2: statement_columns array
        else if (reportItem.statement_columns) {
          reportItem.statement_columns.forEach((col: any) => {
            const columnId = col.statement_column_id || col.id;
            const stepIndex = allEmptyColumnsByStepMemo.findIndex((stepCols) =>
              stepCols.some((c) => c.id === columnId)
            );
            
            if (stepIndex >= 0 && col.inners) {
              processInners(col.inners, stepIndex, columnId, formGroupsMap, plantIdsFromReport, plantMetaMap, allEmptyColumnsByStepMemo);
            }
          });
        }
      });

      // Plant ID larni plantMetaById ga qo'shish (plant_name kelgan bo'lsa to'liq, kelmagan bo'lsa temporary name bilan)
      // Keyin plantsData kelganda temporary namelar to'ldiriladi
      if (Object.keys(plantMetaMap).length > 0) {
        setPlantMetaById((prev) => ({ ...prev, ...plantMetaMap }));
      }

      // Plant ID larni usedPlantIds ga qo'shish
      plantIdsFromReport.forEach((plantId) => {
        if (plantId) {
          dispatch({ type: "ADD_USED_PLANT_ID", payload: plantId });
        }
      });

      // FormGroups ni yaratish
      const initialFormGroups = allEmptyColumnsByStepMemo.map(
        (_: any, stepIndex: number) => ({
          step: stepIndex,
          forms: formGroupsMap[stepIndex]?.length > 0
            ? formGroupsMap[stepIndex]
            : [{ values: {}, plantId: "" }],
        })
      );

      dispatch({ type: "SET_FORM_GROUPS", payload: initialFormGroups });

      // Deadline va tashkilot ID ni o'rnatish
      if (existingReport.deadline) {
        dispatch({ type: "SET_DEADLINE", payload: existingReport.deadline });
      }

      // Tashkilot ID ni topish
      let orgValue = "";
      for (const reportItem of existingReport.report_items) {
        // Variant 1: To'g'ridan-to'g'ri statement_column
        if (reportItem.statement_column) {
          const col = allEmptyColumnsByStepMemo
            .flat()
            .find((c) => c.id === reportItem.statement_column);
          if (
            col &&
            (col.title.toLowerCase().includes("tashkilot nomi") ||
              col.title.toLowerCase().includes("Названия регионов"))
          ) {
            orgValue = reportItem.inners?.[0]?.value || "";
            break;
          }
        }
        // Variant 2: statement_columns array
        if (reportItem.statement_columns) {
          for (const col of reportItem.statement_columns) {
            const columnId = col.statement_column_id || col.id;
            const colDef = allEmptyColumnsByStepMemo
              .flat()
              .find((c) => c.id === columnId);
            if (
              colDef &&
              (colDef.title.toLowerCase().includes("tashkilot nomi") ||
                colDef.title.toLowerCase().includes("Названия регионов"))
            ) {
              orgValue = col.inners?.[0]?.value || "";
              break;
            }
          }
          if (orgValue) break;
        }
      }
      if (orgValue) {
        dispatch({
          type: "SET_ORGANIZATION",
          payload: orgValue,
        });
      }

      // Foot note ni o'rnatish
      if (existingReport.foot_note) {
        setFootNote(existingReport.foot_note);
      }
    }
  }, [existingReport, allEmptyColumnsByStepMemo, dispatch]);

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
    // Yangi plant ID ni qo'shamiz
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

    // 🔹 Plant duplikatsiyasini tekshirish
    const plantIds: string[] = [];
    state.formGroups.forEach((group) => {
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
              `${t("step")} ${group.step + 1} ${t("form")} ${formIndex + 1} uchun "${col.fullParentChain}" qiymati kiritish shart`
            );
          }
        });
      });
    });

    if (errors.length > 0) {
      dispatch({ type: "SET_FORM_ERRORS", payload: errors });
      return;
    }

    // 🔹 Backend strukturasiga mos report_items yaratish - HAR BIR FORM UCHUN ALOHIDA
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
      id: id,
      deadline: state.selectedDeadlineId, 
      report_items,
      foot_note: footNote || "",
    };

    try {
      await updateReport(payload).unwrap();
      removeCookie("reportId");
      navigate(-1);
      toast.success(t("updated_successfully"));
      dispatch({ type: "SET_FORM_ERRORS", payload: [] });
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        t("update_error");
      dispatch({ type: "ADD_FORM_ERROR", payload: errorMessage });
      console.error("Yangilashda xatolik:", err);
      toast.error(errorMessage);
    }
  };

  if (
    isHeaderLoading ||
    isOrgLoading ||
    deadlineLoading ||
    plantsLoading ||
    isReportLoading
  )
    return <p className="p-4 text-lg">{t("loading")}</p>;
  if (headersError || orgError || deadlineError || plantsError || reportError)
    return (
      <div className="text-red-500 p-4">
        <p>{t("loading_error")}</p>
        <p className="text-sm">
          {String(
            deadlineError ||
              headersError ||
              orgError ||
              plantsError ||
              reportError
          )}
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
                      ? t("loading")
                      : deadlineError
                      ? t("loading_error")
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
                        O'chirish
                      </Button>
                    )}
                  </div>
                </div>

                {/* ✅ FORM SPECIFIC PLANT SELECT */}
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
                          ? "Yuklanmoqda..."
                          : plantsError
                          ? "Xatolik yuz berdi"
                          : "Tanlang"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {plantsLoading ? (
                        <div className="p-2 text-center text-muted-foreground text-sm">
                          Yuklanmoqda...
                        </div>
                      ) : plantsError ? (
                        <div className="p-2 text-center text-red-500 text-sm">
                          Ma'lumotlarni yuklashda xatolik
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
                </div>

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
                                  <option value="">Tanlang</option>
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
                  <p>{t("no_columns_to_fill")}</p>
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
                + Yangi Form Qo'shish
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
              {isSubmitting ? `⏳ ${t("updating")}` : t("update")}
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
