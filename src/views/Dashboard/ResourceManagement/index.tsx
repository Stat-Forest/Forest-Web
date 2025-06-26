import { useParams } from "react-router-dom";
import ResourceContainer from "@/containers/ResourceContainer/ResourceContainer";
import { useGetStatementsReportQuery } from "@/services/reportsApi";

function ResourceManagement() {
  const { id } = useParams<{ id: string }>();

  const {
    data: statementData,
    isLoading,
    isError,
  } = useGetStatementsReportQuery();

  const currentItem = statementData?.results?.find((parent: any) =>
    parent.children?.some((child: any) => child.id === id)
  );

  const parentTitle = currentItem?.name;
  const childTitle = currentItem?.children?.find(
    (child: any) => child.id === id
  )?.name;

  return (
    <div className="px-3 py-4">
      <div className="pt-2 pl-2">
        <h2 className="text-xl font-[500] w-[530px] text-start px-2">
          <span className="text-[#A3A3A3]">
            {isLoading && "Yuklanmoqda..."}
            {isError && "Xatolik"}
            {!isLoading && !isError && parentTitle + ": "}
          </span>
          {!isLoading && !isError && childTitle}
        </h2>
        <div className="w-full bg-[#E8E8E8] h-[4px] rounded-full">
          <div className="w-[540px] h-[4px] rounded-full bg-green-500"></div>
        </div>
      </div>

      <ResourceContainer />
    </div>
  );
}

export default ResourceManagement;
