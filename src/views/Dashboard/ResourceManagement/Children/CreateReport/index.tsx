"use client";

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
  useCreateReportMutation,
  useGetDeadlinesReportQuery,
  useGetPlanListReportQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function findEmptyChildrenColumnIds(
  columns: any[],
  parentChain: string[] = []
): { id: string; title: string; fullParentChain: string }[] {
  let result: { id: string; title: string; fullParentChain: string }[] = [];

  columns.forEach((col) => {
    const currentChain = [...parentChain];
    if (col.title) currentChain.push(col.title);

    if (Array.isArray(col.children)) {
      if (col.children.length === 0) {
        result.push({
          id: col.id,
          title: col.title,
          fullParentChain: currentChain.join(" > "),
        });
      } else {
        result = result.concat(
          findEmptyChildrenColumnIds(col.children, currentChain)
        );
      }
    } else {
      result.push({
        id: col.id,
        title: col.title,
        fullParentChain: currentChain.join(" > "),
      });
    }
  });

  return result;
}

function CreateReportItem() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

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
  } = useGetStatementColumnsReportQuery(reportIds as string, {
    skip: !reportIds,
  });

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();

  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];

  const rejaColumn = currentEmptyColumns.find((col) =>
    col.title.toLowerCase().includes("reja")
  );

  const {
    data: plan_list,
    isLoading: isPlanListLoading,
    error: planListError,
  } = useGetPlanListReportQuery(rejaColumn ? rejaColumn.id : "", {
    skip: !rejaColumn,
  });

  useEffect(() => {
    if (tableHeadersData.length > 0) {
      const allStepsEmptyCols = tableHeadersData.map((obj: any) => {
        if (Array.isArray(obj.children)) {
          return findEmptyChildrenColumnIds(obj.children);
        }
        return [];
      });

      setAllEmptyColumnsByStep(allStepsEmptyCols);
      setCurrentStep(0);
    } else {
      setAllEmptyColumnsByStep([]);
      setCurrentStep(0);
    }
  }, [tableHeadersData]);

  const handleInputChange = (id: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDeadlineId) {
      alert("Iltimos, deadline tanlang");
      return;
    }

    // Barcha stepdagi ustunlarni bitta massivga to‘plash
    const allColumns = allEmptyColumnsByStep.flat();

    // report_items yaratish - barcha ustunlar bo‘yicha formValues dan qiymat olish
    const report_items = allColumns.map((col) => ({
      statement_column: col.id,
      value: String(formValues[col.id] || "15"),
    }));

    const payload = {
      deadline: selectedDeadlineId,
      report_items,
    };

    console.log("Yuboriladigan ma'lumot:", payload);

    try {
      const res = await createReportItem(payload).unwrap();
      console.log("Yuborildi:", res);
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

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-full m-6 p-6 border rounded-lg shadow space-y-6"
    >
      <div>
        <label className="block mb-1 text-sm font-medium">Deadline:</label>
        <Select
          value={selectedDeadlineId}
          onValueChange={(value) => setSelectedDeadlineId(value)}
          required
        >
          <SelectTrigger className="w-[300px] text-lg">
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

      {currentEmptyColumns.length > 0 ? (
        <div className="overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">
            Qadam {currentStep + 1} / {totalSteps}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="min-w-[300px]">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmptyColumns.map((col) => {
                if (col.title.toLowerCase().includes("reja")) {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell className="min-w-[300px]">
                        {isPlanListLoading ? (
                          <p>Yuklanmoqda...</p>
                        ) : planListError ? (
                          <p className="text-red-500">
                            Reja ro'yxatini olishda xatolik
                          </p>
                        ) : (
                          <Input
                            type="text"
                            value={plan_list?.count ?? ""}
                            disabled
                            className="bg-gray-100"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }

                if (col.title === "Tashkilot nomi") {
                  return (
                    <TableRow key={col.id}>
                      <TableCell>{col.fullParentChain}</TableCell>
                      <TableCell className="min-w-[300px]">
                        <select
                          value={formValues[col.id] || ""}
                          onChange={(e) =>
                            handleInputChange(col.id, e.target.value)
                          }
                          className="w-full border rounded px-2 py-1"
                          required
                        >
                          <option value="">Tanlang</option>
                          {organizationsData?.results.map((item: any) => (
                            <option key={item.id} value={item?.id}>
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
                    <TableCell>{col.fullParentChain}</TableCell>
                    <TableCell className="min-w-[300px]">
                      <Input
                        type="text"
                        value={formValues[col.id] || "15"}
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
        <p>Ushbu qadamda to'ldirish uchun ustunlar mavjud emas.</p>
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

export default CreateReportItem;
