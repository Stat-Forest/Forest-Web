import { useState, useEffect } from "react";
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

function EmployeeCountCreate() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();

  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery();

  const {
    data: tableHeadersData = [],
    isLoading: isHeaderLoading,
    error: headersError,
  } = useGetStatementColumnsReportQuery(
    { statementId: reportIds as string, lang, isUser: "true" },
    {
      skip: !reportIds,
    }
  );

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  // Initialize empty columns by step
  useEffect(() => {
    if (tableHeadersData.length > 0) {
      const allStepsEmptyCols = tableHeadersData.map((obj: any) =>
        Array.isArray(obj.children)
          ? findEmptyChildrenColumnIds(obj.children)
          : []
      );
      setAllEmptyColumnsByStep(allStepsEmptyCols);
      setCurrentStep(0);
    } else {
      setAllEmptyColumnsByStep([]);
      setCurrentStep(0);
    }
  }, [tableHeadersData]);

  // Set initial input values to "1"
  useEffect(() => {
    if (currentEmptyColumns.length > 0) {
      const initialValues: Record<string, any> = {};

      currentEmptyColumns.forEach((col) => {
        if (!col.title.toLowerCase().includes("tashkilot")) {
          initialValues[col.id] = "1";
        }
      });

      setFormValues((prev) => ({ ...prev, ...initialValues }));
    }
  }, [currentStep, currentEmptyColumns]);

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();

  const handleInputChange = (id: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDeadlineId) {
      alert("Iltimos, deadline tanlang");
      return;
    }
    if (
      currentEmptyColumns.some((col) =>
        col.title.toLowerCase().includes("tashkilot")
      ) &&
      !selectedOrganizationId
    ) {
      alert("Iltimos, tashkilot tanlang");
      return;
    }

    const allColumns = allEmptyColumnsByStep.flat();

    const report_items = allColumns
      .map((col) => {
        const isOrganizationColumn = col.title
          .toLowerCase()
          .includes("tashkilot");

        // Use selected organization ID for organization columns
        const rawValue = isOrganizationColumn
          ? selectedOrganizationId
          : formValues[col.id];

        // Skip empty values
        if (!rawValue) return null;

        const columnValues = Array.isArray(rawValue) ? rawValue : [rawValue];

        const inners = columnValues
          .filter(
            (value) => value !== null && value !== undefined && value !== ""
          )
          .map((value) => ({ value: String(value) }));

        return {
          statement_column: col.id,
          inners,
        };
      })
      .filter((item) => item !== null); // Remove empty items

    const payload = {
      deadline: selectedDeadlineId,
      report_items,
    };

    console.log("Payload:", payload);

    try {
      const res = await createReportItem(payload).unwrap();
      console.log("Yuborildi:", res);
      removeCookie("reportId");
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err?.data || err?.message);
    }
  };

  if (isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;

  if (headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi:</p>
        <ul className="list-disc list-inside">
          {<li>Deadline ma'lumotlarini yuklashda xatolik</li>}
          {headersError && <li>Jadval ustunlarini olishda xatolik</li>}
          {orgError && <li>Tashkilotlar ro'yxatini olishda xatolik</li>}
        </ul>
      </div>
    );

  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title || `Qadam ${currentStep + 1}`;

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
            value={selectedDeadlineId}
            onValueChange={setSelectedDeadlineId}
          />
        </div>
      </div>

      {currentEmptyColumns.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-semibold">{currentStepTitle}</h2>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ustun nomi</TableHead>
                <TableHead className="min-w-[300px]">Qiymat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                const lowerTitle = col.title.toLowerCase();
                // Agar "tashkilot" bo'lsa
                if (lowerTitle.includes("tashkilot")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <select
                          value={selectedOrganizationId}
                          onChange={(e) => {
                            setSelectedOrganizationId(e.target.value);
                            handleInputChange(col.id, e.target.value);
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

                // Oddiy ustunlar
                return (
                  <TableRow key={col.id}>
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={formValues[col.id] || "1"}
                        onChange={(e) =>
                          handleInputChange(col.id, e.target.value)
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
      ) : (
        <p>Ushbu qadamda to'ldirish uchun ustunlar yo'q.</p>
      )}

      <div className="flex justify-between items-center pt-4">
        <div className="space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
          >
            Oldingi
          </Button>
          {currentStep < totalSteps - 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
              }
            >
              Keyingi
            </Button>
          )}
        </div>
        {currentStep === totalSteps - 1 && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default EmployeeCountCreate;
