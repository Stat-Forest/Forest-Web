import { useReducer, useEffect } from "react";
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
import { updatePlansReducer, updatePlansInitialState } from "@/reducers/formReducer";

function UpdatePlans() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(updatePlansReducer, updatePlansInitialState);
  const { t } = useTranslation();

  const lang = useSelector((state: RootState) => state.language.lang);

  // ==== Queries & Mutations ====
  const { data: organization } = useGetOrganizationReportsQuery({ lang });
  const { data: existingPlan, isLoading: isPlanLoading } = useGetPlanByIdQuery(
    id ? id : skipToken
  );

  const { data: plan_cols = [] } = useGetPlanColumnsReportQuery(
    existingPlan ? { search: existingPlan.statement_id } : skipToken
  );

  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();

  // ==== Fill initial data when editing ====
  useEffect(() => {
    if (existingPlan) {
      const initialValues: Record<string, string> = {};
      existingPlan.plan_items.forEach((item: any) => {
        initialValues[item.column_id] = String(item.plan_value ?? "");
      });
      dispatch({
        type: "INIT_FORM",
        payload: {
          selectedOrg: existingPlan.organization_id ?? null,
          statement: existingPlan.statement_id ?? null,
          year: existingPlan.year ?? 2025,
          values: initialValues,
        },
      });
    }
  }, [existingPlan]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.selectedOrg || !state.statement || !state.year) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    const plan_items = Object.entries(state.values).map(([column, plan_value]) => ({
      column,
      plan_value: Number(plan_value),
    }));

    const payload = {
      organization: state.selectedOrg,
      year: state.year,
      plan_items,
    };

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
                        dispatch({ type: "SET_SEARCH_TERM", payload: e.target.value })
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
              <span className="text-md text-silver">{existingPlan.organization}</span>
            </div>

            {/* YEAR */}
            <div className="w-full">
              <Label className="pb-1.5 text-md">Yil</Label>
              <Input
                type="number"
                value={state.year}
                onChange={(e) =>
                  dispatch({ type: "SET_YEAR", payload: Number(e.target.value) })
                }
              />
            </div>

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

            {/* PLAN COLUMNS */}
            {plan_cols.length > 0 && (
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

            {/* SUBMIT */}
            {plan_cols.length > 0 && (
              <div className="flex gap-3 mt-5">
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="min-h-[40px] min-w-[130px] bg-[#3B82F6] text-md flex items-center gap-2"
                >
                  {isUpdating && <Loader2 className="animate-spin w-4 h-4" />}
                  {id ? "Yangilash" : "Yuborish"}
                </Button>
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
