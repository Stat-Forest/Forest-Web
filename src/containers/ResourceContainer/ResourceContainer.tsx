import { RootState } from "@/app/store";
import ReportChartItem from "@/components/Charts";
import EmployeeAnalysisSum from "@/components/Sum/EmployeeAnalysis";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setReportId } from "@/features/reportSlice";
import { regions2 } from "@/services/constants";
import {
  useGetAllReportsQuery,
  useGetDeadlinesReportQuery,
  useGetIndividualQuery,
  useGetRepoblicReportQuery,
  useGetStatementColumnsReportQuery,
  useLazyGetReganalReportQuery,
} from "@/services/reportsApi";
import { ReportColumn, ReportRow } from "@/types/reportInterface";
import { skipToken } from "@reduxjs/toolkit/query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

// Excel eksport uchun funksiyalar
import { exportToExcel, prepareBodyRows } from "@/utils/exportExcel";

// Excel header uchun tip
type ExcelCell = string | { v: string; colspan?: number; rowspan?: number };
type ExcelRow = ExcelCell[];

function ResourceContainer({ reportName }: { reportName: string }) {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef<any>(null);

  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const lang = useSelector((state: RootState) => state.language.lang);
  const { t, i18n } = useTranslation();

  // State'lar
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  //@ts-ignore
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedOrganizationReport, setSelectedOrganizationReport] = useState("");
  const [selectedPeriodReport, setSelectedPeriodReport] = useState("");
  const [selectedStatusReport, setSelectedStatusReport] = useState("");
  const [searchTermReport, setSearchTermReport] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  //@ts-ignore
  const [deadlinePage, setDeadlinePage] = useState(1);
  const perPage = 5;

  // API so‘rovlar
  const { data: deadline, isLoading: deadlineLoading } = useGetDeadlinesReportQuery(
    { statement: id || "", page: deadlinePage, perPage, statement__period: "" },
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
  const { data: allReports = [], isLoading: isAllReportLoading } = useGetAllReportsQuery(
    id
      ? {
        statement: id,
        status: selectedStatusReport || "",
        organization__region: selectedOrganizationReport || "",
        statement__period: selectedPeriodReport || "",
        search: searchTermReport || "",
      }
      : skipToken
  );


  const [getRegionalReport, { data: tableRowsData = [], isLoading: isRowsLoading, isFetching: isRowsFetching }] =
    useLazyGetReganalReportQuery();

  const { data: rupblic, isLoading: isRepublicLoading } = useGetRepoblicReportQuery();

  const { data: individualReports, isLoading: isIndividualLoading } = useGetIndividualQuery(
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

  const isError = isErrorHeaders || isRowsFetching;

  // Reset filtrlari
  useEffect(() => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedPeriod("");
    setSelectedYear("");
  }, [id]);

  useEffect(() => {
    if (id) dispatch(setReportId(id));
  }, [id, dispatch]);

  // Leaf column ID'larni olish
  const getLeafColumnIds = (nodes: ReportColumn[]): string[] => {
    let ids: string[] = [];
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        ids.push(node.id);
      } else {
        ids = ids.concat(getLeafColumnIds(node.children));
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

  const activeLeafIds = useMemo(() => tabLeafIdMap[activeTab] || [], [tabLeafIdMap, activeTab]);

  // Filtrlangan qatorlar
  const filteredRows = useMemo(() => {
    const normalizeRow = (row: any): any => {
      const items = (row.report_items || []).map((item: any) => ({
        ...item,
        statement_columns: activeLeafIds.map((colId) => {
          const found = item.statement_columns?.find((c: any) => c.statement_column_id === colId);
          return found || { statement_column_id: colId, value: "-", inners: [] };
        }),
      }));

      return {
        ...row,
        report_items: items,
        children_reports: (row.children_reports || []).map(normalizeRow),
      };
    };

    const regional = tableRowsData?.results || [];
    const republic = rupblic?.results || [];
    return [...regional, ...republic].map(normalizeRow);
  }, [tableRowsData, rupblic, activeLeafIds]);

  const filteredIndividualRows = useMemo(() => {
    if (!individualReports?.results) return [];
    return individualReports.results.map((row: any) => ({
      ...row,
      report_items: (row.report_items || []).map((item: any) => ({
        ...item,
        statement_columns: (item.statement_columns || []).filter((c: any) =>
          activeLeafIds.includes(c.statement_column_id)
        ),
      })),
    }));
  }, [individualReports, activeLeafIds]);

  // Excel eksport uchun ma'lumotlarni tayyorlash
  const getExportData = (): { headerRows: ExcelRow[]; bodyRows: any[][] } | null => {
    if (!tableRef.current?.getHeaderRows) {
      alert("Jadval ma'lumotlari topilmadi! Iltimos, qayta urinib ko‘ring.");
      return null;
    }

    try {
      const rawHeaders = tableRef.current.getHeaderRows() as ExcelRow[];

      let headerRows: ExcelRow[] = [];

      if (rawHeaders && rawHeaders.length >= 2) {
        headerRows = rawHeaders.map((row) =>
          row.map((cell: any) => {
            if (typeof cell === "string") return cell;
            const v = cell.v || cell.value || "";
            const colspan = cell.colspan || 1;
            const rowspan = cell.rowspan || 1;
            return colspan > 1 || rowspan > 1 ? { v, colspan, rowspan } : v;
          })
        );
      } else {
        // Fallback header
        const totalCols = activeLeafIds.length + 2;
        headerRows = [
          [{ v: activeTab || reportName, colspan: totalCols }],
          ["№", "Tashkilot / Hudud", ...activeLeafIds.map(() => "Guruh")],
          ["", "", ...activeLeafIds.map((_, i) => `Ko‘rsatkich ${i + 1}`)],
        ];
      }

      const bodyRows = prepareBodyRows(filteredRows, activeLeafIds);

      return { headerRows, bodyRows };
    } catch (err) {
      console.error("getExportData xatosi:", err);
      alert("Excel ma'lumotlarini tayyorlashda xatolik yuz berdi!");
      return null;
    }
  };

  // Excel eksport (bitta, to‘g‘ri)
  const handleExportExcel = () => {
    const data = getExportData();
    if (!data) return;

    const { headerRows, bodyRows } = data;

    if (headerRows.length === 0 || bodyRows.length === 0) {
      alert("Eksport qilish uchun ma'lumotlar yetarli emas!");
      return;
    }

    const now = new Date();
    const date = now.toLocaleDateString("uz-UZ").replace(/\//g, "-");
    const time = now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    const fileName = `${reportName}_${activeTab}_${date}_${time}`;

    exportToExcel(headerRows, bodyRows, fileName);
  };

  // Print funksiyasi
  const handlePrint = () => {
    if (!tableRef.current?.getPrintableTable) {
      alert("Chop etish imkoni yo‘q!");
      return;
    }

    const html = tableRef.current.getPrintableTable();
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;

    const now = new Date();
    win.document.write(`
      <!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8">
        <title>${reportName} - ${activeTab}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; direction: ${i18n.dir()}; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 4px double #000; }
          .title { font-size: 26px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
          .subtitle { font-size: 20px; margin: 10px 0; }
          .date { font-size: 14px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 12px; }
          th, td { border: 1px solid #000; padding: 10px 8px; text-align: center; vertical-align: middle; }
          th { background-color: #E8F5E9; font-weight: bold; }
          @page { margin: 15mm; }
          @media print { .no-print { display: none; } }
          .print-btn {
            padding: 12px 24px; background: #09B86F; color: white; border: none;
            border-radius: 6px; cursor: pointer; font-size: 16px; margin: 0 10px;
          }
          .print-btn.close { background: #FF5445; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${reportName}</div>
          <div class="subtitle">${activeTab}</div>
          <div class="date">${now.toLocaleDateString("uz-UZ")} ${now.toLocaleTimeString("uz-UZ")}</div>
        </div>
        ${html}
        <div class="no-print" style="position:fixed;bottom:30px;right:30px;background:white;padding:20px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.2);">
          <button class="print-btn" onclick="window.print()">Chop etish</button>
          <button class="print-btn close" onclick="window.close()">Yopish</button>
        </div>
        <script>setTimeout(() => window.print(), 1200);</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleSearchRegional = () => {
    getRegionalReport({
      statement: id || "",
      region: selectedRegion || "",
      deadline: selectedPeriod || "",
    });
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-16 h-16 animate-spin text-green-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-96">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Xatolik yuz berdi</AlertTitle>
          <AlertDescription>Ma'lumotlarni yuklashda muammo. Iltimos, qayta urinib ko‘ring.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedRow(null); }} className="w-full">
        <TabsList className="w-full border border-gray-300 rounded-lg overflow-x-auto min-h-14 justify-start px-4 flex flex-wrap bg-gray-50">
          {tableHeadersData.map((col: ReportColumn) => (
            <TabsTrigger
              key={col.id}
              value={col.title}
              className="min-w-36 px-6 py-3 data-[state=active]:bg-white data-[state=active]:border-b-4 data-[state=active]:border-green-600 data-[state=active]:text-black text-gray-600 font-medium rounded-t-lg"
            >
              {col.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {tableHeadersData.map((col: ReportColumn) => (
          <TabsContent key={col.id} value={col.title} className="mt-6">
            {activeTab === col.title && (
              <>
                <ReportChartItem activeTab={activeTab} reportName={reportName} />
                <EmployeeAnalysisSum reportName={reportName} activeTab={activeTab} />

                <div className="flex flex-wrap items-center justify-between gap-6 my-8">
                  <div className="flex items-center gap-4">
                    {(user_role === "tashkilot_hodimi" || user_role === "super_admin" || user_role === "hududiy_boshqarma") && (
                      <Button
                        onClick={() => navigate(`/resource-management/create/${reportName}`)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md"
                      >
                        {t("createNewReport")}
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md">
                          {t("export")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64">
                        <DropdownMenuItem onClick={handleExportExcel} className="text-lg py-3">
                          Excel yuklab olish
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePrint} className="text-lg py-3">
                          Chop etish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Input
                      placeholder={t("search") + "..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-72 border-2 border-black rounded-lg h-12"
                    />
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger className="w-64 border-2 border-black rounded-lg h-12">
                        <SelectValue placeholder={t("region")} />
                      </SelectTrigger>
                      <SelectContent>
                        {regions2.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {i18n.language === "uz" ? r.label : r.label2}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-64 border-2 border-black rounded-lg h-12">
                        <SelectValue placeholder={t("period")} />
                      </SelectTrigger>
                      <SelectContent>
                        {deadline?.results?.length ? (
                          <>
                            <SelectItem value="all">{t("allReports")}</SelectItem>
                            {deadline.results.map((d: any) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {new Date(d.submit_at).toLocaleDateString("uz-UZ")}
                              </SelectItem>
                            ))}
                          </>
                        ) : (
                          <div className="p-4 text-center text-gray-500">{t("noDeadlines")}</div>
                        )}
                      </SelectContent>
                    </Select>

                    <Button onClick={handleSearchRegional} className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8 rounded-lg">
                      {t("search")}
                    </Button>
                  </div>
                </div>

                {isRowsFetching ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-16 h-16 animate-spin text-green-600" />
                  </div>
                ) : (
                  <TableColumn
                    ref={tableRef}
                    data={col.children}
                    rows={filteredRows}
                    onRowClick={(row:any) => {
                      const normalized = {
                        ...row,
                        report_items: (row.report_items || []).map((item: any) => ({
                          ...item,
                          statement_columns: activeLeafIds.map((id) => {
                            const found = item.statement_columns?.find((c: any) => c.statement_column_id === id);
                            return found || { statement_column_id: id, value: "-" };
                          }),
                        })),
                      };
                      setSelectedRow(normalized);
                    }}
                    selectedRow={selectedRow}
                    individualRows={filteredIndividualRows}
                    allReports={allReports}
                    setSelectedOrganizationReport={setSelectedOrganizationReport}
                    setSelectedPeriodReport={setSelectedPeriodReport}
                    setSelectedStatusReport={setSelectedStatusReport}
                    setSearchTermReport={setSearchTermReport}
                    selectedOrganizationReport={selectedOrganizationReport}
                    selectedPeriodReport={selectedPeriodReport}
                    selectedStatusReport={selectedStatusReport}
                    searchTermReport={searchTermReport}
                  />
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default ResourceContainer;