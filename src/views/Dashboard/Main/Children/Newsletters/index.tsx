import NewsletterTable from "@/components/Table/TableReports/NewsletterTable";
import {
  useGetDeadlinesReportQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import { useEffect } from "react";
import { RootState } from "@/app/store";
import { useDispatch, useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { periods } from "@/services/constants";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { resetNewsletterState, setNewsletterState } from "@/features/uiSlice";

function Newsletters() {
  const dispatch = useDispatch();
  const perPage = 20;
  const { t, i18n } = useTranslation();
  const { page, selectedStatement, selectedPeriod } = useSelector(
    (state: RootState) => state.ui.newsletters
  );

  const lang = useSelector((state: RootState) => state.language.lang);

  // 📌 Deadlines report query
  const { data, isLoading, error, isFetching } = useGetDeadlinesReportQuery({
    statement: selectedStatement,
    page,
    perPage,
    statement__period: selectedPeriod,
    lang,
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
    if (page !== 1) {
      dispatch(setNewsletterState({ page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatement, selectedPeriod]);

  // 📌 Tozalash funksiyasi
  const handleClearFilters = () => {
    dispatch(resetNewsletterState());
  };

  // 📌 Pagination handlers
  const handleNextPage = () => {
    if (page < totalPages) {
      dispatch(setNewsletterState({ page: page + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      dispatch(setNewsletterState({ page: page - 1 }));
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
          onClick={() => dispatch(setNewsletterState({ page: i }))}
          variant={page === i ? "default" : "outline"}
          className={`mx-1 min-w-[40px] rounded-lg ${
            page === i
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
    <div className="p-5 w-full pb-10">
      {/* ✅ Filter Select */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <Select
          value={selectedStatement}
          onValueChange={(value) =>
            dispatch(setNewsletterState({ selectedStatement: value }))
          }
          disabled={isStatementsLoading}
        >
          <SelectTrigger className="w-[300px] min-h-[40px] text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs">
            <SelectValue
              placeholder={
                isStatementsLoading ? "Yuklanmoqda..." : t("selectChapter")
              }
            />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            {statementsData?.flatMap((parent: any) =>
              parent.children?.map((child: any) => (
                <SelectItem key={child.id} value={child.id.toString()} className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                  {child.name}
                </SelectItem>
              )) || []
            )}
          </SelectContent>
        </Select>

        <Select
          value={selectedPeriod}
          onValueChange={(value) =>
            dispatch(setNewsletterState({ selectedPeriod: value }))
          }
        >
          <SelectTrigger className="w-[300px] text-sm min-h-[40px] font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs">
            <SelectValue placeholder={t("item_14")} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            {periods?.map((child: any) => (
              <SelectItem key={child.id} value={child.value} className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                {i18n.language === "uz" ? child.label_uz : child.label_ru}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleClearFilters}
          variant="outline"
          className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          disabled={!selectedStatement && !selectedPeriod}
        >
          {t("reset")}
        </Button>
      </div>

      {/* ✅ Loading & Error states */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <h1 className="text-slate-600 dark:text-slate-400">Yuklanmoqda...</h1>
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
        <div className="w-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors space-y-4">
          {/* Count info table ustida */}
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
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
              <NewsletterTable
                data={data.results}
                currentPage={page}
                perPage={perPage}
              />

              {/* 📌 Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t("records", { start: startItem, end: endItem, total: data?.count || 0 })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={page === 1 || isFetching}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    {t("before")}
                  </Button>

                  <div className="flex items-center">{renderPageNumbers()}</div>

                  <Button
                    onClick={handleNextPage}
                    disabled={page >= totalPages || isFetching}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    {t("next")}
                  </Button>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t("page")} {page} / {totalPages}
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-40">
              <h1 className="text-slate-500 dark:text-slate-400">Ma'lumot topilmadi</h1>
            </div>
          )}
        </div>
      )}

      {/* 📌 Secondary loading indicator */}
      {isFetching && !isLoading && (
        <div className="flex justify-center items-center mt-4 text-slate-600 dark:text-slate-400">
          <span>Yuklanmoqda...</span>
        </div>
      )}
    </div>
  );
}

export default Newsletters;
