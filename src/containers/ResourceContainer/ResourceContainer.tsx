import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { RootState } from "@/app/store";
import { setReportId } from "@/features/reportSlice";
import {
  useGetAllReportsQuery,
  useGetIndividualQuery,
  useGetDeadlinesReportQuery,
  useGetRepoblicReportQuery,
  useGetStatementColumnsReportQuery,
  useLazyGetReganalReportQuery,
} from "@/services/reportsApi";

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
import EmployeeAnalysisSum from "@/components/Sum/EmployeeAnalysis";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { exportToExcel } from "@/utils/exportToExcel";
import ReportChartItem from "@/components/Charts";
import { skipToken } from "@reduxjs/toolkit/query";
import { ReportColumn, ReportRow } from "@/types/reportInterface";
import { regions2 } from "@/services/constants";
import { useTranslation } from "react-i18next";

function ResourceContainer({ reportName }: { reportName: string }) {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef<any>(null);

  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const lang = useSelector((state: RootState) => state.language.lang);
  const { t, i18n } = useTranslation();

  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const [selectedOrganizationReport, setSelectedOrganizationReport] =
    useState("");
  const [selectedPeriodReport, setSelectedPeriodReport] = useState("");
  const [selectedStatusReport, setSelectedStatusReport] = useState("");
  const [searchTermReport, setSearchTermReport] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [deadlinePage, setDeadlinePage] = useState(1);
  const perPage = 5;

  const { data: deadline, isLoading: deadlineLoading } =
    useGetDeadlinesReportQuery(
      {
        statement: id || "",
        page: deadlinePage,
        perPage,
        statement__period: "",
      },
      { skip: !id }
    );

  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(
    { statementId: id || "", lang, isUser: "" },
    { skip: !id }
  );

  const {
    data: allReports = [],
    isLoading: isAllReportLoading,
    error: isAllReportError,
  } = useGetAllReportsQuery(
    id
      ? {
          statement: id,
          status: `status=${selectedStatusReport}`,
          organization__region: selectedOrganizationReport,
          statement__period: selectedPeriodReport,
          search: searchTermReport,
        }
      : skipToken
  );

  const [
    getRegionalReport,
    {
      data: tableRowsData = [],
      isLoading: isRowsLoading,
      isError: isErrorRows,
      isFetching: isRowsFetching,
    },
  ] = useLazyGetReganalReportQuery();

  const handleSearchRegional = () => {
    getRegionalReport({
      statement: id || "",
      region: selectedRegion,
      deadline: selectedPeriod,
    });
  };

  const {
    data: rupblic,
    isLoading: isRepublicLoading,
    isError: isRepublicError,
  } = useGetRepoblicReportQuery();

  const {
    data: individualReports,
    isLoading: isIndividualLoading,
    isError: isIndividualError,
  } = useGetIndividualQuery(
    {
      statement: id || "",
      deadline: selectedRow?.deadline || "",
      organization: selectedRow?.organization || "",
    },
    { skip: !id || !selectedRow?.deadline || !selectedRow?.organization }
  );

  const isLoading =
    isHeadersLoading ||
    isRowsLoading ||
    isRepublicLoading ||
    isAllReportLoading ||
    isIndividualLoading ||
    deadlineLoading;

  const isError =
    isErrorHeaders ||
    isErrorRows ||
    isRepublicError ||
    isAllReportError ||
    isIndividualError;

  useEffect(() => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedPeriod("");
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

  // 🔹 filteredRows: faqat reganal + republic
  const filteredRows = useMemo(() => {
    function filterRow(row: any): any {
      const filteredReportItems = (row.report_items || []).map(
        (reportItem: any) => {
          let filteredColumns = reportItem.statement_columns || [];

          // 🔹 barcha activeLeafIds bo‘yicha bo‘sh ustunlarni qo‘shamiz
          const normalizedColumns = activeLeafIds.map((colId) => {
            const found = filteredColumns.find(
              (c: any) => c.statement_column_id === colId
            );
            return (
              found || { statement_column_id: colId, value: "-", inners: [] }
            );
          });

          return {
            ...reportItem,
            statement_columns: normalizedColumns,
          };
        }
      );

      return {
        ...row,
        report_items: filteredReportItems,
        children_reports: (row.children_reports || []).map(filterRow),
      };
    }

    let rows: any[] = [];
    if (tableRowsData?.results?.length > 0) {
      rows = [...(tableRowsData?.results || []), ...(rupblic?.results || [])];
    }

    return rows.map(filterRow);
  }, [tableRowsData, rupblic, activeLeafIds]);

  // 🔹 Individual alohida
  const filteredIndividualRows = useMemo(() => {
    if (!individualReports?.results) return [];
    return individualReports.results.map((row: any) => ({
      ...row,
      report_items: (row.report_items || []).map((reportItem: any) => ({
        ...reportItem,
        statement_columns: (reportItem.statement_columns || []).filter(
          (col: any) => activeLeafIds.includes(col.statement_column_id)
        ),
      })),
    }));
  }, [individualReports, activeLeafIds]);

  // 🔹 Yangi: Export uchun ma'lumotlarni tayyorlash
  const getExportData = () => {
    if (!tableRef.current) {
      alert("Jadval ma'lumotlari topilmadi!");
      return null;
    }

    try {
      // Header qatorlarini olish
      const headerRows = tableRef.current.getHeaderRows?.() || [];

      // Body ma'lumotlarini tayyorlash
      const bodyRows = filteredRows.map((row: ReportRow, index: number) => {
        const rowData = [index + 1]; // TR raqami

        // Har bir row uchun report_items bo'yicha ma'lumotlarni yig'amiz
        row.report_items?.forEach((reportItem: any) => {
          reportItem.statement_columns?.forEach((col: any) => {
            // Faqat active tabdagi columnlarni qo'shamiz
            if (activeLeafIds.includes(col.statement_column_id)) {
              // Agar innerlar bo'lsa, ularni qo'shamiz
              if (col.inners && col.inners.length > 0) {
                col.inners.forEach((inner: any) => {
                  rowData.push(inner.value ?? "-");
                });
              } else {
                rowData.push(col.value ?? "-");
              }
            }
          });
        });

        return rowData;
      });

      return { headerRows, bodyRows };
    } catch (error) {
      console.error("Export data tayyorlashda xatolik:", error);
      return null;
    }
  };

  // 🔹 Yangi: To'g'ri print funksiyasi
  const handlePrint = () => {
    if (tableRef.current) {
      const printContents =
        tableRef.current.getPrintableTable?.() || tableRef.current.getTable?.();

      if (!printContents) {
        alert("Chop etish uchun ma'lumotlar topilmadi!");
        return;
      }

      const printWindow = window.open("", "_blank", "width=1200,height=800");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${reportName} - Hisobot</title>
              <style>
                body { 
                  font-family: 'Arial', sans-serif; 
                  margin: 25px;
                  direction: ${i18n.dir()};
                  color: #000;
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin-bottom: 30px;
                  font-size: 12px;
                }
                th, td { 
                  border: 1px solid #000; 
                  padding: 10px 8px; 
                  text-align: center;
                  vertical-align: middle;
                }
                th { 
                  background-color: #f8f9fa; 
                  font-weight: bold;
                  font-size: 11px;
                }
                .print-header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 3px solid #000;
                  padding-bottom: 15px;
                }
                .print-title {
                  font-size: 22px;
                  font-weight: bold;
                  margin-bottom: 8px;
                  text-transform: uppercase;
                }
                .print-subtitle {
                  font-size: 16px;
                  color: #444;
                  margin-bottom: 5px;
                }
                .print-date {
                  font-size: 14px;
                  color: #666;
                }
                .print-section {
                  margin-bottom: 20px;
                }
                .print-section-title {
                  font-size: 16px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  background-color: #f0f0f0;
                  padding: 8px 12px;
                  border-left: 4px solid #09B86F;
                }
                @media print {
                  body { margin: 15mm; }
                  .no-print { display: none !important; }
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
                  thead { display: table-header-group; }
                  tfoot { display: table-footer-group; }
                }
                .print-actions {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  background: white;
                  padding: 15px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  border: 1px solid #ddd;
                }
                .print-btn {
                  padding: 10px 20px;
                  background: #09B86F;
                  color: white;
                  border: none;
                  border-radius: 5px;
                  cursor: pointer;
                  font-size: 14px;
                  margin: 0 5px;
                }
                .print-btn.close {
                  background: #FF5445;
                }
                .print-btn:hover {
                  opacity: 0.9;
                }
              </style>
            </head>
            <body>
              <div class="print-header">
                <div class="print-title">${reportName}</div>
                <div class="print-subtitle">${activeTab}</div>
                <div class="print-date">${new Date().toLocaleDateString(
                  "uz-UZ",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  }
                )}</div>
              </div>
              
              <div class="print-section">
                <div class="print-section-title">Hisobot ma'lumotlari</div>
                ${printContents}
              </div>

              <div class="print-actions no-print">
                <button onclick="window.print()" class="print-btn">
                  ${t("print")}
                </button>
                <button onclick="window.close()" class="print-btn close">
                  ${t("close")}
                </button>
              </div>

              <script>
                // Avtomatik print
                setTimeout(() => {
                  window.print();
                }, 1000);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        alert(
          "Pop-up bloklandi. Iltimas, brauzeringizda pop-up'larni ruxsat bering."
        );
      }
    }
  };

  // 🔹 Yangi: Excel export funksiyasi
  const handleExportExcel = () => {
    const exportData = getExportData();

    if (!exportData) {
      alert("Eksport qilish uchun ma'lumotlar topilmadi!");
      return;
    }

    const { headerRows, bodyRows } = exportData;

    if (headerRows.length === 0 || bodyRows.length === 0) {
      alert("Eksport qilish uchun yetarli ma'lumotlar mavjud emas!");
      return;
    }

    try {
      const fileName = `${reportName}_${activeTab}_${new Date().toLocaleDateString(
        "uz-UZ"
      )}`;
      exportToExcel(headerRows, bodyRows, fileName);
    } catch (error) {
      console.error("Excel export xatosi:", error);
      alert("Excel faylni yuklab olishda xatolik yuz berdi!");
    }
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
          <AlertDescription>Qayta urinib ko'ring.</AlertDescription>
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
                <div>
                  <ReportChartItem
                    activeTab={activeTab}
                    reportName={reportName}
                  />
                </div>
                <div>
                  <EmployeeAnalysisSum
                    reportName={reportName}
                    activeTab={activeTab}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  {/* Filters */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0 w-full md:w-auto justify-end">
                    {(user_role === "tashkilot_hodimi" ||
                      user_role === "super_admin" ||
                      user_role === "hududiy_boshqarma") && (
                      <button
                        className="bg-[#09B86F] text-md font-semibold text-white w-full md:w-[220px] py-3 rounded"
                        onClick={() =>
                          navigate(`/resource-management/create/${reportName}`)
                        }
                      >
                        {t("createNewReport")}
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="py-2.5 font-semibold w-full md:w-[100px] rounded bg-[#09B86F] border-1 text-[white]">
                          {t("export")}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 mt-2 mr-2">
                        <DropdownMenuItem onClick={handleExportExcel}>
                          {t("exportExcel")}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={handlePrint}>
                          {t("printReport")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Search & Filters */}
                  <div className="flex flex-wrap gap-3 w-full md:w-auto ">
                    <Input
                      placeholder={`${t("item_79")}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-[250px] border-black min-h-[40px]"
                    />
                    <Select
                      value={selectedRegion}
                      onValueChange={setSelectedRegion}
                    >
                      <SelectTrigger className="w-full md:w-[220px] text-xl min-h-[40px] border-black">
                        <SelectValue placeholder={`${t("region")}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {regions2.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {i18n.language === "uz"
                              ? region.label
                              : region.label2}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedPeriod}
                      onValueChange={setSelectedPeriod}
                    >
                      <SelectTrigger className="w-full md:w-[220px] text-xl min-h-[40px] border-black">
                        <SelectValue placeholder={`${t("reportType")}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {deadline?.results?.length > 0 ? (
                          <>
                            <SelectItem value=" ">{`${t(
                              "allReports"
                            )}`}</SelectItem>
                            {deadline.results.map((item: any) => (
                              <SelectItem
                                key={item.id}
                                value={item.id.toString()}
                              >
                                {new Date(item.submit_at).toLocaleDateString(
                                  "uz-UZ"
                                )}
                              </SelectItem>
                            ))}

                            {/* ✅ Pagination Controls */}
                            <div className="flex items-center justify-between px-2 py-1 border-t">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={deadlinePage === 1}
                                onClick={() =>
                                  setDeadlinePage((p) => Math.max(p - 1, 1))
                                }
                              >
                                {t("before")}
                              </Button>
                              <span className="text-xs text-gray-500">
                                {deadlinePage} /{" "}
                                {Math.ceil(deadline.count / perPage)}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  deadlinePage ===
                                  Math.ceil(deadline.count / perPage)
                                }
                                onClick={() =>
                                  setDeadlinePage((p) =>
                                    Math.min(
                                      p + 1,
                                      Math.ceil(deadline.count / perPage)
                                    )
                                  )
                                }
                              >
                                {t("next")}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="p-2 text-center text-muted-foreground text-sm">
                            {t("noDeadlines")}
                          </div>
                        )}
                      </SelectContent>
                    </Select>

                    <Input
                      className="w-full border border-[black] md:w-[150px]"
                      type="number"
                      placeholder={`${t("year")}`}
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    />
                    <Button onClick={handleSearchRegional}>
                      {t("item_79")}
                    </Button>
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
                      onRowClick={(row: ReportRow) => {
                        // 🔹 Normalize qilamiz
                        const normalizedReportItems = (
                          row.report_items || []
                        ).map((reportItem: any) => {
                          const normalizedColumns = activeLeafIds.map(
                            (colId) => {
                              const found = (
                                reportItem.statement_columns || []
                              ).find(
                                (c: any) => c.statement_column_id === colId
                              );
                              return (
                                found || {
                                  statement_column_id: colId,
                                  value: "-",
                                  inners: [],
                                }
                              );
                            }
                          );

                          return {
                            ...reportItem,
                            statement_columns: normalizedColumns,
                          };
                        });

                        const normalizedRow = {
                          ...row,
                          report_items: normalizedReportItems,
                        };

                        setSelectedRow(normalizedRow);
                      }}
                      selectedRow={selectedRow}
                      individualRows={filteredIndividualRows}
                      setSelectedOrganizationReport={
                        setSelectedOrganizationReport
                      }
                      setSelectedPeriodReport={setSelectedPeriodReport}
                      setSelectedStatusReport={setSelectedStatusReport}
                      setSearchTermReport={setSearchTermReport}
                      selectedOrganizationReport={selectedOrganizationReport}
                      selectedPeriodReport={selectedPeriodReport}
                      selectedStatusReport={selectedStatusReport}
                      searchTermReport={searchTermReport}
                      allReports={allReports}
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
