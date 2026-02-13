import TableReports from "@/components/Table/TableReports/TableReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regions2 } from "@/services/constants";
import {
  useGetAllReportsQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { resetReportsFilter, setReportsFilter } from "@/features/uiSlice";
import { getSimpleCookie } from "@/utils/cookie";
import { exportReportsToExcel } from "@/utils/exportToExcel";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function ReceivedReport() {
  const dispatch = useDispatch();
  const {
    selectedOrganization,
    selectedPeriod,
    searchTerm,
    selectedStatement,
  } = useSelector((state: RootState) => state.ui.reportsFilters.accepted);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const lang = getSimpleCookie("lang") || "uz";
  const { t, i18n } = useTranslation();
  const deadline_at = false;

  const {
    data: reportsData,
    isLoading: isReportsLoading,
    error: reportsError,
  } = useGetAllReportsQuery({
    statement: selectedStatement,
    status: `status=accepted`,
    organization__region: selectedOrganization,
    statement__period: selectedPeriod,
    search: searchTerm,
    page: currentPage,
    per_page: pageSize,
  });

  const {
    data: statement,
    isLoading: isStatementLoading,
    error: statementError,
  } = useGetStatementsReportQuery({
    lang,
  });

  // Har qanday filter o'zgarganida sahifani 1 ga qaytarish
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrganization, selectedStatement, selectedPeriod, searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleReset = () => {
    dispatch(resetReportsFilter("accepted"));
    setCurrentPage(1);
  };

  // Pagination component
  const PaginationComponent = () => {
    if (!reportsData || !reportsData.results || reportsData.count <= pageSize)
      return null;

    const totalPages = Math.ceil(reportsData.count / pageSize);
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 px-4">
        <div className="text-sm text-gray-600">
          {t("showing") || "Ko'rsatilmoqda"} {(currentPage - 1) * pageSize + 1}{" "}
          - {Math.min(currentPage * pageSize, reportsData.count)}{" "}
          {t("of") || "dan"} {reportsData.count} {t("results") || "natija"}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {startPage > 1 && (
            <>
              <Button
                variant={1 === currentPage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(1)}
              >
                1
              </Button>
              {startPage > 2 && <span className="px-2">...</span>}
            </>
          )}

          {pages.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(page)}
            >
              {page}
            </Button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2">...</span>}
              <Button
                variant={totalPages === currentPage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Hech qanday ma'lumot bo'lmaganda ko'rsatish
  if (
    !isReportsLoading &&
    !reportsError &&
    (!reportsData || !reportsData.results || reportsData.results.length === 0)
  ) {
    return (
      <div className="px-5 w-full">
        <div className="w-full border bg-ice border-[silver] rounded-xl px-3 py-5">
          <div className="flex items-center gap-5 mb-6">
            <div>
              <Input
                type="text"
                placeholder={`${t("item_79")}...`}
                className="w-[260px] text-xl min-h-[40px] border-black"
                value={searchTerm}
                onChange={(e) =>
                  dispatch(
                    setReportsFilter({
                      key: "accepted",
                      changes: { searchTerm: e.target.value },
                    }),
                  )
                }
              />
            </div>

            <div>
              <Select
                value={selectedOrganization}
                onValueChange={(value) =>
                  dispatch(
                    setReportsFilter({
                      key: "accepted",
                      changes: { selectedOrganization: value },
                    }),
                  )
                }
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder={`${t("region")}`} />
                </SelectTrigger>
                <SelectContent>
                  {regions2.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {i18n.language === "uz" ? region.label : region.label2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedStatement}
                onValueChange={(value) =>
                  dispatch(
                    setReportsFilter({
                      key: "accepted",
                      changes: { selectedStatement: value },
                    }),
                  )
                }
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder="Yo'nalishni tanlang" />
                </SelectTrigger>

                <SelectContent>
                  {isStatementLoading && (
                    <div className="px-3 py-2 text-gray-500">
                      Yuklanmoqda...
                    </div>
                  )}

                  {statementError && (
                    <div className="px-3 py-2 text-red-500">
                      Xatolik yuz berdi! Ma'lumotlar olinmadi.
                    </div>
                  )}

                  {!isStatementLoading &&
                    !statementError &&
                    statement?.flatMap((parent: any) =>
                      parent.children?.map((child: any) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      )),
                    )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedPeriod}
                onValueChange={(value) =>
                  dispatch(
                    setReportsFilter({
                      key: "accepted",
                      changes: { selectedPeriod: value },
                    }),
                  )
                }
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder={`${t("reportType")}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("daily")}</SelectItem>
                  <SelectItem value="weekly">{t("weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
                  <SelectItem value="yearly">{t("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-5">
              <Button
                onClick={handleReset}
                className="bg-[#3B82F6] text-[white] hover:bg-[#2563EB] cursor-pointer"
              >
                {t("reset")}
              </Button>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportReportsToExcel(reportsData, t, deadline_at)
                  }
                >
                  XLSX export
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            {t("no_data_available") || "Ma'lumot mavjud emas"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 w-full">
      {isReportsLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Yuklanmoqda...</div>
        </div>
      )}
      {reportsError && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}

      <div className="w-full border bg-ice border-[silver] rounded-xl px-3 py-5">
        <div className="flex items-center gap-5 mb-6">
          <div>
            <Input
              type="text"
              placeholder={`${t("item_79")}...`}
              className="w-[260px] text-xl min-h-[40px] border-black"
              value={searchTerm}
              onChange={(e) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { searchTerm: e.target.value },
                  }),
                )
              }
            />
          </div>

          <div>
            <Select
              value={selectedOrganization}
              onValueChange={(value) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { selectedOrganization: value },
                  }),
                )
              }
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("region")}`} />
              </SelectTrigger>
              <SelectContent>
                {regions2.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {i18n.language === "uz" ? region.label : region.label2}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={selectedStatement}
              onValueChange={(value) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { selectedStatement: value },
                  }),
                )
              }
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder="Yo'nalishni tanlang" />
              </SelectTrigger>

              <SelectContent>
                {isStatementLoading && (
                  <div className="px-3 py-2 text-gray-500">Yuklanmoqda...</div>
                )}

                {statementError && (
                  <div className="px-3 py-2 text-red-500">
                    Xatolik yuz berdi! Ma'lumotlar olinmadi.
                  </div>
                )}

                {!isStatementLoading &&
                  !statementError &&
                  statement?.results?.flatMap((parent: any) =>
                    parent.children?.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    )),
                  )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={selectedPeriod}
              onValueChange={(value) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { selectedPeriod: value },
                  }),
                )
              }
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("reportType")}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("daily")}</SelectItem>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
                <SelectItem value="yearly">{t("yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-5">
            <Button
              onClick={handleReset}
              className="bg-[#3B82F6] text-[white] hover:bg-[#2563EB] cursor-pointer"
            >
              {t("reset")}
            </Button>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  exportReportsToExcel(reportsData, t, deadline_at)
                }
              >
                XLSX export
              </Button>
            </div>
          </div>
        </div>

        <TableReports data={reportsData?.results || []} />

        {/* Pagination */}
        {reportsData?.count > 0 && <PaginationComponent />}
      </div>
    </div>
  );
}

export default ReceivedReport;
