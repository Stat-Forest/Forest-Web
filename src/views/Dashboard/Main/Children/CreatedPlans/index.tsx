import CreatedPlantable from "@/components/Table/TableReports/CreatedPlanTable";
import { useState, useRef, useEffect, useCallback } from "react";
import { useGetPlanListReportQuery } from "@/services/reportsApi";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/utils/useDebounce";

function CreatedPlans() {
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchYear, setSearchYear] = useState("");

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedSearchYear = useDebounce(searchYear, 500);

  const { data, isLoading, isFetching, isError } = useGetPlanListReportQuery({
    columnId: "",
    organization: "",
    statement: "",
    page,
    search: searchTerm,
    year: searchYear,
  });

  useEffect(() => {
    if (data?.results?.length) {
      setAllData((prev) => [...prev, ...data.results]);
    }
  }, [data]);

  // Reset data when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, debouncedSearchYear]);

  const observerRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !isFetching && data?.next) {
        setPage((prev) => prev + 1);
      }
    },
    [data?.next, isFetching]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "0px",
      threshold: 1.0,
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [handleObserver]);

  return (
    <div className="w-full px-5">
      <div className="flex items-center gap-5 mb-6">
        <div>
          <Input
            type="text"
            placeholder="Qidiruv..."
            className="w-[260px] text-xl min-h-[40px] border-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Input
            type="text"
            placeholder="Yili..."
            className="w-[260px] text-xl min-h-[40px] border-black"
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <h1 className="text-center text-lg">Boshlang‘ich yuklanmoqda...</h1>
      )}

      {isError && (
        <h1 className="text-center text-red-500">Xatolik yuz berdi</h1>
      )}

      {!isLoading && !isError && (
        <>
          <CreatedPlantable data={allData} />
          <div
            ref={observerRef}
            className="h-[50px] flex justify-center items-center"
          >
            {isFetching && (
              <span className="text-[#09B86F]">Yuklanmoqda...</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CreatedPlans;
