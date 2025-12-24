import { useState, useEffect, useMemo } from "react";
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
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import {
  fetchReportDeadlines,
  useCreateReportMutation,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";
import InfiniteSelect from "@/components/ui/InfiniteSelect";
import { useTranslation } from "react-i18next";

function findEmptyChildrenColumnIds(
  children: any[]
): { id: string; title: string; fullParentChain: string }[] {
  const result: { id: string; title: string; fullParentChain: string }[] = [];
  const traverse = (cols: any[], parentChain: string[] = []) => {
    cols.forEach((col) => {
      const currentChain = [...parentChain, col.title];
      if (
        col.children &&
        Array.isArray(col.children) &&
        col.children.length > 0
      ) {
        traverse(col.children, currentChain);
      } else {
        result.push({
          id: col.id,
          title: col.title,
          fullParentChain: currentChain.join(" / "),
        });
      }
    });
  };
  traverse(children);
  return result;
}

function InnersCreateReportItem() {
  const [formGroups, setFormGroups] = useState<Record<string, string>[]>([{}]);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [footNote, setFootNote] = useState<string>("");
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const { t } = useTranslation();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();

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
    { statementId: reportIds as string, lang, isUser: "true" },
    { skip: !reportIds }
  );

  const tableHeadersDataMemo = useMemo(
    () => tableHeadersData,
    [tableHeadersData]
  );

  const allEmptyColumnsByStepMemo = useMemo(() => {
    return tableHeadersDataMemo.map((obj: any) =>
      Array.isArray(obj.children)
        ? findEmptyChildrenColumnIds(obj.children)
        : []
    );
  }, [tableHeadersDataMemo]);

  useEffect(() => {
    setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
    setCurrentStep(0);
  }, [allEmptyColumnsByStepMemo]);

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();

  const handleInputChange = (formIndex: number, id: string, value: string) => {
    setFormGroups((prev) =>
      prev.map((form, idx) =>
        idx === formIndex ? { ...form, [id]: value } : form
      )
    );
  };

  const handleAddForm = () => {
    setFormGroups((prev) => [...prev, {}]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!selectedDeadlineId) {
      errors.push("Iltimos, deadline tanlang");
    }
    if (
      allEmptyColumnsByStep[currentStep]?.some((col) =>
        col.title.toLowerCase().includes("tashkilot")
      ) &&
      !selectedOrganizationId
    ) {
      errors.push("Iltimos, tashkilot tanlang");
    }
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();

    const report_items = allColumns.map((col) => {
      const isOrganizationColumn = col.title
        .toLowerCase()
        .includes("tashkilot");

      let inners;
      if (isOrganizationColumn) {
        // ❗ faqat bitta inners (birinchi formdan)
        inners = [{ id: col.id, value: selectedOrganizationId || "" }];
      } else {
        inners = formGroups.map((form) => ({
          id: col.id,
          value: form[col.id] || "",
        }));
      }

      return {
        statement_column: col.id,
        inners,
      };
    });

    const payload = { 
      deadline: selectedDeadlineId, 
      report_items,
      foot_note: footNote || ""
    };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      navigate(-1);
      setFormGroups([{}]);
      setCurrentStep(0);
      setFormErrors([]);
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Ma'lumotlarni yuborishda xatolik yuz berdi";
      setFormErrors((prev) => [...prev, errorMessage]);
      console.error("Yuborishda xatolik:", err);
    }
  };

  if (isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;
  if (headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi</p>
      </div>
    );

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `Qadam ${currentStep + 1}`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`max-w-full m-6 p-6 border rounded-lg shadow space-y-6 bg-ice ${
        isSubmitting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {formErrors.length > 0 && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <ul>
            {formErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-end justify-between gap-4 sm:flex-row">
        <div>
          <label className="block mb-1 text-sm font-medium">Deadline:</label>
          <InfiniteSelect
            placeholder="Tanlang"
            fetchData={fetchReportDeadlines}
            className="border-none w-[300px] text-base"
            name="deadline"
            value={selectedDeadlineId}
            onValueChange={setSelectedDeadlineId}
          />
        </div>
        <div>
          <Button type="button" onClick={handleAddForm}>
            Add
          </Button>
        </div>
      </div>

      {formGroups.map((formValues, formIndex) => (
        <div
          key={formIndex}
          className="overflow-x-auto mb-6 border rounded-lg p-4 bg-gray-50"
        >
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-semibold">
              {currentStepTitle} – {formIndex + 1}-jadval
            </h2>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead className="min-w-[300px]">{t("value")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                const lowerTitle = col.title.toLowerCase();

                if (lowerTitle.includes("tashkilot")) {
                  if (formIndex !== 0) return null; // ❗ faqat birinchi formda ko‘rinadi
                  return (
                    <TableRow key={col.id}>
                      <TableCell className="whitespace-normal break-words">
                        {col.fullParentChain}
                      </TableCell>
                      <TableCell>
                        <select
                          value={selectedOrganizationId}
                          onChange={(e) => {
                            setSelectedOrganizationId(e.target.value);
                            handleInputChange(
                              formIndex,
                              col.id,
                              e.target.value
                            );
                          }}
                          className="w-full border rounded px-2 py-1"
                          required
                        >
                          <option value="">Tanlang</option>
                          {organizationsData?.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
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
                        value={formValues[col.id] || ""}
                        onChange={(e) =>
                          handleInputChange(formIndex, col.id, e.target.value)
                        }
                        required
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

      <div className="flex justify-between items-center pt-4">
        <div className="space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0 || isSubmitting}
          >
            {t("before")}
          </Button>
          {currentStep < totalSteps - 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
              }
              disabled={isSubmitting}
            >
              {t("next")}
            </Button>
          )}
        </div>
        {currentStep === totalSteps - 1 && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "⏳ Yuborilmoqda..." : "Yuborish"}
          </Button>
        )}
      </div>

      {/* ✅ FOOT NOTE TEXTAREA - Faqat oxirgi qadamda */}
      {currentStep === totalSteps - 1 && (
        <div className="mt-6">
          <label className="block mb-2 text-lg font-medium">
            Izoh (ixtiyoriy):
          </label>
          <Textarea
            value={footNote}
            onChange={(e) => setFootNote(e.target.value)}
            placeholder="Izoh kiriting..."
            className="min-h-[100px] bg-ice border-white/30 focus:border-[#3B82F6]"
            rows={4}
          />
        </div>
      )}
    </form>
  );
}

export default InnersCreateReportItem;
