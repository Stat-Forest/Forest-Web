import NewsletterTable from "@/components/Table/TableReports/NewsletterTable";
import { useGetDeadlinesReportQuery } from "@/services/reportsApi";

function Newsletters() {
  const { data, isLoading, error } = useGetDeadlinesReportQuery();

  return (
    <div className="px-5 w-full">
      {isLoading && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <NewsletterTable data={data} />
      </div>
    </div>
  );
}

export default Newsletters;
