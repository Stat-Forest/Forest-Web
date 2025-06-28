// ResourceContainer.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetAllReportsQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import StaffChart from "@/components/Charts/BarChart";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { skipToken } from "@reduxjs/toolkit/query";
import { ChartNoAxesColumn } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setReportId } from "@/features/reportSlice";
import { exportToExcel } from "@/utils/exportToExcel";
import ReportItemTable from "@/components/Table/RecurceTable/ReportItemTable";
import { RootState } from "@/app/store";

function ResourceContainer() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const userCheckTable = user_role !== "tashkilot_hodimi";

  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(id || "", { skip: !id });

  const {
    data: tableRowsData = [],
    isLoading: isRowsLoading,
    isError: isErrorRows,
  } = useGetAllReportsQuery(
    id
      ? {
          statement: id,
          status: "",
          organization__region: "",
          statement__period: "",
        }
      : skipToken
  );

  const isLoading = isHeadersLoading || isRowsLoading;
  const isError = isErrorHeaders || isErrorRows;

  const [activeTab, setActiveTab] = useState<string>("");
  const tableRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      dispatch(setReportId(id));
    }
  }, [id, dispatch]);

  const getLeafColumnIds = (nodes: any[]): string[] => {
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
    tableHeadersData.forEach((col: any) => {
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
    return tableRowsData.map((row: any) => {
      const filteredItems = row.report_items.filter((item: any) =>
        activeLeafIds.includes(item.statement_column)
      );
      return {
        ...row,
        report_items: filteredItems,
      };
    });
  }, [tableRowsData, activeLeafIds]);

  const handlePrint = () => {
    if (tableRef.current) {
      const printContents = tableRef.current.getTable();
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  if (isLoading) {
    return <h1>Loading...</h1>;
  }

  if (isError) {
    return <h1>Xatolik yuz berdi. Qayta urinib ko‘ring.</h1>;
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
          {tableHeadersData.map((col: any) => (
            <TabsTrigger
              key={col.id}
              value={col.title}
              className="max-w-[400px] min-w-[130px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
            >
              {col.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {tableHeadersData.map((col: any) => (
          <TabsContent key={col.id} value={col.title}>
            {activeTab === col.title && (
              <>
                <StaffChart />
                <div className="bg-white shadow px-5 py-4 rounded-2xl mb-6">
                  <div className="flex items-end gap-2 pb-3">
                    <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
                    <h2>Jadval bo'yicha qisqacha ma'lumot</h2>
                  </div>
                  <div className="flex items-center justify-between gap-10 overflow-x-auto">
                    {["#457AFF", "#FFB145", "#09B86F"].map((color, i) => (
                      <div
                        key={i}
                        className={`bg-[${color}4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className={`text-xl font-[500] text-[${color}]`}>
                            Jami xodimlar
                          </h3>
                          <h2 className={`text-3xl font-[500] text-[${color}]`}>
                            1324
                          </h2>
                        </div>
                        <div>
                          <span className={`text-[${color}] text-lg`}>
                            Eng ko'p xodimlar: Respublika tashkilotlari (150)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg">Boshqaruv: 122</span>
                          <span className="text-lg">Mutaxassislar: 465</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-end gap-3 mb-4">
                    <button
                      className="bg-blue-500 text-md font-semibold text-white w-[250px] py-3 rounded"
                      onClick={() => navigate("/resource-management/create")}
                    >
                      Yangi hisobod yaratish
                    </button>
                    <button
                      className="bg-blue-500 text-md font-semibold text-white w-[250px] py-3 rounded"
                      onClick={() => exportToExcel(col?.children, filteredRows)}
                    >
                      Hisobodni export qilib olish
                    </button>
                    <button
                      className="bg-blue-500 text-md font-semibold text-white w-[250px] py-3 rounded"
                      onClick={handlePrint}
                    >
                      Hisobodni chop etish
                    </button>
                  </div>

                  <div>
                    <TableColumn
                      ref={tableRef}
                      data={col?.children}
                      rows={filteredRows}
                      onRowClick={(row: any) => setSelectedRow(row)}
                      selectedRow={selectedRow}
                      userCheckTable={userCheckTable}
                    />
                  </div>

                  <div className="py-14 pr-2">
                    <ReportItemTable />
                  </div>
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
