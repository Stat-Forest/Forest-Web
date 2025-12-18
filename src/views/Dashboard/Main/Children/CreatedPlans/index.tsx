import CreatedPlantable from "@/components/Table/TableReports/CreatedPlanTable";
import { useState, useEffect } from "react";
import {
  useGetPlanListReportQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import { useDebounce } from "@/utils/useDebounce";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

function CreatedPlans() {
  const lang = useSelector((state: RootState) => state.language.lang);
  const [page, setPage] = useState(1);
  const { t } = useTranslation();
  const perPage = 20;
  const [searchTerm, setSearchTerm] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [selectedStatement, setSelectedStatement] = useState<string>("");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [organizationSearch, setOrganizationSearch] = useState("");
  const debouncedSearchYear = useDebounce(searchYear, 500);
  const debouncedOrganizationSearch = useDebounce(organizationSearch, 300);

  const { data, isLoading, isFetching, isError } = useGetPlanListReportQuery({
    columnId: "",
    organization: selectedOrganization,
    statement: selectedStatement,
    page,
    perPage,
    search: "",
    year: debouncedSearchYear,
  });

  const {
    data: statementsData,
    isLoading: isStatementsLoading,
    error: statementsError,
  } = useGetStatementsReportQuery({ lang });

  const {
    data: organizationData,
    isLoading: isOrganizationLoading,
    error: organizationError,
  } = useGetOrganizationReportsQuery({lang});

  // Filter organizations based on search
  const filteredOrganizations =
    organizationData?.filter((org: any) =>
      org.name
        ?.toLowerCase()
        .includes(debouncedOrganizationSearch.toLowerCase())
    ) || [];

  const totalPages = Math.ceil((data?.count || 0) / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, data?.count || 0);

  // {t("reset")} to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchYear, selectedStatement, selectedOrganization]);

  // Pagination handlers
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  // Clear filters function
  const handleClearFilters = () => {
    setSearchTerm("");
    setSearchYear("");
    setSelectedStatement("");
    setSelectedOrganization("");
    setOrganizationSearch("");
    setPage(1);
  };

  // Check if any filter is active
  const isAnyFilterActive =
    searchTerm || searchYear || selectedStatement || selectedOrganization;

  // Render page numbers
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          onClick={() => setPage(i)}
          variant={page === i ? "default" : "outline"}
          className={`mx-1 min-w-[40px] ${
            page === i ? "bg-blue-600 text-white" : ""
          }`}
          disabled={isFetching}
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="w-full p-5 pb-10 bg-ice">
      {/* Filter Section */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {/* Statement Filter */}
        <Select
          value={selectedStatement}
          onValueChange={(value) => setSelectedStatement(value)}
          disabled={isStatementsLoading}
        >
          <SelectTrigger className="w-[300px] min-h-[40px] text-xl border border-black">
            <SelectValue
              placeholder={
                isStatementsLoading ? "Yuklanmoqda..." : t("selectChapter")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {statementsData?.results?.map((parent: any) =>
              parent.children?.map((child: any) => (
                <SelectItem key={child.id} value={child.id.toString()}>
                  {child.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Organization Filter with Search */}
        <Select
          value={selectedOrganization}
          onValueChange={(value) => setSelectedOrganization(value)}
          disabled={isOrganizationLoading}
        >
          <SelectTrigger className="w-[300px] min-h-[40px] text-xl border border-black">
            <SelectValue
              placeholder={
                isOrganizationLoading ? "Yuklanmoqda..." : t("selectOrganization")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {/* Search Input for Organizations */}
            <div className="p-2 border-b">
              <Input
                placeholder={t("searchByOrganizationName")}
                value={organizationSearch}
                onChange={(e) => setOrganizationSearch(e.target.value)}
                className="w-full"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((org: any) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))
            ) : (
              <div className="p-2 text-center text-gray-500">
                {t("noOrganizationsFound")}
              </div>
            )}
          </SelectContent>
        </Select>

        {/* Year Filter */}
        <Input
          type="text"
          placeholder={t("searchByYear")}
          className="w-[200px] text-xl min-h-[40px] border-black"
          value={searchYear}
          onChange={(e) => setSearchYear(e.target.value)}
        />

        {/* Clear Filters Button */}
        <Button
          onClick={handleClearFilters}
          variant="outline"
          disabled={!isAnyFilterActive}
        >
          {t("reset")}
        </Button>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-center text-lg">{t('start_loading')}</h1>
        </div>
      ) : isError ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-center text-red-500">
            {t("data_loading_error")}
          </h1>
        </div>
      ) : statementsError ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-center text-red-500">
            {t("data_loading_error_2")}
          </h1>
        </div>
      ) : organizationError ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-center text-red-500">
            {t("data_loading_error_3")}
          </h1>
        </div>
      ) : (
        <div className="w-full border border-[silver] rounded-xl px-3 py-5">
          {/* Count info */}
          <div className="mb-3 text-sm text-gray-600">
            {t("totalRecords", { count: data?.count || 0 })}
            {data?.results?.length > 0 && (
              <span>
                {" "}
                ({t("shown", { count: startItem, count2: endItem })})
              </span>
            )}
          </div>

          {data?.results?.length > 0 ? (
            <>
              <CreatedPlantable
                data={data.results}
                currentPage={page}
                perPage={perPage}
              />

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                <div className="text-sm text-gray-600">
                  {t("records", { start: startItem, end: endItem, total: data?.count || 0 })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={page === 1 || isFetching}
                    variant="outline"
                    size="sm"
                  >
                    {t("before")}
                  </Button>

                  <div className="flex items-center">{renderPageNumbers()}</div>

                  <Button
                    onClick={handleNextPage}
                    disabled={page >= totalPages || isFetching}
                    variant="outline"
                    size="sm"
                  >
                    {t("next")}
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  {t("page")} {page} / {totalPages}
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-40">
              <h1 className="text-gray-500">
                {isAnyFilterActive
                  ? t("noDataFound")
                  : t("noDataFound")}
              </h1>
            </div>
          )}
        </div>
      )}

      {/* Secondary loading indicator */}
      {isFetching && !isLoading && (
        <div className="flex justify-center items-center mt-4">
          <span className="text-[#3B82F6]">{t("loading")}</span>
        </div>
      )}
    </div>
  );
}

export default CreatedPlans;
