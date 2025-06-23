import ResourceContainer from "@/containers/ResourceContainer/ResourceContainer";

function ResourceManagement() {
  return (
    <div className="px-3 py-4">
      <div className="pt-2 pl-2">
        <h2 className="text-xl font-[500] w-[440px] text-start px-2">
          <span className="text-[#A3A3A3]">
            Inson resulrslarini boshqarish:
          </span>
          Xodimlar hisobi
        </h2>
        <div className="w-full bg-[#E8E8E8] h-[4px] rounded-full">
          <div className="w-[450px] h-[4px] rounded-full bg-green-500"></div>
        </div>
      </div>
      <ResourceContainer />
    </div>
  );
}

export default ResourceManagement;
