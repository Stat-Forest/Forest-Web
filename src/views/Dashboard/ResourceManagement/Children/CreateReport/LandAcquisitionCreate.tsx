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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/store";
import {
  reportApi,
  useCreateReportMutation,
  useGetDeadlinesReportQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";

interface Column {
  id: string;
  title: string;
  children?: Column[];
}

interface EmptyColumn {
  id: string;
  title: string;
  fullParentChain: string;
}

function findEmptyChildrenColumnIds(children: any[]) {
  const result: EmptyColumn[] = [];
  interface TraverseColumn {
    id: string;
    title: string;
    children?: TraverseColumn[];
  }

  const traverse = (
    cols: TraverseColumn[],
    parentChain: string[] = []
  ): void => {
    cols.forEach((col: TraverseColumn) => {
      const currentChain = [...parentChain, col.title];
      if (col.children?.length) {
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

function LandAcquisitionCreate() {
  const dispatch = useDispatch<AppDispatch>();
  const reportIds = useSelector((state: RootState) => state.report.reportId);
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
    { statementId: reportIds, lang,isUser:"true" },
    {
      skip: !reportIds,
    }
  );

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [planListMap, setPlanListMap] = useState<Record<string, number>>({});
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    EmptyColumn[][]
  >([]);
  const [currentStep, setCurrentStep] = useState(0);

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const navigate = useNavigate();

  const [createReportItem, { isLoading: isSubmitting }] =
    useCreateReportMutation();

  // Fetch Reja plan value
  useEffect(() => {
    const fetchPlanLists = async () => {
      if (!selectedOrganizationId || !reportIds || !tableHeadersData.length)
        return;

      const allStepsEmptyCols: EmptyColumn[] = tableHeadersData.flatMap(
        (obj: { children?: Column[] }) =>
          Array.isArray(obj.children)
            ? findEmptyChildrenColumnIds(obj.children)
            : []
      );

      const rejaLeafColumns = allStepsEmptyCols.filter((col) =>
        col.title.toLowerCase().includes("reja")
      );

      const requests = rejaLeafColumns.map(async (col) => {
        try {
          const response = await dispatch(
            reportApi.endpoints.getPlanListReport.initiate({
              columnId: col.id,
              organization: selectedOrganizationId,
              statement: reportIds,
              page: "",
              search: "",
              year: "",
            })
          ).unwrap();
          return {
            columnId: col.id,
            planValue: response?.results[0]?.plan_value ?? 0,
          };
        } catch {
          return { columnId: col.id, planValue: 0 };
        }
      });

      const results = await Promise.all(requests);
      const newPlanMap = Object.fromEntries(
        results.map(({ columnId, planValue }) => [columnId, planValue])
      );
      setPlanListMap(newPlanMap);
    };

    fetchPlanLists();
  }, [selectedOrganizationId, reportIds, dispatch]);

  useEffect(() => {
    if (tableHeadersData.length) {
      interface TableHeaderData {
        children?: Column[];
      }
      const allStepsEmptyCols: EmptyColumn[][] = tableHeadersData.map(
        (obj: TableHeaderData) =>
          Array.isArray(obj.children)
            ? findEmptyChildrenColumnIds(obj.children)
            : []
      );
      setAllEmptyColumnsByStep(allStepsEmptyCols);
      setCurrentStep(0);
    }
  }, [tableHeadersData]);

  const handleInputChange = (id: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  // Calculate Amalda and Foiz
  const chorakKeys = useMemo(() => {
    return currentEmptyColumns
      .filter((col) => col.fullParentChain.toLowerCase().includes("chorak"))
      .map((col) => col.id);
  }, [currentEmptyColumns]);

  const rejaId = useMemo(() => {
    const reja = currentEmptyColumns.find((col) =>
      col.fullParentChain.toLowerCase().endsWith("reja")
    );
    return reja?.id;
  }, [currentEmptyColumns]);

  const amaldaId = useMemo(() => {
    const amalda = currentEmptyColumns.find((col) =>
      col.fullParentChain.toLowerCase().endsWith("amalda")
    );
    return amalda?.id;
  }, [currentEmptyColumns]);

  const foizId = useMemo(() => {
    const foiz = currentEmptyColumns.find((col) =>
      col.fullParentChain.toLowerCase().endsWith("foiz")
    );
    return foiz?.id;
  }, [currentEmptyColumns]);

  const amaldaValue = chorakKeys.reduce(
    (sum, key) => sum + (parseFloat(formValues[key]) || 0),
    0
  );
  const rejaValue = rejaId ? planListMap[rejaId] ?? 0 : 0;
  const foizValue = rejaValue
    ? ((amaldaValue / rejaValue) * 100).toFixed(2)
    : "0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeadlineId) return alert("Iltimos, deadline tanlang");
    if (
      currentEmptyColumns.some((col) =>
        col.title.toLowerCase().includes("tashkilot")
      ) &&
      !selectedOrganizationId
    ) {
      return alert("Iltimos, tashkilot tanlang");
    }

    const allColumns = allEmptyColumnsByStep.flat();
    const report_items = allColumns.map((col) => {
      let value: any;
      if (col.fullParentChain.toLowerCase().includes("tashkilot")) {
        value = selectedOrganizationId;
      } else if (col.id === rejaId) {
        value = planListMap[col.id] ?? "";
      } else if (col.id === amaldaId) {
        value = String(amaldaValue);
      } else if (col.id === foizId) {
        value = String(foizValue);
      } else {
        value = formValues[col.id] || "";
      }
      return { statement_column: col.id, value };
    });

    try {
      console.log(report_items);
      await createReportItem({
        deadline: selectedDeadlineId,
        report_items,
      }).unwrap();
      removeCookie("reportId");
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err?.data || err?.message);
    }
  };

  if (isDeadlinesLoading || isHeaderLoading || isOrgLoading)
    return <p className="p-4">Yuklanmoqda...</p>;

  if (deadlinesError || headersError || orgError)
    return <p className="text-red-500 p-4">Xatolik yuz berdi</p>;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 border rounded shadow"
    >
      <div>
        <label className="block mb-1">Deadline:</label>
        <Select
          value={selectedDeadlineId}
          onValueChange={setSelectedDeadlineId}
          required
        >
          <SelectTrigger className="w-[300px]">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ustun nomi</TableHead>
            <TableHead>Qiymat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentEmptyColumns.map((col) => {
            if (col.id === rejaId) {
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
            if (col.id === amaldaId) {
              return (
                <TableRow key={col.id}>
                  <TableCell>{col.fullParentChain}</TableCell>
                  <TableCell>
                    <Input
                      value={amaldaValue}
                      disabled
                      className="bg-gray-100"
                    />
                  </TableCell>
                </TableRow>
              );
            }
            if (col.id === foizId) {
              return (
                <TableRow key={col.id}>
                  <TableCell>{col.fullParentChain}</TableCell>
                  <TableCell>
                    <Input value={foizValue} disabled className="bg-gray-100" />
                  </TableCell>
                </TableRow>
              );
            }
            if (
              col.fullParentChain.toLowerCase().includes("tashkilot") ||
              col.fullParentChain
                .toLowerCase()
                .includes("наименование организации")
            ) {
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
                      required
                      className="w-full border px-2 py-1"
                    >
                      <option value="">Tanlang</option>
                      {organizationsData?.map((org: any) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
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
                <TableCell>
                  <Input
                    value={formValues[col.id] || ""}
                    onChange={(e) => handleInputChange(col.id, e.target.value)}
                    required
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          Oldingi
        </Button>
        {currentStep < allEmptyColumnsByStep.length - 1 ? (
          <Button type="button" onClick={() => setCurrentStep((s) => s + 1)}>
            Keyingi
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default LandAcquisitionCreate;
