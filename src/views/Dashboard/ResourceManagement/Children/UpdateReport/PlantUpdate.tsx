import { RootState } from "@/app/store";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import {
  useGetReportPlantByIdQuery,
  useGetDeadlinesReportQuery,
  useUpdateReportPlantMutation,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";

interface InnerValue {
  value: string;
  plant_id?: string;
  organization_id?: string;
}

interface InnerPayload {
  value?: string;
  plant?: string;
}

const QUARTER_LABELS: Record<string, string> = {
  q1: "1-chorak",
  q2: "2-chorak",
  q3: "3-chorak",
  q4: "4-chorak",
};

const Q1_PLANS = ["chorak_1", "yanvar", "fevral", "mart"];
const Q2_PLANS = ["chorak_2", "aprel", "may", "iyun"];
const Q3_PLANS = ["chorak_3", "iyul", "avgust", "sentabr"];
const Q4_PLANS = ["chorak_4", "oktabr", "noyabr", "dekabr"];

function getQuarterFromStatusPlan(statusPlan: string | null): string | null {
  if (!statusPlan) return null;
  if (Q1_PLANS.includes(statusPlan)) return "q1";
  if (Q2_PLANS.includes(statusPlan)) return "q2";
  if (Q3_PLANS.includes(statusPlan)) return "q3";
  if (Q4_PLANS.includes(statusPlan)) return "q4";
  return null;
}

function PlantUpdate() {
  const { id, reportName: rawReportName } = useParams<{ id: string; reportName?: string }>();
  const reportName = rawReportName ? decodeURIComponent(rawReportName) : "";
  const isDaromadReport = reportName === "Daromad";

  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [checkPayload, setCheckPayload] = useState<any>();

  const [updateReport, { isLoading: isSubmitting }] =
    useUpdateReportPlantMutation();

  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [footNote, setFootNote] = useState("");
  const [values, setValues] = useState<Record<string, InnerValue>>({});
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");

  const { data: plantData, isLoading: isPlantLoading } =
    useGetReportPlantByIdQuery(
      { id: id!, is_user_input: "true" },
      { skip: !id },
    );

  const { data: organizationsData } = useGetOrganizationReportsQuery({ lang });

  // Har bir Amalda (status_plan: null) columniga qaysi quarter tegishli ekanini aniqlash
  // Amalda doim o'zidan oldingi Reja columnining quarteriga tegishli
  const columnQuarterMap = (() => {
    const map: Record<string, string> = {};
    if (!plantData?.report_items) return map;
    plantData.report_items.forEach((reportItem: any) => {
      let lastQuarter: string | null = null;
      reportItem.statement_columns.forEach((column: any) => {
        const q = getQuarterFromStatusPlan(column.status_plan);
        if (q) {
          lastQuarter = q;
        } else if (column.status_plan === null && lastQuarter) {
          map[column.statement_column_id] = lastQuarter;
        }
      });
    });
    return map;
  })();

  const { data: deadlineData } = useGetDeadlinesReportQuery(
    {
      statement: plantData?.statement || "",
      page: 1,
      perPage: 10,
      statement__period: "",
      is_new_deadline: "",
    },
    { skip: !plantData?.statement },
  );

  // Initialize values
  useEffect(() => {
    if (!plantData?.report_items) return;

    const initial: Record<string, InnerValue> = {};
    let firstOrgId = "";

    plantData.report_items.forEach((reportItem: any) => {
      reportItem.statement_columns.forEach((column: any) => {
        column.inners.forEach((inner: any) => {
          initial[inner.id] = {
            value: inner.value ?? "",
            plant_id: inner.plant_id,
            organization_id: column.is_organization ? inner.value : undefined,
          };
          // Birinchi organization ID ni olish
          if (column.is_organization && inner.value && !firstOrgId) {
            firstOrgId = inner.value;
          }
        });
      });
    });

    setValues(initial);
    setSelectedDeadlineId(plantData.deadline || "");
    setFootNote(plantData.foot_note || "");

    // current_quarter dan boshlang'ich quarter ni olish
    if (plantData.current_quarter) {
      setSelectedQuarter(plantData.current_quarter);
    }

    // Agar mavjud organization bo'lsa, uni tanlaymiz
    if (firstOrgId) {
      setSelectedOrganization(firstOrgId);
    }
  }, [plantData]);

  const handleValueChange = (innerId: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [innerId]: {
        ...prev[innerId],
        value,
      },
    }));
  };

  const handleOrganizationChange = (orgId: string) => {
    setSelectedOrganization(orgId);

    // Barcha organization columnlarni yangilash
    setValues((prev) => {
      const updated = { ...prev };

      plantData?.report_items.forEach((reportItem: any) => {
        reportItem.statement_columns.forEach((column: any) => {
          if (column.is_organization) {
            column.inners.forEach((inner: any) => {
              if (updated[inner.id]) {
                updated[inner.id] = {
                  ...updated[inner.id],
                  value: orgId,
                  organization_id: orgId,
                };
              }
            });
          }
        });
      });

      return updated;
    });
  };

  const createPayload = () => {
    if (!plantData || !id) return null;

    const reportItemsMap = new Map<string, InnerPayload[]>();

    plantData.report_items.forEach((reportItem: any) => {
      reportItem.statement_columns.forEach((column: any) => {
        const columnKey = column.statement_column_id;

        // Agar organization column bo'lsa, uni butunlay skip qilamiz
        if (column.is_organization) {
          return; // Bu columnni umuman qo'shmaymiz
        }

        const columnInners: InnerPayload[] = [];

        const editable = isEditableForSelectedQuarter(column);

        column.inners.forEach((inner: any) => {
          const innerState = values[inner.id];
          if (!innerState) return;

          let innerObj: InnerPayload = {};

          // Tanlanmagan quarter ustunlarida mavjud qiymatni saqlaymiz
          innerObj.value = editable
            ? innerState.value || "0"
            : (innerState.value ?? "0");

          if (inner.plant_id) {
            innerObj.plant = inner.plant_id;
          }

          columnInners.push(innerObj);
        });

        // Faqat inners arrayi bo'sh bo'lmasa qo'shamiz
        if (columnInners.length > 0) {
          reportItemsMap.set(columnKey, columnInners);
        }
      });
    });

    return {
      id,
      deadline: selectedDeadlineId,
      ...(isDaromadReport ? { quarter: selectedQuarter } : {}),
      report_items: Array.from(reportItemsMap.entries()).map(
        ([statement_column, inners]) => ({
          statement_column,
          inners,
        }),
      ),
      foot_note: footNote || undefined,
    };
  };

  const isEditableForSelectedQuarter = (column: any): boolean => {
    // Reja (plan) ustunlari hech qachon editlanmaydi
    if (column.status_plan !== null) return false;

    // Daromad bo'lmasa barcha Amalda ustunlari editlanadi
    if (!isDaromadReport) return true;

    // Daromad: faqat tanlangan chorak Amalda ustunlari editlanadi
    const columnQuarter = columnQuarterMap[column.statement_column_id] || null;
    if (!columnQuarter) return true; // quarter aniqlanmasa ruxsat beramiz
    if (!selectedQuarter) return false;
    return columnQuarter === selectedQuarter;
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!selectedDeadlineId) {
      errors.push(t("select_deadline_required"));
    }

    if (!selectedOrganization) {
      errors.push(t("select_organization_required"));
    }

    if (isDaromadReport && !selectedQuarter) {
      errors.push("Chorakni tanlang");
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();

    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
      return;
    }

    const payload = createPayload();
    if (!payload) return;

    try {
      await updateReport(payload).unwrap();
      setCheckPayload(payload);
      toast.success(t("updated_successfully"));
      navigate(-1);
    } catch (error: any) {
      toast.error(t("update_error"));
      setCheckPayload(payload);
    }
  };

  if (!id) return <div>Invalid ID</div>;
  if (isPlantLoading) return <div>{t("loading")}</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <Button onClick={() => navigate(-1)} className="mb-4">
        <ChevronLeft size={18} /> {t("back")}
      </Button>

      <div className="mb-4 flex gap-4">
        <Select
          value={selectedDeadlineId}
          onValueChange={setSelectedDeadlineId}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={t("selectDeadline")} />
          </SelectTrigger>
          <SelectContent>
            {deadlineData?.results?.map((item: any) => (
              <SelectItem key={item.id} value={item.id.toString()}>
                {item.submit_at}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isDaromadReport && (
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Chorakni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QUARTER_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={selectedOrganization}
          onValueChange={handleOrganizationChange}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={t("select_organization")} />
          </SelectTrigger>
          <SelectContent>
            {organizationsData?.map((org: any) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("statement_column")}</TableHead>
            <TableHead>{t("value")}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {plantData?.report_items?.map((reportItem: any) => {
            let lastQuarter: string | null = null;
            return reportItem.statement_columns.map((column: any, colIdx: number) => {
              const currentQuarter =
                getQuarterFromStatusPlan(column.status_plan) ||
                columnQuarterMap[column.statement_column_id] ||
                null;

              const showQuarterHeader =
                currentQuarter && currentQuarter !== lastQuarter;
              if (currentQuarter) {
                lastQuarter = currentQuarter;
              }

              const isPlanRow = column.status_plan !== null;
              const editable = isEditableForSelectedQuarter(column);

              return (
                <Fragment key={column.statement_column_id || colIdx}>
                  {showQuarterHeader && currentQuarter && (
                    <TableRow className="bg-slate-900/90 dark:bg-slate-900/90 border-y-2 border-blue-500/40">
                      <TableCell
                        colSpan={2}
                        className="py-3 px-4 bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-7 px-3 rounded-lg bg-blue-600/20 text-blue-400 font-extrabold text-xs tracking-wider uppercase border border-blue-500/30 flex items-center gap-2 font-sans">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            {QUARTER_LABELS[currentQuarter] || currentQuarter.toUpperCase()}
                          </div>
                          {selectedQuarter === currentQuarter && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 font-sans">
                              ✓ Tanlangan faol chorak
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="hover:bg-slate-800/30 transition-colors">
                    <TableCell className="whitespace-normal break-words font-sans py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                          {column.statement_column_name}
                        </span>
                        {isPlanRow ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/80 shrink-0">
                            Reja
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                            Amalda
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      {column.inners.map((inner: any) => {
                        if (column.is_organization) {
                          const orgName = organizationsData?.find(
                            (org: any) => org.id === selectedOrganization,
                          )?.name;
                          return (
                            <div key={inner.id} className="px-2 py-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                              {orgName || t("no_organization_selected")}
                            </div>
                          );
                        } else {
                          return (
                            <div key={inner.id} className="flex items-center justify-between gap-4">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                                {inner.plant_name}
                              </span>
                              <input
                                type="number"
                                value={
                                  editable
                                    ? values[inner.id]?.value ?? ""
                                    : values[inner.id]?.value ?? "0"
                                }
                                disabled={!editable}
                                onChange={(e) =>
                                  handleValueChange(inner.id, e.target.value)
                                }
                                className={`px-3 py-1.5 rounded-xl w-[200px] text-sm font-medium transition-all outline-none ${
                                  !editable
                                    ? "bg-slate-950/80 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
                                    : "bg-blue-950/60 dark:bg-blue-950/60 text-white border-1.5 border-blue-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 shadow-sm font-semibold"
                                }`}
                              />
                            </div>
                          );
                        }
                      })}
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            });
          })}
        </TableBody>
      </Table>

      <div className="mt-6">
        <label className="block mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100 font-sans">
          {t("note_optional")}
        </label>
        <Textarea
          value={footNote}
          onChange={(e) => setFootNote(e.target.value)}
          placeholder={t("enter_note")}
          className="min-h-[100px] rounded-2xl bg-white dark:!bg-slate-900 border border-slate-200 dark:!border-slate-800 text-slate-800 dark:!text-slate-100 placeholder:text-slate-400 p-4 font-sans text-sm shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          rows={4}
        />
      </div>

      <div className="flex justify-end mt-6 pb-6">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 !text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          {isSubmitting ? `⏳ ${t("updating")}` : t("update")}
        </Button>
      </div>
      {checkPayload && (
        <div className="mt-6 p-4 bg-gray-100 rounded border">
          <h3 className="font-semibold mb-2">Payload Preview:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(checkPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default PlantUpdate;
