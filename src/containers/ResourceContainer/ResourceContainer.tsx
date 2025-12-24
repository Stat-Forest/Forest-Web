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
  useGetReportPlantByIdQuery,
} from "@/services/reportsApi";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Custom Components
import EmployeeAnalysisSum from "@/components/Sum/EmployeeAnalysis";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { exportToExcel } from "@/utils/exportToExcel";
import ReportChartItem from "@/components/Charts";
import { skipToken } from "@reduxjs/toolkit/query";
import { ReportColumn, ReportRow } from "@/types/reportInterface";
import { useTranslation } from "react-i18next";
import ExportDropdown from "./Components/ExportDropdown";
import FiltersSection from "./Components/FiltersSection";

// AOS lazy loading - faqat kerak bo'lganda yuklash
let AOS: any = null;
const loadAOS = async () => {
  if (!AOS) {
    const aosModule = await import("aos");
    AOS = aosModule.default;
    await import("aos/dist/aos.css");
  }
  return AOS;
};

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

  // ✅ Faqat shu statement id larda plant-report ko'rsatamiz
  const enablePlantDetail =
    id === "61ae3c83-1f9c-4ec8-bb06-0c2fc35d0a00" || // Ko‘chat va Nihol
    id === "0efead0e-25c3-44ab-8200-c2a7628dca8f" || // Urug' xarakati Reja
    (reportName && [
      "Ko'chat va Nihol",
      "Urug' xarakati Reja",
      "Посевной материал План",
      "Саженцы и саженцы",
      "Urug' harakati",
      "Питомник и Саженец Всего",
      "Движение семян",
      "Ko'chatxona va Niholxona Jami",
      "Shakl 8-O'X",
      "Форма 8-Ох",
      "Shakl 9-O'X",
      "Форма 9-Ох",
      "Shakl 10-O'X",
      "Форма 10-Ох",
      "Shakl 11-O'X",
      "Форма 11-Ох",
    ].includes(reportName));

  // ✅ tableHeadersData ni birinchi bo'lib e'lon qilamiz
  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(
    { statementId: id || "", lang, isUser: "" },
    { skip: !id }
  );

  // AOS'ni lazy load qilamiz - blocking operatsiyalarni oldini olish uchun
  useEffect(() => {
    const initAOS = async () => {
      try {
        const aos = await loadAOS();
        aos.init({
          duration: 400,
          easing: "ease-in-out",
          once: true,
          offset: 30,
        });
        // Refresh AOS when data loads
        aos.refresh();
      } catch (error) {
        console.warn("AOS yuklanmadi:", error);
      }
    };

    // Defer AOS initialization - sahifa render bo'lgandan keyin
    const timeoutId = setTimeout(initAOS, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // ✅ AOS refresh'ni ham async qilamiz
  useEffect(() => {
    const refreshAOS = async () => {
      try {
        const aos = await loadAOS();
        aos.refresh();
      } catch (error) {
        console.warn("AOS refresh xatolik:", error);
      }
    };

    if (tableHeadersData.length > 0 || activeTab) {
      const timeoutId = setTimeout(refreshAOS, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [tableHeadersData, activeTab]);

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
          // time_status: "",
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

  const {
    data: _plantById,
    isLoading: isPlantByIdLoading,
    error: isPlantByIdError,
  } = useGetReportPlantByIdQuery(
    { id: selectedRow?.id || "" },
    { skip: !enablePlantDetail || !selectedRow?.id }
  );

  const isLoading =
    isHeadersLoading ||
    isRowsLoading ||
    isRepublicLoading ||
    isAllReportLoading ||
    isIndividualLoading ||
    deadlineLoading ||
    isPlantByIdLoading;

  const isError =
    isErrorHeaders ||
    isErrorRows ||
    isRepublicError ||
    isAllReportError ||
    isIndividualError ||
    isPlantByIdError;

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
  }, [tableHeadersData]);

  const activeLeafIds = useMemo(() => {
    return tabLeafIdMap[activeTab] || [];
  }, [tabLeafIdMap, activeTab]);

  // 🔹 filteredRows: faqat reganal + republic
  const filteredRows = useMemo(() => {
    function filterRow(row: any): any {
      const filteredReportItems = (row.report_items || []).map(
        (reportItem: any) => {
          let filteredColumns = reportItem.statement_columns || [];

          // 🔹 barcha activeLeafIds bo'yicha bo'sh ustunlarni qo'shamiz
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

  // Skeleton Loading Components
  const TabSkeleton = () => (
    <div className="flex space-x-2 overflow-x-auto pb-2" data-aos="fade-down">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-32 rounded-md" />
      ))}
    </div>
  );

  const FilterSkeleton = () => (
    <div className="flex flex-wrap gap-3 w-full md:w-auto" data-aos="fade-up">
      <Skeleton className="h-10 w-full md:w-[250px] rounded-md" />
      <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
      <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
      <Skeleton className="h-10 w-full md:w-[150px] rounded-md" />
      <Skeleton className="h-10 w-20 rounded-md" />
    </div>
  );

  const TableSkeleton = () => (
    <div className="space-y-3" data-aos="fade-in">
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
        <div className="space-y-2" data-aos="fade-up">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>

        {/* Analysis Section Skeleton */}
        <div className="space-y-2" data-aos="fade-up" data-aos-delay="100">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex gap-3 w-full md:w-auto" data-aos="fade-right">
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
        data-aos="zoom-in"
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
            className="w-full border overflow-x-auto border-[#A3A3A3] min-h-[50px] justify-start px-3 bg-ice"
            data-aos="fade-down"
          >
            {tableHeadersData.map((col: ReportColumn) => (
              <TabsTrigger
                key={col.id}
                value={col.title}
                className="max-w-[400px] min-w-[130px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#3B82F6] data-[state=active]:text-[#000]"
                data-aos="fade-up"
                data-aos-delay={20 * tableHeadersData.indexOf(col)}
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
                <div data-aos="fade-up">
                  {isRowsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48 rounded-md" />
                      <Skeleton className="h-64 w-full rounded-md" />
                    </div>
                  ) : (
                    <ReportChartItem
                      activeTab={activeTab}
                      reportName={reportName}
                    />
                  )}
                </div>

                <div>
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
                </div>

                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  {/* Filters */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0 w-full md:w-auto justify-end">
                    {(user_role === "tashkilot_hodimi" ||
                      user_role === "hududiy_boshqarma") && (
                      <button
                        className="bg-[#3B82F6] text-md font-semibold text-white w-full md:w-[220px] py-3 rounded hover:bg-[#2563EB] transition-colors duration-300"
                        onClick={() =>
                          navigate(`/resource-management/create/${reportName}`)
                        }
                      >
                        {t("createNewReport")}
                      </button>
                    )}
                    <ExportDropdown
                      onExportExcel={handleExportExcel}
                      onPrint={handlePrint}
                    />
                  </div>

                  {/* Search & Filters */}
                  <FiltersSection
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedRegion={selectedRegion}
                    setSelectedRegion={setSelectedRegion}
                    selectedPeriod={selectedPeriod}
                    setSelectedPeriod={setSelectedPeriod}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    deadline={deadline}
                    deadlinePage={deadlinePage}
                    setDeadlinePage={setDeadlinePage}
                    perPage={perPage}
                    onSearch={handleSearchRegional}
                    isLoading={isRowsLoading}
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
                      enablePlantDetail={enablePlantDetail}
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
