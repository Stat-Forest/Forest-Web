import { useReducer, useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import {
  usePlanCreateMutation,
  useGetPlanColumnsReportQuery,
  useGetStatementsReportQuery,
  useGetPlantsReportQuery,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2 } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  createReportReducer,
  createReportInitialState,
} from "@/reducers/formReducer";

function CreateReport() {
  const [state, dispatch] = useReducer(
    createReportReducer,
    createReportInitialState
  );
  const [createReport, { isLoading: isSubmitting }] = usePlanCreateMutation();
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();

  const { t } = useTranslation();

  // Plant state for "Daromad 1" statement
  const [selectedPlants, setSelectedPlants] = useState<
    Array<{
      plantId: string;
      plantName: string;
      values: Record<string, string>;
    }>
  >([{ plantId: "", plantName: "", values: {} }]);
  const [plantsPage, setPlantsPage] = useState(1);

  // 🔹 Cache plant label'larini pagination bo'ylab saqlash (Radix Select tanlangan value item ro'yxatida bo'lmasa label ko'rsatmaydi)
  const [plantMetaById, setPlantMetaById] = useState<
    Record<string, { name: string; categoryName?: string }>
  >({});

  const {
    data: organization,
    isLoading: organization_loading,
    error: organization_error,
  } = useGetOrganizationReportsQuery({ lang });

  const {
    data: statment,
    isLoading: statment_loading,
    error: statment_error,
  } = useGetStatementsReportQuery({ lang });

  const {
    data: plan_cols = [],
    isLoading: plan_cols_loading,
    error: plan_cols_error,
  } = useGetPlanColumnsReportQuery(
    state.statement ? { search: state.statement } : skipToken
  );

  // Separate columns: "Daromad 1" vs others
  const { daromad1Columns, otherColumns, isDaromad1 } = useMemo(() => {
    const daromad1: any[] = [];
    const others: any[] = [];

    (plan_cols as any[]).forEach((col: any) => {
      // Check all possible fields for "Daromad 1"
      const columnName = (
        col.name ||
        col.parent ||
        col.column_name ||
        col.title ||
        ""
      ).toLowerCase();

      // Debug in development
      if (process.env.NODE_ENV === "development" && plan_cols.length > 0) {
        console.log("Column:", {
          id: col.id,
          name: col.name,
          parent: col.parent,
          column_name: col.column_name,
          title: col.title,
          fullColumn: col,
        });
      }

      if (columnName.includes("daromad 1")) {
        daromad1.push(col);
      } else {
        others.push(col);
      }
    });

    const hasDaromad1 = daromad1.length > 0;

    // Debug in development
    if (process.env.NODE_ENV === "development") {
      console.log("Column separation:", {
        total: plan_cols.length,
        daromad1: daromad1.length,
        others: others.length,
        daromad1Columns: daromad1,
      });
    }

    return {
      daromad1Columns: daromad1,
      otherColumns: others,
      isDaromad1: hasDaromad1,
    };
  }, [plan_cols]);

  // Get plants data - only fetch when statement is selected
  const plantsPerPage = 5;
  const {
    data: plantsData,
    isLoading: plantsLoading,
    error: plantsError,
  } = useGetPlantsReportQuery(
    state.statement
      ? {
          lang,
          parent: "",
          page: plantsPage,
          perPage: plantsPerPage,
          statement: state.statement,
        }
      : skipToken
  );

  // 🔹 PlantsData kelgan sayin plant nomlarini cache'ga qo'shib boramiz (pagination almashganda ham tanlanganlar ko'rinib turadi)
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

  const filteredOrganizations = organization?.filter((item: any) =>
    item.name.toLowerCase().includes(state.searchTerm.toLowerCase())
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

  // Reset plants when statement changes
  useEffect(() => {
    if (!isDaromad1) {
      setSelectedPlants([{ plantId: "", plantName: "", values: {} }]);
    } else if (selectedPlants.length === 0) {
      setSelectedPlants([{ plantId: "", plantName: "", values: {} }]);
    }
    // Reset plants page when statement changes
    if (state.statement) {
      setPlantsPage(1);
    }
  }, [isDaromad1, selectedPlants.length, state.statement]);

  const resetForm = () => {
    dispatch({ type: "RESET_FORM" });
  };

  const createReportHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!state.selectedOrg || !state.statement || !state.year) {
      alert(t("must_select_all"));
      return;
    }

    // Validation for "Daromad 1"
    if (isDaromad1) {
      // Check if all plants are selected
      if (selectedPlants.some((p) => !p.plantId)) {
        alert("Barcha plantlar tanlanishi kerak!");
        return;
      }

      // Check if all plant values are filled (only for "Daromad 1" columns)
      for (const plant of selectedPlants) {
        for (const col of daromad1Columns) {
          if (!plant.values[col.id] || plant.values[col.id] === "") {
            alert(
              `Plant "${plant.plantName}" uchun "Daromad 1" ustunidagi barcha qiymatlar to'ldirilishi kerak!`
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
      // Regular validation for other statements (no "Daromad 1" columns)
    if (Object.values(state.values).some((val) => val === "")) {
      alert(t("must_fill_all"));
      return;
    }
    }

    // Build plan_items from other columns (not "Daromad 1")
    const plan_items = otherColumns.map((col: any) => ({
      column: col.id,
      plan_value: parseFloat(state.values[col.id] || "0") || 0,
    }));

    const payload: any = {
      organization: state.selectedOrg,
      statement: state.statement,
      year: state.year,
      plan_items,
      season: state.season,
    };

    // Add plants array for "Daromad 1" columns only
    if (isDaromad1 && daromad1Columns.length > 0) {
      payload.plants = selectedPlants.map((plant) => ({
        plant: plant.plantId,
        items: daromad1Columns.map((col: any) => ({
          column: col.id,
          plan_value: parseFloat(plant.values[col.id] || "0") || 0,
        })),
      }));
    }

    try {
      await createReport(payload).unwrap();
      toast.success(t("report_created_successfully"));
      navigate("/main");
      resetForm();
      setSelectedPlants([{ plantId: "", plantName: "", values: {} }]);
    } catch (error) {
      console.error("Yaratishda xatolik:", error);
      toast.error(t("error_occurred"));
    }
  };

  return (
    <div className="px-5 py-5 w-full mb-30 bg-ice">
      <div>
        <Button
          className="min-w-[50px] min-h-[25px] bg-ice text-black text-sm border-1 border-black"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} />
          <span className="text-sm">{t("back")}</span>
        </Button>
      </div>
      <form onSubmit={createReportHandler} className="grid grid-cols-1 gap-3">
        {/* ORGANIZATION */}
        <div className="w-full">
          <Label className="pb-1.5 text-md block">{t("item_12")}</Label>
          <Select
            value={state.selectedOrg ?? ""}
            onValueChange={(value) =>
              dispatch({ type: "SET_SELECTED_ORG", payload: value })
            }
          >
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder={t("selectOrganization")} />
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
                />
              </div>

              {organization_loading && (
                <div className="text-center text-sm py-2">{t("loading")}</div>
              )}
              {organization_error && (
                <div className="text-center text-sm text-red-500 py-2">
                  {t("error_occurred")}
                </div>
              )}
              {filteredOrganizations?.length > 0 ? (
                filteredOrganizations.map((item: any) => (
                  <SelectItem key={item?.id} value={String(item?.id)}>
                    {item.name}
                  </SelectItem>
                ))
              ) : (
                <div className="text-center text-sm text-gray-500 py-2">
                  {t("noThingsFound")}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* STATEMENT */}
        <div className="w-full">
          <Label className="pb-1.5 text-md block">{t("statments_name")}</Label>
          <Select
            value={state.statement ?? ""}
            onValueChange={(value) =>
              dispatch({ type: "SET_STATEMENT", payload: value })
            }
          >
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder={t("selectChapter")} />
            </SelectTrigger>
            <SelectContent>
              {statment_loading && (
                <div className="text-center text-sm py-2">{t("loading")}</div>
              )}
              {statment_error && (
                <div className="text-center text-sm text-red-500 py-2">
                  {t("error_occurred")}
                </div>
              )}
              {statment?.results.flatMap((item: any) =>
                item.children.map((child: any) => (
                  <SelectItem key={child.id} value={String(child.id)}>
                    {child.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* YEAR */}
        <div className="w-full">
          <Label className="pb-1.5 text-md block">{t("year")}</Label>
          <Input
            name="year"
            className="min-h-[45px]"
            type="number"
            value={state.year}
            onChange={(e) =>
              dispatch({ type: "SET_YEAR", payload: Number(e.target.value) })
            }
            required
          />
        </div>

        {(state.statement ==
          "1186b75c-d84c-44e6-999e-d6be3c5118ff" ||
          state.statement == "671577ba-6a86-4619-b31c-86fff20ad305") && (
          <div className="w-full">
            <Label className="pb-1.5 text-md block">{t("season")}</Label>
            <Select
              value={state.season ?? ""}
              onValueChange={(value) =>
                dispatch({ type: "SET_SEASON", payload: value })
              }
            >
              <SelectTrigger className="w-full min-h-[45px]">
                <SelectValue placeholder={t("season")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"spring"}>Bahor</SelectItem>
                <SelectItem value={"autumn"}>Kuz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* PLAN COLUMNS */}
        {state.statement && (
          <>
            {plan_cols_loading ? (
              <div className="text-center py-4">{t("table_loading")}</div>
            ) : plan_cols_error ? (
              <div className="text-center text-red-500 py-4">
                {t("data_loading_error_4")}
              </div>
            ) : plan_cols.length > 0 ? (
              <>
                {/* Debug info */}
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs text-gray-500 mb-2">
                    Daromad 1 columns: {daromad1Columns.length}, Other columns:{" "}
                    {otherColumns.length}
                  </div>
                )}
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

                        {/* Plant Selection - PlantCreate design */}
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
                                    ? t("loading_error")
                                    : t("please_select") || "Plant tanlang"}
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
                                  {t("data_load_error") || t("error_occurred")}
                                </div>
                              ) : (plantsData as any)?.results?.length > 0 ? (
                                <>
                                  {(plantsData as any).results.flatMap(
                                    (category: any) => [
                                      <SelectItem
                                        key={category.id}
                                        value={category.id}
                                        disabled
                                        className="font-semibold bg-gray-100 text-gray-500 cursor-not-allowed"
                                      >
                                        {category.name}
                                      </SelectItem>,
                                      ...category.children.map((child: any) => {
                                        const isUsed = getAllUsedPlantIds.has(
                                          child.id.toString()
                                        );
                                        const isCurrentFormPlant =
                                          plant.plantId === child.id.toString();

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
                                              ` (${t("selected") || "Tanlangan"})`}
                                          </SelectItem>
                                        );
                                      }),
                                    ]
                                  )}

                                  {/* Plants Pagination Controls */}
                                  {(plantsData as any).count > plantsPerPage && (
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
                                        {t("before") || "Oldingi"}
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
                                        {t("next") || "Keyingi"}
                                      </Button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="p-2 text-center text-muted-foreground text-sm">
                                  Plantlar topilmadi
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
                                {daromad1Columns.map(
                                  (item: any, colIndex: number) => (
                                    <TableRow key={item.id || colIndex}>
                                      <TableCell className="whitespace-normal break-words">
                                        {item.parent || item.name || `Column ${colIndex + 1}`}
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
                                          placeholder="Qiymat kiriting"
                                          disabled={!plant.plantId}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center text-sm text-gray-500 py-4 border rounded p-4">
                              "Daromad 1" ustunlari topilmadi. Barcha ustunlar:{" "}
                              {plan_cols.length}
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
                  // Oddiy formula boshqa statementlar uchun - barcha ustunlarni ko'rsatish
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
                    {plan_cols.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="whitespace-normal break-words">
                              {item.parent || item.name}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={state.values[item.id] || ""}
                                onChange={(e) =>
                                  handleChange(item.id, e.target.value)
                                }
                                placeholder="Qiymat kiriting"
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
                          {otherColumns.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="whitespace-normal break-words">
                                {item.parent || item.name}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={state.values[item.id] || ""}
                            onChange={(e) =>
                              handleChange(item.id, e.target.value)
                            }
                            placeholder="Qiymat kiriting"
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
              <div className="text-center text-sm text-gray-500 py-4">
                {t("noColumnsFound")}
              </div>
            )}
          </>
        )}

        {/* SUBMIT */}
        {state.statement && plan_cols.length > 0 && (
          <div>
            {isDaromad1 ? (
              // For "Daromad 1" - check if at least one plant is selected
              selectedPlants.some((p) => p.plantId) ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[40px] min-w-[130px] bg-[#3B82F6] text-md flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                  {t("submit")}
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
              disabled={isSubmitting}
              className="min-h-[40px] min-w-[130px] bg-[#3B82F6] text-md flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
              {t("submit")}
            </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default CreateReport;
