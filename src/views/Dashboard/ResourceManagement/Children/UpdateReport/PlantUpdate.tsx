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

function PlantUpdate() {
  const { id } = useParams<{ id: string }>();
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [checkPayload, setCheckPayload] = useState<any>();

  const [updateReport, { isLoading: isSubmitting }] =
    useUpdateReportPlantMutation();

  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [footNote, setFootNote] = useState("");
  const [values, setValues] = useState<Record<string, InnerValue>>({});
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");

  const { data: plantData, isLoading: isPlantLoading } =
    useGetReportPlantByIdQuery(
      { id: id!, is_user_input: "true" },
      { skip: !id },
    );

  const { data: organizationsData } = useGetOrganizationReportsQuery({ lang });

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

        column.inners.forEach((inner: any) => {
          const innerState = values[inner.id];
          if (!innerState) return;

          let innerObj: InnerPayload = {};

          if (innerState.value) {
            innerObj.value = innerState.value;
          }

          if (inner.plant_id) {
            innerObj.plant = inner.plant_id;
          }

          // Faqat value mavjud bo'lsa qo'shamiz
          if (innerObj.value) {
            columnInners.push(innerObj);
          }
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
      report_items: Array.from(reportItemsMap.entries()).map(
        ([statement_column, inners]) => ({
          statement_column,
          inners,
        }),
      ),
      foot_note: footNote || undefined,
    };
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!selectedDeadlineId) {
      errors.push(t("select_deadline_required"));
    }

    if (!selectedOrganization) {
      errors.push(t("select_organization_required"));
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
      // navigate(-1);
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
                      return (
                        <div className="flex items-center justify-between">
                          <div>
                            <h2>{inner.plant_name}</h2>
                          </div>
                          <input
                            key={inner.id}
                            type="number"
                            value={values[inner.id]?.value || ""}
                            onChange={(e) =>
                              handleValueChange(inner.id, e.target.value)
                            }
                            className="border px-2 py-1 rounded w-[200px]"
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
