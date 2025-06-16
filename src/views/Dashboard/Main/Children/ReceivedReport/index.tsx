import TableReports from "@/components/Table/TableReports/TableReports";
import { useGetAllReportsQuery } from "@/services/reportsApi";

function ReceivedReport() {
  const { data, isLoading, error } = useGetAllReportsQuery({
    status: "status=accepted",
    statement: "",
  });
  return (
    <div className="px-5 w-full">
      {isLoading && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <TableReports data={data} />
      </div>
    </div>
  );
}

export default ReceivedReport;
