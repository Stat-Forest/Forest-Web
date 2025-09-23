import NewsletterTable from "@/components/Table/TableReports/NewsletterTable";
import { useGetDeadlinesReportQuery } from "@/services/reportsApi";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function Newsletters() {
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data, isLoading, error } = useGetDeadlinesReportQuery({
    statement: "",
    page,
    perPage,
  });

  const totalPages = Math.ceil((data?.count || 0) / perPage);

  // 📌 Sahifa o‘zgarganda scroll tepaga chiqsin
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // 📌 Compact pagination generator
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      // Hamma sahifalarni chiqaramiz
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="px-5 w-full">
      {isLoading && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <NewsletterTable data={data} />
      </div>

      {/* ✅ Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {/* Oldingi */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Oldingi
          </Button>

          {/* Raqamlar */}
          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={idx} className="px-2 text-gray-500">
                ...
              </span>
            ) : (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={page === p ? "default" : "outline"}
                onClick={() => setPage(p as number)}
              >
                {p}
              </Button>
            )
          )}

          {/* Keyingi */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Keyingi
          </Button>
        </div>
      )}
    </div>
  );
}

export default Newsletters;
