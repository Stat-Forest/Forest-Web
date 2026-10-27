import { useState, useEffect, useMemo, useRef } from "react";
import { escapeHtml } from "@/features/billing/escapeHtml";
import { useDebounce } from "@/utils/useDebounce";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { RootState } from "@/app/store";
import { setReportId } from "@/features/reportSlice";
import {
  useGetAllReportsQuery,
  useGetIndividualQuery,
  useGetDeadlinesReportQuery,
  useGetStatementColumnsReportQuery,
  useLazyGetReganalReportQuery,
} from "@/services/reportsApi";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import ImportTemplateButton from "@/components/ImportExcelButton/ImportTemplateButton";

// Custom Components
// import EmployeeAnalysisSum from "@/components/Sum/EmployeeAnalysis";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import ReportChartItem from "@/components/Charts";
import { skipToken } from "@reduxjs/toolkit/query";
import { ReportColumn, ReportRow } from "@/types/reportInterface";
import { normalizeSelectedRow, useSelectedReportRow } from "./useSelectedReportRow";
import { useTranslation } from "react-i18next";
import ExportDropdown from "./Components/ExportDropdown";
import FiltersSection from "./Components/FiltersSection";

function ResourceContainer({
  reportName,
  isFinance = false,
}: {
  reportName: string;
  isFinance?: boolean;
}) {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef<any>(null);

  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const lang = useSelector((state: RootState) => state.language.lang);
  const { pickedRow, fullRow, setSelectedRow } = useSelectedReportRow(id, lang);
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const [selectedOrganizationReport, setSelectedOrganizationReport] =
    useState("");
  const [selectedPeriodReport, setSelectedPeriodReport] = useState("");
  const [selectedStatusReport, setSelectedStatusReport] = useState("");
  const [searchTermReport, setSearchTermReport] = useState("");
  // Har harfda emas, yozish to'xtagach 300 ms dan keyin so'rov ketadi
  const debouncedSearchTermReport = useDebounce(searchTermReport, 300);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");
  const [deadlinePage, setDeadlinePage] = useState(1);
  const perPage = 5;

  // ✅ tableHeadersData ni birinchi bo'lib e'lon qilamiz
  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(
    { statementId: id || "", lang, isUser: "" },
    { skip: !id },
  );


  const { data: deadline, isLoading: deadlineLoading } =
    useGetDeadlinesReportQuery(
      {
        statement: id || "",
        page: deadlinePage,
        perPage,
        statement__period: "",
        is_new_deadline: "false",
      },
      { skip: !id },
    );

  const { data: allReports = [], error: isAllReportError } = useGetAllReportsQuery(
    id
      ? {
          statement: id,
          status: `status=${selectedStatusReport}`,
          organization__region: selectedOrganizationReport,
          statement__period: selectedPeriodReport,
          search: debouncedSearchTermReport,
          page: 1,
          per_page: 2000,
          lang,
          compact: true,
        }
      : skipToken,
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
      quarter: selectedQuarter,
    });
  };

  const { data: individualReports, isError: isIndividualError } = useGetIndividualQuery(
    {
      statement: id || "",
      deadline: pickedRow?.deadline || "",
      organization: pickedRow?.organization || "",
    },
    { skip: !id || !pickedRow?.deadline || !pickedRow?.organization },
  );

  // Ro'yxat va tanlangan hisobot yuklanishi butun sahifani skeleton'ga o'tkazmaydi
  // (avval birinchi qator bosilganda sahifa qayta skeleton bo'lib, jadval qayta chizilardi).
  const isLoading = isHeadersLoading || isRowsLoading || deadlineLoading;

  const isError =
    isErrorHeaders ||
    isErrorRows ||
    isAllReportError ||
    isIndividualError;

  useEffect(() => {
    setActiveTab("");
    setSelectedRow(null);
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedPeriod("");
    setSelectedYear("");
    setSelectedQuarter("");
  }, [id, setSelectedRow]);

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
    if (tableHeadersData.length > 0) {
      const exists = tableHeadersData.some((col: any) => col.title === activeTab);
      if (!activeTab || !exists) {
        setActiveTab(tableHeadersData[0].title);
      }
    }
  }, [tableHeadersData, activeTab]);

  const activeLeafIds = useMemo(() => {
    return tabLeafIdMap[activeTab] || [];
  }, [tabLeafIdMap, activeTab]);

  const selectedRow = useMemo(
    () => normalizeSelectedRow(pickedRow, fullRow, activeLeafIds),
    [pickedRow, fullRow, activeLeafIds],
  );

  // 🔹 filteredRows: faqat reganal + republic
  const filteredRows = useMemo(() => {
    function filterRow(row: any): any {
      const filteredReportItems = (row.report_items || []).map(
        (reportItem: any) => {
          let filteredColumns = reportItem.statement_columns || [];

          // 🔹 barcha activeLeafIds bo'yicha bo'sh ustunlarni qo'shamiz
          const normalizedColumns = activeLeafIds.map((colId) => {
            const found = filteredColumns.find(
              (c: any) => c.statement_column_id === colId,
            );
            return (
              found || { statement_column_id: colId, value: "-", inners: [] }
            );
          });

          return {
            ...reportItem,
            statement_columns: normalizedColumns,
          };
        },
      );

      return {
        ...row,
        report_items: filteredReportItems,
        children_reports: (row.children_reports || []).map(filterRow),
      };
    }

    let rows: any[] = [];
    if (tableRowsData?.results?.length > 0) {
      rows = [...(tableRowsData?.results || [])];
    }

    return rows.map(filterRow);
  }, [tableRowsData, activeLeafIds]);

  // 🔹 Individual alohida
  const filteredIndividualRows = useMemo(() => {
    if (!individualReports?.results) return [];
    return individualReports.results.map((row: any) => ({
      ...row,
      report_items: (row.report_items || []).map((reportItem: any) => ({
        ...reportItem,
        statement_columns: (reportItem.statement_columns || []).filter(
          (col: any) => activeLeafIds.includes(col.statement_column_id),
        ),
      })),
    }));
  }, [individualReports, activeLeafIds]);

  // 🔹 Print HTML yaratish funksiyasi (PDF export uchun ham ishlatiladi)
  const getPrintHTML = (): string => {
    if (!tableRef.current) {
      return "";
    }

    const printContents =
      tableRef.current.getPrintableTable?.() || tableRef.current.getTable?.();

    if (!printContents) {
      return "";
    }

    return `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${escapeHtml(reportName)} - Hisobot</title>
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
                  font-size: 11px;
                  table-layout: fixed;
                }
                th, td { 
                  border: 1px solid #000; 
                  padding: 8px 6px; 
                  text-align: center;
                  vertical-align: middle;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                th { 
                  background-color: #f8f9fa !important; 
                  font-weight: bold;
                  font-size: 10px;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                td {
                  font-size: 10px;
                }
                thead {
                  display: table-header-group;
                }
                tbody {
                  display: table-row-group;
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
                  border-left: 4px solid #3B82F6;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                .mt-8 {
                  margin-top: 30px;
                  display: flex;
                  align-items: center;
                  gap: 16px;
                }
                .mt-8 h2 {
                  margin: 0;
                  font-size: 14px;
                }
                @media print {
                  body { 
                    margin: 10mm; 
                    font-size: 10px;
                  }
                  .no-print { display: none !important; }
                  table { 
                    page-break-inside: auto;
                    width: 100%;
                    font-size: 9px;
                  }
                  tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto; 
                  }
                  thead { 
                    display: table-header-group; 
                  }
                  tfoot { 
                    display: table-footer-group; 
                  }
                  th, td {
                    padding: 6px 4px;
                    font-size: 9px;
                  }
                  @page {
                    size: A4 landscape;
                    margin: 10mm;
                  }
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
                  background: #3B82F6;
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
                <div class="print-title">${escapeHtml(reportName)}</div>
                <div class="print-subtitle">${escapeHtml(activeTab)}</div>
                <div class="print-date">${new Date().toLocaleDateString(
                  "uz-UZ",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  },
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
        `;
  };

  // 🔹 Yangi: To'g'ri print funksiyasi
  const handlePrint = () => {
    const printHTML = getPrintHTML();

    if (!printHTML) {
      alert("Chop etish uchun ma'lumotlar topilmadi!");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
    } else {
      alert(
        "Pop-up bloklandi. Iltimas, brauzeringizda pop-up'larni ruxsat bering.",
      );
    }
  };

  // Skeleton Loading Components
  const TabSkeleton = () => (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-32 rounded-md" />
      ))}
    </div>
  );

  const FilterSkeleton = () => (
    <div className="flex flex-wrap gap-3 w-full md:w-auto">
      <Skeleton className="h-10 w-full md:w-[250px] rounded-md" />
      <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
      <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
      <Skeleton className="h-10 w-full md:w-[150px] rounded-md" />
      <Skeleton className="h-10 w-20 rounded-md" />
    </div>
  );

  const TableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );

  if (isLoading)
    return (
      <div className="py-3 space-y-4">
        {/* Tabs Skeleton */}
        <TabSkeleton />

        {/* Chart Section Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>

        {/* Analysis Section Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex gap-3 w-full md:w-auto">
              <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
              <Skeleton className="h-10 w-full md:w-[150px] rounded-md" />
            </div>
            <FilterSkeleton />
          </div>
        </div>

        {/* Table Skeleton */}
        <TableSkeleton />
      </div>
    );

  if (isError) {
    return (
      <div
        className="flex justify-center items-center h-[80vh]"
      >
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
        {isHeadersLoading ? (
          <TabSkeleton />
        ) : (
          <TabsList
            className="w-full border border-slate-200 dark:border-slate-800 h-[52px] justify-start px-2 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xs gap-1.5 overflow-x-auto my-2 backdrop-blur-md transition-colors"
          >
            {tableHeadersData.map((col: ReportColumn) => (
              <TabsTrigger
                key={col.id}
                value={col.title}
                className="max-w-[400px] min-w-[120px] h-[38px] px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white data-[state=active]:!bg-blue-600 dark:data-[state=active]:!bg-blue-600 data-[state=active]:!text-white dark:data-[state=active]:!text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                {col.title}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {tableHeadersData.map((col: ReportColumn) => (
          <TabsContent key={col.id} value={col.title}>
            {activeTab === col.title && (
              <>
                <div>
                  {isRowsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48 rounded-md" />
                      <Skeleton className="h-64 w-full rounded-md" />
                    </div>
                  ) : (
                    <ReportChartItem
                      activeTab={activeTab}
                      reportName={reportName}
                      statmentId={id || ""}
                    />
                  )}
                </div>

                {/* <div>
                  {isRowsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48 rounded-md" />
                      <Skeleton className="h-32 w-full rounded-md" />
                    </div>
                  ) : (
                    <EmployeeAnalysisSum
                      reportName={reportName}
                      activeTab={activeTab}
                    />
                  )}
                </div> */}

                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  {/* Action Button */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0 w-full md:w-auto justify-start">
                    {user_role === "tashkilot_hodimi" && (
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Excel import — "Yangi hisobot yaratish" sahifasining ichida */}
                        <button
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 h-[40px] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                          onClick={() =>
                            navigate(
                              `/resource-management/create/${reportName}`,
                            )
                          }
                        >
                          {t("createNewReport")}
                        </button>
                        {/* Import uchun bo'sh Excel shabloni */}
                        <ImportTemplateButton statementId={id || undefined} />
                      </div>
                    )}
                  </div>

                  {/* Search & Filters & Export */}
                  <FiltersSection
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedRegion={selectedRegion}
                    setSelectedRegion={setSelectedRegion}
                    selectedPeriod={selectedPeriod}
                    setSelectedPeriod={setSelectedPeriod}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    selectedQuarter={selectedQuarter}
                    setSelectedQuarter={setSelectedQuarter}
                    showQuarterFilter={Boolean(isFinance || reportName === "Daromad" || reportName === "Доход")}
                    deadline={deadline}
                    deadlinePage={deadlinePage}
                    setDeadlinePage={setDeadlinePage}
                    perPage={perPage}
                    onSearch={handleSearchRegional}
                    isLoading={isRowsLoading}
                    exportComponent={
                      <ExportDropdown
                        tableRef={tableRef}
                        onPrint={handlePrint}
                        reportsData={tableRowsData}
                        reportName={reportName}
                        activeTab={activeTab}
                        getPrintHTML={getPrintHTML}
                      />
                    }
                  />
                </div>

                <div>
                  {isRowsFetching ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-6 w-48 rounded-md" />
                        <Skeleton className="h-6 w-24 rounded-md" />
                      </div>
                      <TableSkeleton />
                    </div>
                  ) : (
                    <TableColumn
                      reportName={reportName}
                      ref={tableRef}
                      data={col?.children}
                      rows={filteredRows}
                      onRowClick={(row: ReportRow | null) => setSelectedRow(row)}
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
