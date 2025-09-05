import { useEffect, useRef, useState } from "react";
import ResponsibleRepresentativesTable from "@/components/Table/TableReports/ResponsibleRepresentativesTable";
import { useGetUsersReportQuery } from "@/services/reportsApi";

function ResponsibleRepresentatives() {
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isFetching, error } = useGetUsersReportQuery({
    page,
  });

  const observerRef = useRef<HTMLDivElement | null>(null);

  // 🔥 Data yig‘ish
  useEffect(() => {
    if (data?.results) {
      setAllData((prev) => {
        if (page === 1) return data.results;
        const newItems = data.results.filter(
          (item: any) => !prev.some((p) => p.user_number === item.user_number)
        );
        return [...prev, ...newItems];
      });
      setHasMore(Boolean(data.next));
    }
  }, [data, page]);

  // 🔥 IntersectionObserver
  useEffect(() => {
    if (!observerRef.current || !hasMore || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, isFetching]);

  return (
    <div className="px-5 w-full">
      {isLoading && page === 1 && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}

      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <ResponsibleRepresentativesTable data={allData} />
      </div>

      {isFetching && page > 1 && (
        <h1 className="text-center py-3">Yuklanmoqda...</h1>
      )}

      {/* 👇 Trigger element */}
      <div ref={observerRef} className="h-10" />
    </div>
  );
}

export default ResponsibleRepresentatives;
