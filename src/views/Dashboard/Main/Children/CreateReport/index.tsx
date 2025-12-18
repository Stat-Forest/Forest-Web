import { useReducer } from "react";
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

  const filteredOrganizations = organization?.filter((item: any) =>
    item.name.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  const handleChange = (columnId: string, value: string) => {
    dispatch({ type: "SET_VALUE", payload: { columnId, value } });
  };

  const resetForm = () => {
    dispatch({ type: "RESET_FORM" });
  };

  const createReportHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!state.selectedOrg || !state.statement || !state.year) {
      alert(t("must_select_all"));
      return;
    }

    if (Object.values(state.values).some((val) => val === "")) {
      alert(t("must_fill_all"));
      return;
    }

    const plan_items = Object.entries(state.values).map(
      ([column, plan_value]) => ({
        column,
        plan_value,
      })
    );

    const payload = {
      organization: state.selectedOrg,
      statement: state.statement,
      year: state.year,
      plan_items,
      season: state.season,
    };

    try {
      await createReport(payload).unwrap();
      toast.success(t("report_created_successfully"));
      navigate("/main");
      resetForm();
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
                          {item.parent}
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] min-w-[130px] bg-[#3B82F6] text-md flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
              {t("submit")}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export default CreateReport;
