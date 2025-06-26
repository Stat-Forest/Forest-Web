import ResponsibleRepresentativesTable from "@/components/Table/TableReports/ResponsibleRepresentativesTable";
import { useGetUsersReportQuery } from "@/services/reportsApi";

function ResponsibleRepresentatives() {
  const { data, isLoading, error } = useGetUsersReportQuery({ user_id: "" });
  return (
    <div className="px-5 w-full">
      {isLoading && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <ResponsibleRepresentativesTable data={data} />
      </div>
    </div>
  );
}

export default ResponsibleRepresentatives;
