import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetAllReportsQuery,
  useGetStatementColumnsReportQuery,
} from "@/services/reportsApi";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { skipToken } from "@reduxjs/toolkit/query";
import { useDispatch, useSelector } from "react-redux";
import { setReportId } from "@/features/reportSlice";
import { exportToExcel } from "@/utils/exportToExcel";
import ReportItemTable from "@/components/Table/RecurceTable/ReportItemTable";
import { RootState } from "@/app/store";
import EmployeeIncomeChart from "@/components/Charts/FinanceIncomeChart";
import EmployeeFundChart from "@/components/Charts/FinanceFundChart";
import EmployeeReportChart from "@/components/Charts/EmployeeReportChart";
import LandAcquisitionChart from "@/components/Charts/LandAcquisitionChart";
import LandForestChart from "@/components/Charts/LandForestChart";
import LandRentedChart from "@/components/Charts/LandRentedChart";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import IncomeSum from "@/components/Sum/IncomeSum";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ResourceContainer() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user_role = useSelector((state: RootState) => state.auth.user?.role);
  const userCheckTable = user_role !== "tashkilot_hodimi";

  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const lang = useSelector((state: RootState) => state.language.lang);

  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(
    { statementId: id || "", lang },
    { skip: !id }
  );

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
          search: "",
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
      // 0fd27397-ed03-499f-bcbc-2621b00f1252
      // 0fd27397-ed03-499f-bcbc-2621b00f1252
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
        activeLeafIds.includes(item.statement_column_id)
      );
      return {
        ...row,
        report_items: filteredItems,
      };
    });
  }, [tableRowsData, activeLeafIds]);

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
    "945d9e04-9f5a-4247-934d-5b775e15a1da": (
      <EmployeeIncomeChart activeTab={activeTab} />
    ),
    "9d01a20f-1957-4cde-8ab1-22cbe54793bf": (
      <EmployeeFundChart activeTab={activeTab} />
    ),
    "f76daeb7-c185-4402-8be9-0aaff5db05db": (
      <EmployeeReportChart activeTab={activeTab} />
    ),
    "36101e9e-5517-4861-b0f7-aca274a5dce0": (
      <LandAcquisitionChart activeTab={activeTab} />
    ),
    "94872f60-abd7-45d7-9764-e12cfeee3b35": (
      <LandForestChart activeTab={activeTab} />
    ),
    "b1f640a8-0f23-4130-8f5a-646af6898595": (
      <LandRentedChart activeTab={activeTab} />
    ),
  };

  const sumComponents: Record<string, React.ReactNode> = {
    "945d9e04-9f5a-4247-934d-5b775e15a1da": <IncomeSum activeTab={activeTab} />,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
      </div>
    );
  }

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
    <>
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
                  <div>{chartComponents[id as string] || null}</div>
                  <div>{sumComponents[id as string] || null}</div>
                  <div>
                    <div className="flex items-center justify-end gap-3 mb-4">
                      <button
                        className="bg-[#09B86F] text-md font-semibold text-white w-[220px] py-3 rounded"
                        onClick={() => navigate("/resource-management/create")}
                      >
                        Yangi hisobod yaratish
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="py-2.5 font-semibold w-[100px]  rounded bg-[#09B86F] border-1 text-[white]">
                            Export
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mt-2 mr-2">
                          <DropdownMenuItem
                            onClick={() =>
                              exportToExcel(col?.children, filteredRows)
                            }
                          >
                            Hisobodni export qilib olish
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handlePrint}>
                            Hisobodni chop etish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div>
                      <TableColumn
                        ref={tableRef}
                        data={col?.children}
                        rows={filteredRows}
                        onRowClick={(row: any) => setSelectedRow(row)}
                        selectedRow={selectedRow}
                        userCheckTable={userCheckTable}
                        tableRowsData={tableRowsData}
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
    </>
  );
}

export default ResourceContainer;
