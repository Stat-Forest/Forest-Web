import { RootState } from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  fetchReportDeadlines,
  useCreateReportMutation,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { findEmptyChildrenColumnIds } from "@/utils/findEmptyChildrenColumnIds";
import { useEffect, useReducer } from "react";
import { useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InfiniteSelect from "@/components/ui/InfiniteSelect";
import { Input } from "@/components/ui/input";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { Plus, Minus } from "lucide-react";
import { removeCookie } from "@/utils/cookie";
import { useTranslation } from "react-i18next";
import { defaultCreateReducer, defaultCreateInitialState } from "@/reducers/defaultCreateReducer";

const DefaultCreate = () => {
  const [state, dispatch] = useReducer(defaultCreateReducer, defaultCreateInitialState);
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);

  const currentEmptyColumns = state.allEmptyColumnsByStep[state.currentStep] || [];
  const { t } = useTranslation();
  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery({lang});

  const {
    data: tableHeadersData = [],
    isLoading: isHeaderLoading,
    error: headersError,
  } = useGetStatementColumnsReportQuery(
    { statementId: reportIds as string, lang,isUser:"true" },
    {
      skip: !reportIds,
    }
  );

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();
    

  useEffect(() => {
    if (tableHeadersData.length > 0) {
      const allStepsEmptyCols = tableHeadersData.map((obj: any) =>
        Array.isArray(obj.children)
          ? findEmptyChildrenColumnIds(obj.children)
          : []
      );
      dispatch({ type: "SET_EMPTY_COLUMNS", payload: allStepsEmptyCols });
    } else {
      dispatch({ type: "SET_EMPTY_COLUMNS", payload: [] });
    }
  }, [tableHeadersData]);

  // Initialize form values with at least one input for each column
  useEffect(() => {
    const initialValues: Record<string, string[]> = {};
    currentEmptyColumns.forEach((col) => {
      if (!state.formValues[col.id]) {
        initialValues[col.id] = [""];
      }
    });
    if (Object.keys(initialValues).length > 0) {
      dispatch({ type: "SET_FORM_VALUES", payload: { ...state.formValues, ...initialValues } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmptyColumns]);

  const handleInputChange = (
    columnId: string,
    inputIndex: number,
    value: string
  ) => {
    dispatch({ type: "UPDATE_FORM_VALUE", payload: { columnId, inputIndex, value } });
  };

  const handleOrganizationChange = (
    columnId: string,
    inputIndex: number,
    value: string
  ) => {
    handleInputChange(columnId, inputIndex, value);
    // Only update selectedOrganizationId for the first input of organization columns
    if (inputIndex === 0) {
      dispatch({ type: "SET_ORGANIZATION", payload: value });
    }
  };

  const addInput = (columnId: string) => {
    dispatch({ type: "ADD_INPUT", payload: columnId });
  };

  const removeInput = (columnId: string, inputIndex: number) => {
    dispatch({ type: "REMOVE_INPUT", payload: { columnId, inputIndex } });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!state.selectedDeadlineId) {
      alert(t("please_select_deadline"));
      return;
    }

    // Check if organization is required and selected
    const hasOrganizationColumn = currentEmptyColumns.some((col) =>
      col.title.toLowerCase().includes("tashkilot")
    );

    if (hasOrganizationColumn && !state.selectedOrganizationId) {
      alert(t("please_select_organization_simple"));
      return;
    }

    // Validate that all required fields (first input of each column) have values
    const emptyRequiredFields = currentEmptyColumns.filter((col) => {
      const columnValues = state.formValues[col.id] || [""];
      return !columnValues[0] || columnValues[0].trim() === "";
    });

    if (emptyRequiredFields.length > 0) {
      alert(t("must_select_all"));
      return;
    }

    // Get all columns from all steps
    const allColumns = state.allEmptyColumnsByStep.flat();

    // Build report_items with new structure
    const report_items = allColumns.map((col) => {
      const columnValues = state.formValues[col.id] || [""];
      const isOrganizationColumn = col.title
        .toLowerCase()
        .includes("tashkilot");

      // Filter out empty values and create inners array
      const inners = columnValues
        .filter((value) => value && value.trim() !== "")
        .map((value) => ({ value: value.trim() }));

      // If no valid values, add a default based on column type
      if (inners.length === 0) {
        if (isOrganizationColumn) {
          inners.push({ value: state.selectedOrganizationId || "" });
        } else {
          inners.push({ value: "1" }); // Default value for non-organization columns
        }
      }

      return {
        statement_column: col.id,
        inners: inners,
      };
    });

    const payload = {
      deadline: state.selectedDeadlineId,
      report_items: report_items,
    };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      dispatch({ type: "RESET_FORM" });
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(t("submit_error"));
    }
  };

  if (isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">{t("loading")}</p>;

  if (headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>{t("loading_error")}:</p>
        <ul className="list-disc list-inside">
          {<li>{t("deadline_load_error")}</li>}
          {headersError && <li>{t("data_loading_error_4")}</li>}
          {orgError && <li>{t("organizations_load_error")}</li>}
        </ul>
      </div>
    );

  const totalSteps = state.allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[state.currentStep]?.title || `Qadam ${state.currentStep + 1}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-full m-6 p-6 border rounded-lg shadow space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div>
          <label className="block mb-1 text-sm font-medium">Deadline:</label>
          <InfiniteSelect
            placeholder="Tanlang"
            fetchData={fetchReportDeadlines}
            className="border-none w-[300px] text-base"
            name="deadline"
            value={state.selectedDeadlineId}
            onValueChange={(value) => dispatch({ type: "SET_DEADLINE", payload: value })}
          />
        </div>
      </div>

      {currentEmptyColumns.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-semibold">{currentStepTitle}</h2>
            <span className="text-sm text-gray-500">
              {state.currentStep + 1} / {totalSteps}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead className="min-w-[400px]">{t("value")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                const isOrganizationColumn = col.title
                  .toLowerCase()
                  .includes("tashkilot");
                const columnValues = state.formValues[col.id] || [""];

                return (
                  <TableRow key={col.id}>
                    <TableCell className="align-top pt-4">
                      {col.fullParentChain}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {columnValues.map((value, inputIndex) => (
                          <div
                            key={inputIndex}
                            className="flex items-center gap-2"
                          >
                            {isOrganizationColumn ? (
                              <Select
                                value={value}
                                onValueChange={(selectedValue) =>
                                  handleOrganizationChange(
                                    col.id,
                                    inputIndex,
                                    selectedValue
                                  )
                                }
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                  {organizationsData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type="text"
                                value={value}
                                onChange={(e) =>
                                  handleInputChange(
                                    col.id,
                                    inputIndex,
                                    e.target.value
                                  )
                                }
                                className="flex-1"
                                placeholder={
                                  inputIndex === 0
                                    ? "Qiymat kiriting"
                                    : "Qo'shimcha qiymat"
                                }
                                required={inputIndex === 0}
                              />
                            )}

                            <div className="flex items-center gap-1">
                              {inputIndex === columnValues.length - 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={() => addInput(col.id)}
                                  title="Yangi qiymat qo'shish"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}

                              {columnValues.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    removeInput(col.id, inputIndex)
                                  }
                                  title="Qiymatni o'chirish"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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

      <div className="flex justify-between items-center pt-4">
        <div className="space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              dispatch({ type: "SET_CURRENT_STEP", payload: Math.max(state.currentStep - 1, 0) })
            }
            disabled={state.currentStep === 0}
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
            >
              {t("next")}
            </Button>
          )}
        </div>
        {state.currentStep === totalSteps - 1 && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("sending") : t("submit")}
          </Button>
        )}
      </div>
    </form>
  );
};

export default DefaultCreate;
