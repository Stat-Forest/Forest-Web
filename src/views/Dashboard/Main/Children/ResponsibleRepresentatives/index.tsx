import { useEffect, useRef, useState } from "react";
import ResponsibleRepresentativesTable from "@/components/Table/TableReports/ResponsibleRepresentativesTable";
import { useGetUsersReportQuery } from "@/services/reportsApi";

function ResponsibleRepresentatives() {
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isFetching, error } = useGetUsersReportQuery({
    user_id: "",
    page,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data && data.results) {
      setAllData((prevData) => [...prevData, ...data.results]);
      if (!data.next) {
        setHasMore(false);
      }
    }
  }, [data]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || isFetching || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;

      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setPage((prev) => prev + 1);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [isFetching, hasMore]);

  return (
    <div
      className="px-5 w-full h-[80vh] overflow-y-auto"
      ref={scrollContainerRef}
    >
      {isLoading && page === 1 && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <ResponsibleRepresentativesTable data={allData} />
      </div>
      {isFetching && <h1 className="text-center py-3">Yuklanmoqda...</h1>}
      {!hasMore && (
        <h1 className="text-center py-3 text-gray-500">
          Barcha ma'lumotlar yuklandi
        </h1>
      )}
    </div>
  );
}

export default ResponsibleRepresentatives;
