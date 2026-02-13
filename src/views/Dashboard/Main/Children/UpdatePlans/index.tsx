import { useReducer, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetPlanByIdQuery,
  useGetPlanColumnsReportQuery,
  useUpdatePlanMutation,
  useGetPlantsReportQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  updatePlansReducer,
  updatePlansInitialState,
} from "@/reducers/formReducer";

function UpdatePlans() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(
    updatePlansReducer,
    updatePlansInitialState
  );
  const { t } = useTranslation();

  const lang = useSelector((state: RootState) => state.language.lang);

  // Plant state for "Daromad 1" statement
  const [selectedPlants, setSelectedPlants] = useState<
    Array<{
      plantId: string;
      plantName: string;
      values: Record<string, string>;
    }>
  >([{ plantId: "", plantName: "", values: {} }]);
  const [plantsPage, setPlantsPage] = useState(1);
  const [plantSearchTerm, setPlantSearchTerm] = useState("");

  // 🔹 Cache plant label'larini pagination bo'ylab saqlash
  const [plantMetaById, setPlantMetaById] = useState<
    Record<string, { name: string; categoryName?: string }>
  >({});

  // ==== Queries & Mutations ====
  const { data: organization } = useGetOrganizationReportsQuery({ lang });
  const { data: existingPlan, isLoading: isPlanLoading } = useGetPlanByIdQuery(
    id ? id : skipToken
  );
  const { data: statementsData } = useGetStatementsReportQuery({ lang });

  // Helper function to check if string is UUID format
  const isUUID = (str: string | null | undefined): boolean => {
    if (!str || typeof str !== "string") return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Get statement ID from existingPlan or state (only UUID format)
  // Priority: existingPlan.statement_id > state.statement > other fields
  const statementId = useMemo(() => {
    // First priority: existingPlan.statement_id (most reliable)
    if (existingPlan?.statement_id) {
      const stmtId = String(existingPlan.statement_id);
      if (isUUID(stmtId)) {
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Using existingPlan.statement_id as statementId:", stmtId);
        }
        return stmtId;
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️ existingPlan.statement_id is not UUID:", stmtId);
        }
      }
    }
    
    // Second priority: state.statement (from useEffect)
    // Handle both string and object formats
    if (state.statement) {
      let stmtId: string | null = null;
      
      // If state.statement is an object, try to get id from it
      if (typeof state.statement === "object" && state.statement !== null) {
        const stmtObj = state.statement as any;
        if (stmtObj.id) {
          stmtId = String(stmtObj.id);
        } else if (stmtObj.statement_id) {
          stmtId = String(stmtObj.statement_id);
        } else {
          if (process.env.NODE_ENV === "development") {
            console.warn("⚠️ state.statement is object but no id found:", state.statement);
          }
        }
      } else if (typeof state.statement === "string") {
        stmtId = state.statement;
      }
      
      if (stmtId && isUUID(stmtId)) {
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Using state.statement as statementId:", stmtId);
        }
        return stmtId;
      } else if (stmtId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️ state.statement is not UUID:", stmtId);
        }
      }
    }
    
    // Third priority: Look up statement ID from statements API if statement is a name (e.g., "Daromad 1")
    if (existingPlan?.statement && typeof existingPlan.statement === "string" && !isUUID(existingPlan.statement)) {
      // Search in statements API for matching name
      if (statementsData) {
        for (const parent of statementsData) {
          if (parent.children && Array.isArray(parent.children)) {
            const found = parent.children.find(
              (child: any) => child.name === existingPlan.statement
            );
            if (found && found.id && isUUID(found.id)) {
              if (process.env.NODE_ENV === "development") {
                console.log("✅ Found statement ID from statements API:", found.id, "for name:", existingPlan.statement);
              }
              return found.id;
            }
          }
        }
      }
    }
    
    // Fourth priority: other existingPlan fields
    if (existingPlan) {
      // Try statementId (camelCase)
      if (existingPlan.statementId) {
        const stmtId = String(existingPlan.statementId);
        if (isUUID(stmtId)) {
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Using existingPlan.statementId as statementId:", stmtId);
          }
          return stmtId;
        }
      }
      // Try statement.id if statement is an object
      if (existingPlan.statement && typeof existingPlan.statement === "object" && existingPlan.statement !== null) {
        const stmtObj = existingPlan.statement as any;
        if (stmtObj.id && isUUID(String(stmtObj.id))) {
          const stmtId = String(stmtObj.id);
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Using existingPlan.statement.id as statementId:", stmtId);
          }
          return stmtId;
        }
      }
      
      if (process.env.NODE_ENV === "development") {
        console.error("❌ No valid UUID found for statementId. Available fields:", {
          statement_id: existingPlan.statement_id,
          statement_id_type: typeof existingPlan.statement_id,
          statementId: existingPlan.statementId,
          statement: existingPlan.statement,
          statement_type: typeof existingPlan.statement,
          state_statement: state.statement,
          state_statement_type: typeof state.statement,
        });
      }
    }
    
    if (process.env.NODE_ENV === "development") {
      console.error("❌ statementId is empty. existingPlan:", existingPlan, "state.statement:", state.statement);
    }
    return "";
  }, [state.statement, existingPlan, statementsData]);

  const {
    data: plan_cols_raw,
    isLoading: plan_cols_loading,
    error: plan_cols_error,
  } = useGetPlanColumnsReportQuery(
    statementId ? { search: statementId } : skipToken
  );

  // Normalize plan_cols - handle both array and object with results property
  const plan_cols = useMemo(() => {
    if (!plan_cols_raw) return [];
    if (Array.isArray(plan_cols_raw)) return plan_cols_raw;
    if (plan_cols_raw.results && Array.isArray(plan_cols_raw.results)) {
      return plan_cols_raw.results;
    }
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ plan_cols_raw is not in expected format:", plan_cols_raw);
    }
    return [];
  }, [plan_cols_raw]);

  // Separate columns: "Daromad 1" vs others
  const { daromad1Columns, otherColumns, isDaromad1 } = useMemo(() => {
    const daromad1: any[] = [];
    const others: any[] = [];

    (plan_cols as any[]).forEach((col: any) => {
      const columnName = (
        col.name ||
        col.parent ||
        col.column_name ||
        col.title ||
        ""
      ).toLowerCase();

      if (columnName.includes("daromad")) {
        daromad1.push(col);
      } else {
        others.push(col);
      }
    });

    return {
      daromad1Columns: daromad1,
      otherColumns: others,
      isDaromad1: daromad1.length > 0,
    };
  }, [plan_cols]);

  // Get plants data - always fetch (statement not required)
  const plantsPerPage = 50;
  const {
    data: plantsData,
    isLoading: plantsLoading,
    error: plantsError,
  } = useGetPlantsReportQuery({
    lang,
    parent: "",
    page: plantsPage,
    perPage: plantsPerPage,
  });

  // 🔹 PlantsData kelgan sayin plant nomlarini cache'ga qo'shib boramiz
  useEffect(() => {
    const results = (plantsData as any)?.results;
    if (!Array.isArray(results) || results.length === 0) return;

    setPlantMetaById((prev) => {
      let changed = false;
      const next = { ...prev };
      results.forEach((category: any) => {
        const categoryName = category?.name || "";
        (category?.children || []).forEach((child: any) => {
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

  // Helper functions for plant labels
  const getPlantLabel = (plantId: string) => {
    if (!plantId) return "";
    return plantMetaById[plantId]?.name || `ID: ${plantId}`;
  };

  // Get all used plant IDs
  const getAllUsedPlantIds = useMemo(() => {
    const usedIds = new Set<string>();
    selectedPlants.forEach((plant) => {
      if (plant.plantId) {
        usedIds.add(plant.plantId);
      }
    });
    return usedIds;
  }, [selectedPlants]);

  // Filter plants by search term
  const allPlants = useMemo(() => {
    const results = (plantsData as any)?.results || [];
    return results.flatMap((category: any) =>
      (category?.children || []).map((child: any) => ({
        id: child.id.toString(),
        name: child.name,
        categoryName: category.name,
      }))
    );
  }, [plantsData]);

  const filteredPlants = useMemo(() => {
    if (!plantSearchTerm) return allPlants;
    const search = plantSearchTerm.toLowerCase();
    return allPlants.filter(
      (p: { id: string; name: string; categoryName?: string }) =>
        p.name.toLowerCase().includes(search) ||
        p.categoryName?.toLowerCase().includes(search)
    );
  }, [allPlants, plantSearchTerm]);

  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();

  // ==== Fill initial data when editing ====
  useEffect(() => {
    if (existingPlan && plan_cols.length > 0) {
      // Debug: log existingPlan structure
      if (process.env.NODE_ENV === "development") {
        console.log("existingPlan:", existingPlan);
        console.log("existingPlan.statement_id:", existingPlan.statement_id);
        console.log("existingPlan.statement:", existingPlan.statement);
        console.log("existingPlan.statementId:", existingPlan.statementId);
        console.log("isUUID(existingPlan.statement_id):", isUUID(existingPlan.statement_id));
        console.log("isUUID(existingPlan.statement):", isUUID(existingPlan.statement));
        console.log("existingPlan keys:", Object.keys(existingPlan));
      }
      
      const initialValues: Record<string, string> = {};
      
      // Separate plan_items (for other columns) and plant_plans (for "Daromad 1")
      // API returns plant_plans, not plants
      if (existingPlan.plant_plans && Array.isArray(existingPlan.plant_plans) && existingPlan.plant_plans.length > 0) {
        // Bu "Daromad 1" rejasi (o'simliklar bilan)
        // API column ID laridan formula column ID lariga mapping yaratish
        // API column_id ishlatadi, formula id ishlatadi
        const columnIdMap = new Map<string, string>();
        const columnNameMap = new Map<string, string>(); // Map by column name as fallback
        
        plan_cols.forEach((col: any) => {
          // Map by column_id if it exists, otherwise use id directly
          if (col.column_id) {
            columnIdMap.set(col.column_id, col.id);
          }
          // Also map id to id (in case API uses id directly)
          columnIdMap.set(col.id, col.id);
          
          // Map by column name for fallback matching
          const colName = (col.name || col.parent || col.title || "").toLowerCase().trim();
          if (colName) {
            columnNameMap.set(colName, col.id);
          }
        });

        const plantsData = existingPlan.plant_plans.map((plant: any) => {
          const plantValues: Record<string, string> = {};
          if (plant.items && Array.isArray(plant.items)) {
            plant.items.forEach((item: any) => {
              // Get API column ID
              const apiColumnId = item.column_id || item.column;
              let formColumnId: string | undefined;
              
              if (apiColumnId) {
                // First try: direct ID mapping
                formColumnId = columnIdMap.get(apiColumnId);
                
                // Second try: if not found, try to find by column name (if item has column_name)
                if (!formColumnId && item.column_name) {
                  const normalizedApiName = item.column_name.toLowerCase().trim();
                  formColumnId = columnNameMap.get(normalizedApiName);
                  
                  // Also try partial matching
                  if (!formColumnId) {
                    for (const [colName, colId] of columnNameMap.entries()) {
                      if (normalizedApiName.includes(colName) || colName.includes(normalizedApiName)) {
                        formColumnId = colId;
                        break;
                      }
                    }
                  }
                }
                
                // Fallback: use API column ID directly
                if (!formColumnId) {
                  formColumnId = apiColumnId;
                }
                
                if (formColumnId) {
                  plantValues[formColumnId] = String(item.plan_value ?? "");
                  
                  if (process.env.NODE_ENV === "development") {
                    console.log(`DEBUG: Mapping plant value - API column: ${apiColumnId}, Form column: ${formColumnId}, Value: ${item.plan_value}`);
                  }
                } else {
                  if (process.env.NODE_ENV === "development") {
                    console.warn(`DEBUG: Could not map plant value - API column: ${apiColumnId}, Available form columns:`, plan_cols.map((c: any) => ({ id: c.id, column_id: c.column_id, name: c.name || c.parent || c.title })));
                  }
                }
              }
            });
          }
          return {
            plantId: plant.plant || plant.plant_id || "",
            plantName: plant.plant_name || "",
            values: plantValues,
          };
        });
        setSelectedPlants(plantsData.length > 0 ? plantsData : [{ plantId: "", plantName: "", values: {} }]);
        
        // Fill other columns from plan_items
        if (existingPlan.plan_items && Array.isArray(existingPlan.plan_items)) {
          existingPlan.plan_items.forEach((item: any) => {
            const apiColumnId = item.column_id || item.column;
            let formColumnId: string | undefined;
            
            if (apiColumnId) {
              // First try: direct ID mapping
              formColumnId = columnIdMap.get(apiColumnId);
              
              // Second try: if not found, try to find by column name (if item has column_name)
              if (!formColumnId && item.column_name) {
                const normalizedApiName = item.column_name.toLowerCase().trim();
                formColumnId = columnNameMap.get(normalizedApiName);
                
                // Also try partial matching
                if (!formColumnId) {
                  for (const [colName, colId] of columnNameMap.entries()) {
                    if (normalizedApiName.includes(colName) || colName.includes(normalizedApiName)) {
                      formColumnId = colId;
                      break;
                    }
                  }
                }
              }
              
              // Fallback: use API column ID directly
              if (!formColumnId) {
                formColumnId = apiColumnId;
              }
              
              if (formColumnId) {
                initialValues[formColumnId] = String(item.plan_value ?? "");
                
                if (process.env.NODE_ENV === "development") {
                  console.log(`DEBUG: Mapping plan_item value - API column: ${apiColumnId}, Form column: ${formColumnId}, Value: ${item.plan_value}`);
                }
              }
            }
          });
        }
      } else {
        // Oddiy reja (o'simliksiz)
        // API column ID laridan formula column ID lariga mapping yaratish
        const columnIdMap = new Map<string, string>();
        const columnNameMap = new Map<string, string>(); // Map by column name as fallback
        
        plan_cols.forEach((col: any) => {
          if (col.column_id) {
            columnIdMap.set(col.column_id, col.id);
          }
          columnIdMap.set(col.id, col.id);
          
          // Map by column name for fallback matching
          const colName = (col.name || col.parent || col.title || "").toLowerCase().trim();
          if (colName) {
            columnNameMap.set(colName, col.id);
          }
        });

        if (existingPlan.plan_items && Array.isArray(existingPlan.plan_items)) {
      existingPlan.plan_items.forEach((item: any) => {
            const apiColumnId = item.column_id || item.column;
            let formColumnId: string | undefined;
            
            if (apiColumnId) {
              // First try: direct ID mapping
              formColumnId = columnIdMap.get(apiColumnId);
              
              // Second try: if not found, try to find by column name (if item has column_name)
              if (!formColumnId && item.column_name) {
                const normalizedApiName = item.column_name.toLowerCase().trim();
                formColumnId = columnNameMap.get(normalizedApiName);
                
                // Also try partial matching
                if (!formColumnId) {
                  for (const [colName, colId] of columnNameMap.entries()) {
                    if (normalizedApiName.includes(colName) || colName.includes(normalizedApiName)) {
                      formColumnId = colId;
                      break;
                    }
                  }
                }
              }
              
              // Fallback: use API column ID directly
              if (!formColumnId) {
                formColumnId = apiColumnId;
              }
              
              if (formColumnId) {
                initialValues[formColumnId] = String(item.plan_value ?? "");
                
                if (process.env.NODE_ENV === "development") {
                  console.log(`DEBUG: Mapping regular plan_item value - API column: ${apiColumnId}, Form column: ${formColumnId}, Value: ${item.plan_value}`);
                }
              }
            }
          });
        }
        setSelectedPlants([{ plantId: "", plantName: "", values: {} }]);
      }
      
      // Get statement ID - try statement_id first, then statement.id if statement is object
      let statementIdForState: string | null = null;
      if (existingPlan.statement_id) {
        statementIdForState = String(existingPlan.statement_id);
      } else if (existingPlan.statement && typeof existingPlan.statement === "object" && existingPlan.statement !== null) {
        const stmtObj = existingPlan.statement as any;
        if (stmtObj.id) {
          statementIdForState = String(stmtObj.id);
        }
      }
      
      dispatch({
        type: "INIT_FORM",
        payload: {
          selectedOrg: existingPlan.organization_id ?? null,
          statement: statementIdForState ?? null,
          year: existingPlan.year ?? 2025,
          values: initialValues,
          season: existingPlan.season ?? "",
        },
      });
    }
  }, [existingPlan, plan_cols]);

  // Filter organizations for search
  const filteredOrganizations = organization?.filter((item: any) =>
    item.name.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  // Find selected organization object
  const selectedOrgData = organization?.find(
    (org: any) => org.id === state.selectedOrg
  );

  const handleChange = (columnId: string, value: string) => {
    dispatch({ type: "SET_VALUE", payload: { columnId, value } });
  };

  // Handle plant value change for "Daromad 1"
  const handlePlantValueChange = (
    plantIndex: number,
    columnId: string,
    value: string
  ) => {
    setSelectedPlants((prev) =>
      prev.map((plant, idx) =>
        idx === plantIndex
          ? { ...plant, values: { ...plant.values, [columnId]: value } }
          : plant
      )
    );
  };

  // Handle plant selection
  const handlePlantSelect = (plantIndex: number, plantId: string) => {
    const plantName = getPlantLabel(plantId);
    setSelectedPlants((prev) =>
      prev.map((plant, idx) =>
        idx === plantIndex
          ? {
              ...plant,
              plantId,
              plantName,
            }
          : plant
      )
    );
  };

  // Add new plant
  const handleAddPlant = () => {
    setSelectedPlants((prev) => [
      ...prev,
      { plantId: "", plantName: "", values: {} },
    ]);
  };

  // Remove plant
  const handleRemovePlant = (index: number) => {
    setSelectedPlants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.selectedOrg || !state.statement || !state.year) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    // Validation for "Daromad 1"
    if (isDaromad1) {
      // Check if all plants are selected
      if (selectedPlants.some((p: { plantId: string; plantName: string; values: Record<string, string> }) => !p.plantId)) {
        alert("Barcha plantlar tanlanishi kerak!");
        return;
      }

      // Check if all plant values are filled (only for "Daromad 1" columns)
      for (const plant of selectedPlants) {
        for (const col of daromad1Columns) {
          if (!plant.values[col.id] || plant.values[col.id] === "") {
            alert(
              `Plant "${plant.plantName || getPlantLabel(plant.plantId)}" uchun "Daromad 1" ustunidagi barcha qiymatlar to'ldirilishi kerak!`
            );
            return;
          }
        }
      }

      // Check if other columns are filled
      for (const col of otherColumns) {
        if (!state.values[col.id] || state.values[col.id] === "") {
          alert(
            `"${col.parent || col.name}" ustunidagi qiymat to'ldirilishi kerak!`
          );
          return;
        }
      }
    } else {
      // Regular validation for other statements
      if (Object.values(state.values).some((val) => val === "")) {
        alert("Barcha qiymatlar to'ldirilishi kerak!");
        return;
      }
    }

    const payload: any = {
      organization: state.selectedOrg,
      year: state.year,
      season: state.season,
    };

    if (isDaromad1) {
      // For "Daromad 1" - include plants array
      payload.plants = selectedPlants.map((plant) => ({
        plant: plant.plantId,
        items: daromad1Columns.map((col: any) => ({
          column: col.id,
          plan_value: parseFloat(plant.values[col.id] || "0") || 0,
        })),
      }));
      payload.plan_items = otherColumns.map((col: any) => ({
        column: col.id,
        plan_value: parseFloat(state.values[col.id] || "0") || 0,
      }));
    } else {
      // Regular plan_items for other statements
      payload.plan_items = Object.entries(state.values).map(
      ([column, plan_value]) => ({
        column,
        plan_value: Number(plan_value),
      })
    );
    }

    try {
      await updatePlan({ id: id!, data: payload }).unwrap();
      toast.success("Hisobot muvaffaqiyatli yangilandi!");
      navigate("/main");
    } catch (error) {
      console.error("Saqlashda xatolik:", error);
      toast.error("Xatolik yuz berdi!");
    }
  };

  return (
    <div className="px-5 py-5 w-full mb-30 bg-ice">
      <h1 className="text-2xl font-bold mb-5">Rejani Yangilash</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
        {isPlanLoading ? (
          <div className="text-center py-4">Ma'lumot yuklanmoqda...</div>
        ) : (
          <>
            {/* ORGANIZATION */}
            <div className="w-full">
              <Label className="pb-1.5 text-md block">Organizatsiya</Label>
              <Select
                value={state.selectedOrg ?? ""}
                onValueChange={(value) =>
                  dispatch({ type: "SET_SELECTED_ORG", payload: value })
                }
              >
                <SelectTrigger className="w-full min-h-[45px]">
                  <SelectValue placeholder="Tanlang">
                    {selectedOrgData ? selectedOrgData.name : "Tanlang"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Izlash..."
                      value={state.searchTerm}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_SEARCH_TERM",
                          payload: e.target.value,
                        })
                      }
                      className="w-full mb-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {filteredOrganizations?.map((item: any) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {existingPlan?.organization && (
              <span className="text-md text-silver">
                {existingPlan.organization}
              </span>
              )}
            </div>

            {/* YEAR */}
            <div className="w-full">
              <Label className="pb-1.5 text-md">Yil</Label>
              <Input
                type="number"
                value={state.year}
                onChange={(e) =>
                  dispatch({
                    type: "SET_YEAR",
                    payload: Number(e.target.value),
                  })
                }
              />
            </div>
            {(state.statement == "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
              state.statement == "671577ba-6a86-4619-b31c-86fff20ad305") && (
              <div className="w-full">
                <Label>{t("season")}</Label>
                <Select
                  value={state.season ?? ""}
                  onValueChange={(value) =>
                    dispatch({
                      type: "SET_SEASON",
                      payload: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full min-h-[45px]">
                    <SelectValue placeholder="Mavsumni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">Bahor</SelectItem>
                    <SelectItem value="autumn">Kuz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* STATEMENT (read-only) */}
            <div className="w-full">
              <Label className="pb-1.5 text-md block">{`${t(
                "reportType"
              )}`}</Label>
              <Input
                value={existingPlan?.statement || ""}
                readOnly
                className="w-full min-h-[45px] bg-gray-100"
              />
            </div>

            {/* REJA USTUNLARI */}
            {plan_cols_loading ? (
              <div className="text-center py-4">Ustunlar yuklanmoqda...</div>
            ) : plan_cols_error ? (
              <div className="text-center py-4 text-red-500">
                <p>Ustunlarni yuklashda xatolik yuz berdi</p>
                {process.env.NODE_ENV === "development" && (
                  <p className="text-xs mt-2 text-left">
                    Statement ID (UUID): {statementId || "N/A"}
                    <br />
                    State Statement: {state.statement || "N/A"}
                    <br />
                    Mavjud reja Statement ID: {existingPlan?.statement_id || "N/A"}
                    <br />
                    Mavjud reja Statement: {existingPlan?.statement || "N/A"}
                    <br />
                    Error: {JSON.stringify(plan_cols_error)}
                  </p>
                )}
              </div>
            ) : plan_cols.length > 0 ? (
              <>
                {isDaromad1 ? (
                  // O'simlik asosidagi formula "Daromad 1" uchun
                  <div className="w-full space-y-4">
                    {selectedPlants.map((plant, plantIndex) => (
                      <div
                        key={plantIndex}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-lg font-semibold">
                            Plant {plantIndex + 1}
                          </Label>
                          {selectedPlants.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemovePlant(plantIndex)}
                            >
                              O'chirish
                            </Button>
                          )}
                        </div>

                        {/* Plant Selection */}
                        <div className="w-full mb-4">
                          <label className="block mb-1 text-lg font-medium">
                            {plantIndex + 1}-plant uchun Plant:
                          </label>
                          <Select
                            value={plant.plantId}
                            onValueChange={(value) =>
                              handlePlantSelect(plantIndex, value)
                            }
                          >
                            <SelectTrigger className="w-[300px]">
                              {/* SelectValue tanlangan item joriy page'da bo'lmasa label ko'rsatmaydi.
                                  Shuning uchun label'ni o'zimiz cache'dan chiqaramiz. */}
                              <SelectValue asChild>
                                <span
                                  className={
                                    !plant.plantId ? "text-muted-foreground" : ""
                                  }
                                >
                                  {plant.plantId
                                    ? getPlantLabel(plant.plantId)
                                    : plantsLoading
                                    ? t("loading")
                                    : plantsError
                                    ? t("error_occurred")
                                    : "Plant tanlang"}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Izlash..."
                                  value={plantSearchTerm}
                                  onChange={(e) =>
                                    setPlantSearchTerm(e.target.value)
                                  }
                                  className="w-full mb-2"
                                />
                              </div>
                              {plantsLoading ? (
                                <div className="text-center text-sm py-2">
                                  {t("loading")}...
                                </div>
                              ) : plantsError ? (
                                <div className="text-center text-sm text-red-500 py-2">
                                  Xatolik: {plantsError?.toString() || t("error_occurred")}
                                </div>
                              ) : filteredPlants.length > 0 ? (
                                filteredPlants.map((p: { id: string; name: string; categoryName?: string }) => (
                                  <SelectItem
                                    key={p.id}
                                    value={p.id}
                                    disabled={
                                      getAllUsedPlantIds.has(p.id) &&
                                      p.id !== plant.plantId
                                    }
                                  >
                                    {p.categoryName
                                      ? `${p.categoryName} - ${p.name}`
                                      : p.name}
                                  </SelectItem>
                                ))
                              ) : allPlants.length > 0 ? (
                                <>
                                  {plantSearchTerm && (
                                    <div className="text-center text-sm text-gray-500 py-2">
                                      Qidiruv natijasi topilmadi
                                    </div>
                                  )}
                                  {allPlants.map((p: { id: string; name: string; categoryName?: string }) => (
                                    <SelectItem
                                      key={p.id}
                                      value={p.id}
                                      disabled={
                                        getAllUsedPlantIds.has(p.id) &&
                                        p.id !== plant.plantId
                                      }
                                    >
                                      {p.categoryName
                                        ? `${p.categoryName} - ${p.name}`
                                        : p.name}
                                    </SelectItem>
                                  ))}
                                </>
                              ) : (
                                <div className="text-center text-sm text-gray-500 py-2">
                                  Plantlar topilmadi.
                                </div>
                              )}
                              {(plantsData as any)?.count > plantsPerPage && (
                                <div className="flex items-center justify-between px-2 py-1 border-t">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={plantsPage === 1}
                                    onClick={() =>
                                      setPlantsPage(Math.max(plantsPage - 1, 1))
                                    }
                                  >
                                    {t("before")}
                                  </Button>
                                  <span className="text-xs text-gray-500">
                                    {plantsPage} /{" "}
                                    {Math.ceil(
                                      (plantsData as any).count / plantsPerPage
                                    )}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                      plantsPage >=
                                      Math.ceil(
                                        (plantsData as any).count / plantsPerPage
                                      )
                                    }
                                    onClick={() =>
                                      setPlantsPage(
                                        Math.min(
                                          plantsPage + 1,
                                          Math.ceil(
                                            (plantsData as any).count /
                                              plantsPerPage
                                          )
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

                        {/* Plant Values - Only "Daromad 1" columns */}
                        <div className="w-full overflow-x-auto">
                          {daromad1Columns.length > 0 ? (
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
                                {daromad1Columns.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium whitespace-normal break-words">
                                      {item.parent || item.name}
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={plant.values[item.id] || ""}
                                        onChange={(e) =>
                                          handlePlantValueChange(
                                            plantIndex,
                                            item.id,
                                            e.target.value
                                          )
                                        }
                                        placeholder="Qiymatni kiriting"
                                        disabled={!plant.plantId}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center text-sm text-gray-500 py-4">
                              "Daromad 1" ustunlari topilmadi.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Plant Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddPlant}
                      className="w-full"
                    >
                      + Plant qo'shish
                    </Button>
                  </div>
                ) : (
                  // Oddiy formula boshqa statementlar uchun
              <div className="w-full overflow-x-auto">
                <h2 className="text-xl font-semibold my-4">Reja qiymatlari</h2>
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
                    {plan_cols.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-normal break-words">
                          {item.parent}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={state.values[item.id] || ""}
                            onChange={(e) =>
                              handleChange(item.id, e.target.value)
                            }
                            placeholder="Qiymatni kiriting"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
                )}

                {/* Other columns table (for "Daromad 1" statement) */}
                {isDaromad1 && otherColumns.length > 0 && (
                  <div className="w-full mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      Qolgan ustunlar
                    </h3>
                    <div className="w-full overflow-x-auto">
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
                          {otherColumns.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium whitespace-normal break-words">
                                {item.parent || item.name}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={state.values[item.id] || ""}
                                  onChange={(e) =>
                                    handleChange(item.id, e.target.value)
                                  }
                                  placeholder="Qiymatni kiriting"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>Ustunlar topilmadi</p>
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs mt-2 text-left bg-gray-100 p-3 rounded max-w-2xl mx-auto">
                    <p><strong>Statement ID (UUID):</strong> {statementId || "N/A"}</p>
                    <p><strong>State Statement:</strong> {state.statement || "N/A"} ({typeof state.statement})</p>
                    <p><strong>Mavjud reja Statement ID:</strong> {existingPlan?.statement_id || "N/A"} ({typeof existingPlan?.statement_id})</p>
                    <p><strong>Mavjud reja Statement:</strong> {typeof existingPlan?.statement === "object" ? JSON.stringify(existingPlan?.statement) : existingPlan?.statement || "N/A"}</p>
                    <p><strong>Reja ustunlari (raw):</strong> {plan_cols_raw ? (Array.isArray(plan_cols_raw) ? `Array(${plan_cols_raw.length})` : typeof plan_cols_raw) : "N/A"}</p>
                    <p><strong>Reja ustunlari soni:</strong> {plan_cols.length}</p>
                    <p><strong>Is Loading:</strong> {plan_cols_loading ? "Yes" : "No"}</p>
                    <p><strong>Has Error:</strong> {plan_cols_error ? "Yes" : "No"}</p>
                    {plan_cols_error && (
                      <p><strong>Error:</strong> {JSON.stringify(plan_cols_error)}</p>
                    )}
                    {plan_cols_raw && !Array.isArray(plan_cols_raw) && (
                      <p><strong>Reja ustunlari kalitlari:</strong> {Object.keys(plan_cols_raw).join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUBMIT */}
            {plan_cols.length > 0 && !plan_cols_loading && (
              <div className="flex gap-3 mt-5">
                {isDaromad1 ? (
                  // For "Daromad 1" - check if at least one plant is selected
                  selectedPlants.some((p: { plantId: string; plantName: string; values: Record<string, string> }) => p.plantId) ? (
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="min-h-[40px] min-w-[130px] bg-[#3B82F6] text-md flex items-center gap-2"
                    >
                      {isUpdating && <Loader2 className="animate-spin w-4 h-4" />}
                      Yangilash
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Kamida bitta plant tanlanishi kerak
                    </div>
                  )
                ) : (
                  // For other statements
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="min-h-[40px] min-w-[130px] bg-[#3B82F6] text-md flex items-center gap-2"
                >
                  {isUpdating && <Loader2 className="animate-spin w-4 h-4" />}
                    Yangilash
                </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/main")}
                  className="min-h-[40px] min-w-[130px] text-md"
                >
                  Bekor qilish
                </Button>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}

export default UpdatePlans;
