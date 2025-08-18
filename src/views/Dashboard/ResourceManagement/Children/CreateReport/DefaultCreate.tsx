import { RootState } from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  fetchReportDeadlines,
  useCreateReportMutation,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { findEmptyChildrenColumnIds } from "@/utils/findEmptyChildrenColumnIds";
import { useEffect, useState } from "react";
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

const DefaultCreate = () => {
  // Change formValues to store arrays of values for each column
  const [formValues, setFormValues] = useState<Record<string, string[]>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

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
      setAllEmptyColumnsByStep(allStepsEmptyCols);
      setCurrentStep(0);
    } else {
      setAllEmptyColumnsByStep([]);
      setCurrentStep(0);
    }
  }, [tableHeadersData]);

  // Initialize form values with at least one input for each column
  useEffect(() => {
    const initialValues: Record<string, string[]> = {};
    currentEmptyColumns.forEach((col) => {
      if (!formValues[col.id]) {
        initialValues[col.id] = [""];
      }
    });
    if (Object.keys(initialValues).length > 0) {
      setFormValues((prev) => ({ ...prev, ...initialValues }));
    }
  }, [currentEmptyColumns]);

  const handleInputChange = (
    columnId: string,
    inputIndex: number,
    value: string
  ) => {
    setFormValues((prev) => {
      const currentValues = prev[columnId] || [""];
      const newValues = [...currentValues];
      newValues[inputIndex] = value;
      return { ...prev, [columnId]: newValues };
    });
  };

  const handleOrganizationChange = (
    columnId: string,
    inputIndex: number,
    value: string
  ) => {
    handleInputChange(columnId, inputIndex, value);
    // Only update selectedOrganizationId for the first input of organization columns
    if (inputIndex === 0) {
      setSelectedOrganizationId(value);
    }
  };

  const addInput = (columnId: string) => {
    setFormValues((prev) => {
      const currentValues = prev[columnId] || [""];
      return { ...prev, [columnId]: [...currentValues, ""] };
    });
  };

  const removeInput = (columnId: string, inputIndex: number) => {
    setFormValues((prev) => {
      const currentValues = prev[columnId] || [""];
      if (currentValues.length <= 1) return prev; // Keep at least one input

      const newValues = currentValues.filter(
        (_, index) => index !== inputIndex
      );
      return { ...prev, [columnId]: newValues };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDeadlineId) {
      alert("Iltimos, deadline tanlang");
      return;
    }

    // Check if organization is required and selected
    const hasOrganizationColumn = currentEmptyColumns.some((col) =>
      col.title.toLowerCase().includes("tashkilot")
    );

    if (hasOrganizationColumn && !selectedOrganizationId) {
      alert("Iltimos, tashkilot tanlang");
      return;
    }

    // Validate that all required fields (first input of each column) have values
    const emptyRequiredFields = currentEmptyColumns.filter((col) => {
      const columnValues = formValues[col.id] || [""];
      return !columnValues[0] || columnValues[0].trim() === "";
    });

    if (emptyRequiredFields.length > 0) {
      alert("Iltimos, barcha majburiy maydonlarni to'ldiring");
      return;
    }

    // Get all columns from all steps
    const allColumns = allEmptyColumnsByStep.flat();

    // Build report_items with new structure
    const report_items = allColumns.map((col) => {
      const columnValues = formValues[col.id] || [""];
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
          inners.push({ value: selectedOrganizationId || "" });
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
      deadline: selectedDeadlineId,
      report_items: report_items,
    };

    try {
      console.log(payload);
      const res = await createReportItem(payload).unwrap();
      console.log("Yuborildi:", res);
      removeCookie("reportId");
      setFormValues({});
      setSelectedDeadlineId("");
      setSelectedOrganizationId("");
      setCurrentStep(0);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Hisobotni yuborishda xatolik yuz berdi");
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
                <TableHead className="min-w-[400px]">Qiymat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                const isOrganizationColumn = col.title
                  .toLowerCase()
                  .includes("tashkilot");
                const columnValues = formValues[col.id] || [""];

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
};

export default DefaultCreate;
