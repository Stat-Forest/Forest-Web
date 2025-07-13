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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import {
  useCreateReportMutation,
  useGetDeadlinesReportQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";

function findEmptyChildrenColumnIds(children: any[]) {
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

function LeasedLandAccountCreate() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const navigate = useNavigate();
  const lang = useSelector((state: RootState) => state.language.lang);

  const {
    data: deadlines_list,
    isLoading: isDeadlinesLoading,
    error: deadlinesError,
  } = useGetDeadlinesReportQuery();
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
    { statementId: reportIds, lang },
    {
      skip: !reportIds,
      refetchOnMountOrArgChange: false,
    }
  );

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [planListMap] = useState<Record<string, number>>({});
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  // Extract the IDs of target columns for the sum
  const targetSumColumns = currentEmptyColumns.filter((col) =>
    col.fullParentChain.includes("Shundan imtiyozli maydon / Shundan")
  );
  const jamiColumn = currentEmptyColumns.find((col) =>
    col.fullParentChain.endsWith("Shundan imtiyozli maydon / Jami")
  );

  // Compute the sum of the 4 fields
  const calculatedJamiValue = targetSumColumns.reduce((sum, col) => {
    const val = parseFloat(formValues[col.id]) || 0;
    return sum + val;
  }, 0);

  useEffect(() => {
    if (jamiColumn) {
      setFormValues((prev) => ({
        ...prev,
        [jamiColumn.id]: calculatedJamiValue,
      }));
    }
  }, [calculatedJamiValue, jamiColumn?.id]);

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
    const report_items = allColumns.map((col) => ({
      statement_column: col.id,
      value: col.title.toLowerCase().includes("tashkilot")
        ? selectedOrganizationId
        : col.title.toLowerCase().includes("reja")
        ? String(planListMap[col.id] ?? "")
        : String(formValues[col.id] || "0"),
    }));

    const payload = {
      deadline: selectedDeadlineId,
      report_items,
    };

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

  if (isDeadlinesLoading || isHeaderLoading || isOrgLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;

  if (deadlinesError || headersError || orgError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi:</p>
        <ul className="list-disc list-inside">
          {deadlinesError && <li>Deadline ma'lumotlarini yuklashda xatolik</li>}
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
          <Select
            value={selectedDeadlineId}
            onValueChange={setSelectedDeadlineId}
            required
          >
            <SelectTrigger className="w-[300px] text-base">
              <SelectValue placeholder="Tanlang" />
            </SelectTrigger>
            <SelectContent>
              {deadlines_list?.results.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.submit_at}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                if (col.title.toLowerCase().includes("reja")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <Input
                          value={planListMap[col.id] ?? ""}
                          disabled
                          className="bg-gray-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }
                if (col.title.toLowerCase().includes("tashkilot")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell>
                        <select
                          value={selectedOrganizationId}
                          onChange={(e) => {
                            handleInputChange(col.id, e.target.value);
                            setSelectedOrganizationId(e.target.value);
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
                const isJami = jamiColumn?.id === col.id;
                return (
                  <TableRow key={col.id}>
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={
                          isJami
                            ? calculatedJamiValue.toString()
                            : formValues[col.id] || ""
                        }
                        disabled={isJami}
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
        <p>Ushbu qadamda to‘ldirish uchun ustunlar yo‘q.</p>
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

export default LeasedLandAccountCreate;
