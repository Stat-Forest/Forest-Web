import CreatedPlantable from "@/components/Table/TableReports/CreatedPlanTable";
import { useGetPlanListReportQuery } from "@/services/reportsApi";

function CreatedPlans() {
  const { data: plan_list, isLoading: plan_list_loading } =
    useGetPlanListReportQuery({
      columnId: "",
      organization: "",
      statement: "",
    });

  return (
    <div className="w-full px-5">
      {plan_list_loading && <h1>loading...</h1>}
      <CreatedPlantable data={plan_list} />
    </div>
  );
}

export default CreatedPlans;
