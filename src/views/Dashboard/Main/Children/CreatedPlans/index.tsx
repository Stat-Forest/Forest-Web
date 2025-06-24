import CreatedPlantable from "@/components/Table/TableReports/CreatedPlanTable";
import { useState, useRef, useEffect, useCallback } from "react";
import { useGetPlanListReportQuery } from "@/services/reportsApi";

function CreatedPlans() {
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<any[]>([]);

  const { data, isLoading, isFetching, isError } = useGetPlanListReportQuery({
    columnId: "",
    organization: "",
    statement: "",
    page,
  });

  useEffect(() => {
    if (data?.results?.length) {
      setAllData((prev) => [...prev, ...data.results]);
    }
  }, [data]);

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
    const option = {
      root: null,
      rootMargin: "0px",
      threshold: 1.0,
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (observerRef.current) observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [handleObserver]);

  return (
    <div className="w-full px-5">
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
