import { useState } from "react";
import ResponsibleRepresentativesTable from "@/components/Table/TableReports/ResponsibleRepresentativesTable";
import { useGetUsersReportQuery } from "@/services/reportsApi";
import { Button } from "@/components/ui/button";
import { t } from "i18next";

function ResponsibleRepresentatives() {
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, isFetching, error } = useGetUsersReportQuery({
    page,
    perPage,
  });

  const totalPages = Math.ceil((data?.count || 0) / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, data?.count || 0);

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
    <div className="px-5 w-full pb-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <h1>Yuklanmoqda...</h1>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-red-500">Xatolik yuz berdi!</h1>
        </div>
      ) : (
        <div className="w-full border border-[silver] rounded-xl px-3 py-5">
          {/* Count info */}
          <div className="mb-3 text-sm text-gray-600">
            {t("users", { count: data?.count || 0 })}
            {data?.results?.length > 0 && (
              <span>
                {" "}
                ({t("shown", { count: startItem, count2: endItem })})
              </span>
            )}
          </div>

          {data?.results?.length > 0 ? (
            <>
              <ResponsibleRepresentativesTable
                data={data.results}
                currentPage={page}
                perPage={perPage}
              />

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                <div className="text-sm text-gray-600">
                  {startItem}-{endItem} of {data?.count || 0} foydalanuvchilar
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
              <h1 className="text-gray-500">Foydalanuvchilar topilmadi</h1>
            </div>
          )}
        </div>
      )}

      {/* Secondary loading indicator */}
      {isFetching && !isLoading && (
        <div className="flex justify-center items-center mt-4">
          <span>Yuklanmoqda...</span>
        </div>
      )}
    </div>
  );
}

export default ResponsibleRepresentatives;
