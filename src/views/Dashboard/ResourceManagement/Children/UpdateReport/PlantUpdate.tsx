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
import { useEffect, useState } from "react";
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
          {plantData?.report_items?.map((reportItem: any) =>
            reportItem.statement_columns.map((column: any) => (
              <TableRow key={column.statement_column_id}>
                <TableCell className="whitespace-normal break-words">
                  {column.statement_column_name}
                </TableCell>
                <TableCell>
                  {column.inners.map((inner: any) => {
                    if (column.is_organization) {
                      // Organization column - faqat tanlangan organization nomini ko'rsatamiz
                      const orgName = organizationsData?.find(
                        (org: any) => org.id === selectedOrganization,
                      )?.name;
                      return (
                        <div key={inner.id} className="px-2 py-1">
                          {orgName || t("no_organization_selected")}
                        </div>
                      );
                    } else {
                      // Oddiy column - input
                      const editable = isEditableForSelectedQuarter(column);
                      return (
                        <div className="flex items-center justify-between">
                          <div>
                            <h2>{inner.plant_name}</h2>
                          </div>
                          <input
                            key={inner.id}
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
                            className={`border px-2 py-1 rounded w-[200px] ${
                              !editable ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
                            }`}
                          />
                        </div>
                      );
                    }
                  })}
                </TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>

      <div className="mt-6">
        <Textarea
          value={footNote}
          onChange={(e) => setFootNote(e.target.value)}
          placeholder={t("enter_note")}
        />
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {t("update")}
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
