import NewsletterTable from "@/components/Table/TableReports/NewsletterTable";
import {
  useGetDeadlinesReportQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import { useState, useEffect } from "react";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { periods } from "@/services/constants";
import { Button } from "@/components/ui/button";

function Newsletters() {
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [selectedStatement, setSelectedStatement] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const lang = useSelector((state: RootState) => state.language.lang);

  // 📌 Deadlines report query
  const { data, isLoading, error, isFetching } = useGetDeadlinesReportQuery({
    statement: selectedStatement,
    page,
    perPage,
    statement__period: selectedPeriod,
  });

  // 📌 Statements list query
  const {
    data: statementsData,
    isLoading: isStatementsLoading,
    error: statementsError,
  } = useGetStatementsReportQuery({ lang });

  const totalPages = Math.ceil((data?.count || 0) / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, data?.count || 0);

  // 📌 Filter o'zgarsa page 1 ga qaytadi
  useEffect(() => {
    setPage(1);
  }, [selectedStatement, selectedPeriod]);

  // 📌 Tozalash funksiyasi
  const handleClearFilters = () => {
    setSelectedStatement("");
    setSelectedPeriod("");
    setPage(1);
  };

  // 📌 Pagination handlers
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

  // 📌 Sahifa raqamlarini ko'rsatish
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
      {/* ✅ Filter Select */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <Select
          value={selectedStatement}
          onValueChange={(value) => setSelectedStatement(value)}
          disabled={isStatementsLoading}
        >
          <SelectTrigger className="w-[300px] min-h-[40px] text-xl border border-black">
            <SelectValue
              placeholder={
                isStatementsLoading ? "Yuklanmoqda..." : "Bo'limni tanlang"
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

        <Select
          value={selectedPeriod}
          onValueChange={(value) => setSelectedPeriod(value)}
        >
          <SelectTrigger className="w-[300px] text-xl min-h-[40px] border border-black">
            <SelectValue placeholder="Hisobot davri" />
          </SelectTrigger>
          <SelectContent>
            {periods?.map((child: any) => (
              <SelectItem key={child.id} value={child.value}>
                {child.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleClearFilters}
          variant="outline"
          disabled={!selectedStatement && !selectedPeriod}
        >
          Tozalash
        </Button>
      </div>

      {/* ✅ Loading & Error states */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <h1>Yuklanmoqda...</h1>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-red-500">
            Ma'lumotlarni yuklashda xatolik yuz berdi!
          </h1>
        </div>
      ) : statementsError ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-red-500">
            Bo'limlarni yuklashda xatolik yuz berdi!
          </h1>
        </div>
      ) : (
        <div className="w-full border border-[silver] rounded-xl px-3 py-5">
          {/* Count info table ustida */}
          <div className="mb-3 text-sm text-gray-600">
            Umumiy yozuvlar soni: {data?.count || 0} ta
            {data?.results?.length > 0 && (
              <span>
                {" "}
                (Ko'rsatilayapti: {startItem}-{endItem})
              </span>
            )}
          </div>

          {data?.results?.length > 0 ? (
            <>
              <NewsletterTable
                data={data.results}
                currentPage={page}
                perPage={perPage}
              />

              {/* 📌 Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                <div className="text-sm text-gray-600">
                  {startItem}-{endItem} of {data?.count || 0} yozuvlar
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={page === 1 || isFetching}
                    variant="outline"
                    size="sm"
                  >
                    Oldingi
                  </Button>

                  <div className="flex items-center">{renderPageNumbers()}</div>

                  <Button
                    onClick={handleNextPage}
                    disabled={page >= totalPages || isFetching}
                    variant="outline"
                    size="sm"
                  >
                    Keyingi
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  Sahifa {page} / {totalPages}
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-40">
              <h1 className="text-gray-500">Ma'lumot topilmadi</h1>
            </div>
          )}
        </div>
      )}

      {/* 📌 Secondary loading indicator */}
      {isFetching && !isLoading && (
        <div className="flex justify-center items-center mt-4">
          <span>Yuklanmoqda...</span>
        </div>
      )}
    </div>
  );
}

export default Newsletters;
