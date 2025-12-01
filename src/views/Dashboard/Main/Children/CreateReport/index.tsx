import { useState } from "react";
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

function CreateReport() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statement, setStatement] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [year, setYear] = useState<number | undefined>(undefined);
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
    statement ? { search: statement } : skipToken
  );

  const filteredOrganizations = organization?.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChange = (columnId: string, value: string) => {
    setValues((prev) => ({ ...prev, [columnId]: value }));
  };

  const resetForm = () => {
    setSelectedOrg(null);
    setStatement(null);
    setValues({});
    setYear(2025);
  };

  const createReportHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedOrg || !statement || !year) {
      alert(t("must_select_all"));
      return;
    }

    if (Object.values(values).some((val) => val === "")) {
      alert(t("must_fill_all"));
      return;
    }

    const plan_items = Object.entries(values).map(([column, plan_value]) => ({
      column,
      plan_value,
    }));

    const payload = {
      organization: selectedOrg,
      statement,
      year,
      plan_items,
    };

    try {
      await createReport(payload).unwrap();
      alert(t('report_created_successfully'));
      navigate("/main");
      resetForm();
    } catch (error) {
      console.error("Yaratishda xatolik:", error);
      alert(t("error_occurred"));
    }
  };

  return (
    <div className="px-5 py-5 w-full mb-30 bg-white/90">
      <div>
        <Button
          className="min-w-[50px] min-h-[25px] bg-white text-black text-lg border-1 border-black"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft /> {t("back")}
        </Button>
      </div>
      <form onSubmit={createReportHandler} className="grid grid-cols-1 gap-3">
        {/* ORGANIZATION */}
        <div className="w-full">
          <Label className="pb-1.5 text-md block">{t('item_12')}</Label>
          <Select value={selectedOrg ?? ""} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder={t('selectOrganization')} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input
                  placeholder="Izlash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
          <Label className="pb-1.5 text-md block">{t('statments_name')}</Label>
          <Select value={statement ?? ""} onValueChange={setStatement}>
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder={t('selectChapter')} />
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
          <Label className="pb-1.5 text-md block">{t('year')}</Label>
          <Input
            name="year"
            className="min-h-[45px]"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            required
          />
        </div>

        {/* PLAN COLUMNS */}
        {statement && (
          <>
            {plan_cols_loading ? (
              <div className="text-center py-4">{t('table_loading')}</div>
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
                      <TableHead className="min-w-[300px]">{t("value")}</TableHead>
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
                            value={values[item.id] || ""}
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
        {statement && plan_cols.length > 0 && (
          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] min-w-[130px] bg-[#09B86F] text-md flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
              {t('submit')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export default CreateReport;
