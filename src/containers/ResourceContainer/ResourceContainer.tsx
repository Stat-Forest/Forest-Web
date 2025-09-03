import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { RootState } from "@/app/store";
import { setReportId } from "@/features/reportSlice";
import {
  useGetAllReportsQuery,
  useGetReganalReportQuery,
  useGetRepoblicReportQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import {
  useGetEmployeeAnalysisSumQuery,
  useGetEmployeeReportSumQuery,
  useGetFinanceFundSumQuery,
  useGetIncomeSumQuery,
  useGetLandAcquisitionSumQuery,
} from "@/services/sumApi";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Custom Components
import EmployeeAnalysisChart from "@/components/Charts/EmployeeAnalysisChart";
import EmployeeReportChart from "@/components/Charts/EmployeeReportChart";
import EmployeeFundChart from "@/components/Charts/FinanceFundChart";
import EmployeeIncomeChart from "@/components/Charts/FinanceIncomeChart";
import LandForestChart from "@/components/Charts/LandForestChart";
import LandRentedChart from "@/components/Charts/LandRentedChart";
import EmployeeAnalysisSum from "@/components/Sum/EmployeeAnalysis";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { exportToExcel } from "@/utils/exportToExcel";

interface ReportColumn {
  id: string;
  title: string;
  children?: ReportColumn[];
}

interface ReportItem {
  statement_column_id: string;
  statement_column_name: string;
  inners: Array<{
    id?: string;
    value: string;
  }>;
}

interface ReportRow {
  id: string;
  organization_name: string;
  report_items: Array<{
    organization_id: string;
    organization_name: string;
    statement_columns: ReportItem[];
  }>;
  children_reports?: ReportRow[];
  sent_by_full_name?: string;
  sent_by_org_name?: string;
  sent_by_role?: string;
}

function ResourceContainer({ reportName }: { reportName: string }) {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef<any>(null);

  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const lang = useSelector((state: RootState) => state.language.lang);
  const userCheckTable = user_role !== "tashkilot_hodimi";

  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(
    { statementId: id || "", lang, isUser: "" },
    { skip: !id }
  );

  const {
    data: allReports,
    isLoading: isAllReportLoading,
    isError: isAllReportError,
  } = useGetAllReportsQuery(
    {
      statement: id || "",
      status: "",
      organization__region: "",
      statement__period: "",
      search: "",
    },
    { skip: !id }
  );
  

  const {
    data: tableRowsData = [],
    isLoading: isRowsLoading,
    isError: isErrorRows,
    isFetching: isRowsFetching,
  } = useGetReganalReportQuery({ statement: id || "" }, { skip: !id });

  const {
    data: rupblic,
    isLoading: isRepublicLoading,
    isError: isRepublicError,
  } = useGetRepoblicReportQuery();

  console.log(tableRowsData?.results);

  // SUM API
  const { data: employeeAnalysisSum, isLoading: isEmployeeAnalysisLoading } =
    useGetEmployeeAnalysisSumQuery();
  const { data: financeIncomeSum, isLoading: isFinaceIncomeLoading } =
    useGetIncomeSumQuery();
  const { data: employeeReportSum, isLoading: isEmployeeReportSumLoading } =
    useGetEmployeeReportSumQuery();
  const { data: financeFundSum, isLoading: isFinaceFundSumLoading } =
    useGetFinanceFundSumQuery();
  const { data: landAcquisition, isLoading: isLandAcquisitionLoading } =
    useGetLandAcquisitionSumQuery();

  const isLoading =
    isHeadersLoading ||
    isRowsLoading ||
    isEmployeeAnalysisLoading ||
    isFinaceIncomeLoading ||
    isEmployeeReportSumLoading ||
    isFinaceFundSumLoading ||
    isRepublicLoading ||
    isLandAcquisitionLoading ||
    isAllReportLoading;

  const isError =
    isErrorHeaders || isErrorRows || isRepublicError || isAllReportError;

  useEffect(() => {
    setSearchTerm("");
    setSelectedRegion("all");
    setSelectedPeriod("all");
    setSelectedYear("");
  }, [id]);

  useEffect(() => {
    if (id) {
      dispatch(setReportId(id));
    }
  }, [id, dispatch]);

  const getLeafColumnIds = (nodes: ReportColumn[]): string[] => {
    let ids: string[] = [];
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        ids.push(node.id);
      } else {
        ids = [...ids, ...getLeafColumnIds(node.children)];
      }
    });
    return ids;
  };

  const tabLeafIdMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    tableHeadersData.forEach((col: ReportColumn) => {
      map[col.title] = getLeafColumnIds(col.children || []);
    });
    return map;
  }, [tableHeadersData]);

  useEffect(() => {
    if (tableHeadersData.length > 0 && !activeTab) {
      setActiveTab(tableHeadersData[0].title);
    }
  }, [tableHeadersData, activeTab]);

  const activeLeafIds = useMemo(() => {
    return tabLeafIdMap[activeTab] || [];
  }, [tabLeafIdMap, activeTab]);

  const filteredRows = useMemo(() => {
    function filterRow(row: any): any {
      const filteredReportItems = (row.report_items || []).map(
        (reportItem: any) => {
          let filteredColumns = reportItem.statement_columns || [];

          if (activeLeafIds.length > 0) {
            filteredColumns = filteredColumns
              .filter((col: any) =>
                activeLeafIds.includes(col.statement_column_id)
              )
              .map((col: any) => ({
                ...col,
                inners: col.inners || [],
              }));
          }

          return {
            ...reportItem,
            statement_columns: filteredColumns,
          };
        }
      );

      return {
        ...row,
        report_items: filteredReportItems,
        children_reports: (row.children_reports || []).map(filterRow), // rekursiv
      };
    }

    // 🔹 Ikkala endpointni qo‘shib yuboramiz
    const rows = [
      ...(tableRowsData?.results || []),
      ...(rupblic?.results || []),
    ];

    return rows.map(filterRow);
  }, [tableRowsData, rupblic, activeLeafIds]);

  console.log(filteredRows);

  const handlePrint = () => {
    if (tableRef.current) {
      const printContents = tableRef.current.getTable();
      const printWindow = window.open("", "", "height=600,width=800");
      if (printWindow) {
        printWindow.document.write(
          "<html><head><title>Hisobot</title></head><body>"
        );
        printWindow.document.write(printContents);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const chartComponents: Record<string, React.ReactNode> = {
    Daromad: (
      <EmployeeIncomeChart activeTab={activeTab} data={"financeChart"} />
    ),
    "Jamg'arma": <EmployeeFundChart activeTab={activeTab} />,
    "Xodimlar hisobi": <EmployeeReportChart activeTab={activeTab} />,
    "Xodimlar hisobi taxlili": <EmployeeAnalysisChart activeTab={activeTab} />,
    "94872f60-abd7-45d7-9764-e12cfeee3b35": (
      <LandForestChart activeTab={activeTab} />
    ),
    "b1f640a8-0f23-4130-8f5a-646af6898595": (
      <LandRentedChart activeTab={activeTab} />
    ),
  };

  const sumComponents: Record<string, React.ReactNode> = {
    Daromad: (
      <EmployeeAnalysisSum activeTab={activeTab} data={financeIncomeSum} />
    ),
    "Xodimlar hisobi taxlili": (
      <EmployeeAnalysisSum activeTab={activeTab} data={employeeAnalysisSum} />
    ),
    "Xodimlar hisobi": (
      <EmployeeAnalysisSum activeTab={activeTab} data={employeeReportSum} />
    ),
    "Jamg'arma": (
      <EmployeeAnalysisSum activeTab={activeTab} data={financeFundSum} />
    ),
    "Yer o‘zlashtirish": (
      <EmployeeAnalysisSum activeTab={activeTab} data={landAcquisition} />
    ),
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center py-10 w-full h-[20vh]">
        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
      </div>
    );

  if (isError) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Alert variant="destructive">
          <AlertTitle>Xatolik yuz berdi</AlertTitle>
          <AlertDescription>Qayta urinib ko‘ring.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-3">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setSelectedRow(null);
        }}
        className="w-full"
      >
        <TabsList className="w-full border overflow-x-auto border-[#A3A3A3] min-h-[50px] justify-start px-3">
          {tableHeadersData.map((col: ReportColumn) => (
            <TabsTrigger
              key={col.id}
              value={col.title}
              className="max-w-[400px] min-w-[130px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
            >
              {col.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {tableHeadersData.map((col: ReportColumn) => (
          <TabsContent key={col.id} value={col.title}>
            {activeTab === col.title && (
              <>
                <div>{chartComponents[reportName] || null}</div>
                <div>{sumComponents[reportName] || null}</div>

                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  {/* Filters */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0 w-full md:w-auto justify-end">
                    {(user_role === "tashkilot_hodimi" ||
                      user_role === "super_admin" ||
                      user_role === "hududiy_boshqarma") && (
                      <button
                        className="bg-[#09B86F] text-md font-semibold text-white w-full md:w-[220px] py-3 rounded"
                        onClick={() => navigate("/resource-management/create")}
                      >
                        Yangi hisobot yaratish
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="py-2.5 font-semibold w-full md:w-[100px] rounded bg-[#09B86F] border-1 text-[white]">
                          Export
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 mt-2 mr-2">
                        <DropdownMenuItem
                          onClick={() => {
                            const headerRows =
                              tableRef.current?.getHeaderRows?.();
                            const bodyRows = filteredRows.map(
                              (row: ReportRow, index: number) => [
                                index + 1,
                                ...row.report_items.map(
                                  (item: any) => item.value ?? "-"
                                ),
                                "✏️🗑️",
                              ]
                            );

                            if (headerRows && bodyRows) {
                              exportToExcel(headerRows, bodyRows);
                            } else {
                              alert("Jadvalni eksport qilishda xatolik!");
                            }
                          }}
                        >
                          Hisobotni export qilib olish
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={handlePrint}>
                          Hisobotni chop etish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Search & Filters */}
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Input
                      placeholder="Qidiruv"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-[250px]"
                    />
                    <Select
                      value={selectedRegion}
                      onValueChange={setSelectedRegion}
                    >
                      <SelectTrigger className="w-full md:w-[220px] text-xl min-h-[40px] border-black">
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Barcha regionlar</SelectItem>
                        <SelectItem value="toshkent_shahri">
                          Toshkent shahri
                        </SelectItem>
                        <SelectItem value="toshkent_viloyati">
                          Toshkent viloyati
                        </SelectItem>
                        <SelectItem value="andijon_viloyati">
                          Andijon viloyati
                        </SelectItem>
                        <SelectItem value="fargona_viloyati">
                          Farg'ona viloyati
                        </SelectItem>
                        <SelectItem value="namangan_viloyati">
                          Namangan viloyati
                        </SelectItem>
                        <SelectItem value="samarqand_viloyati">
                          Samarqand viloyati
                        </SelectItem>
                        <SelectItem value="buxoro_viloyati">
                          Buxoro viloyati
                        </SelectItem>
                        <SelectItem value="xorazm_viloyati">
                          Xorazm viloyati
                        </SelectItem>
                        <SelectItem value="surxondaryo_viloyati">
                          Surxondaryo viloyati
                        </SelectItem>
                        <SelectItem value="qashqadaryo_viloyati">
                          Qashqadaryo viloyati
                        </SelectItem>
                        <SelectItem value="jizzax_viloyati">
                          Jizzax viloyati
                        </SelectItem>
                        <SelectItem value="sirdaryo_viloyati">
                          Sirdaryo viloyati
                        </SelectItem>
                        <SelectItem value="navoiy_viloyati">
                          Navoiy viloyati
                        </SelectItem>
                        <SelectItem value="qoraqalpogiston">
                          Qoraqalpog'iston Respublikasi
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedPeriod}
                      onValueChange={setSelectedPeriod}
                    >
                      <SelectTrigger className="w-full md:w-[220px] text-xl min-h-[40px] border-black">
                        <SelectValue placeholder="Hisobot turi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Barcha hisobotlar</SelectItem>
                        <SelectItem value="daily">Kunlik</SelectItem>
                        <SelectItem value="weekly">Haftalik</SelectItem>
                        <SelectItem value="monthly">Oylik</SelectItem>
                        <SelectItem value="quarterly">
                          Choraklik (3 oy)
                        </SelectItem>
                        <SelectItem value="yearly">Yillik</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-full border border-[black] md:w-[150px]"
                      type="number"
                      placeholder="Yili"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    />
                    <Button>Qidiruv</Button>
                  </div>
                </div>

                <div>
                  {isRowsFetching ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
                    </div>
                  ) : (
                    <TableColumn
                      ref={tableRef}
                      data={col?.children}
                      rows={filteredRows}
                      onRowClick={(row: ReportRow) => setSelectedRow(row)}
                      selectedRow={selectedRow}
                      userCheckTable={userCheckTable}
                      tableRowsData={allReports}
                      statement_id={id}
                    />
                  )}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default ResourceContainer;
