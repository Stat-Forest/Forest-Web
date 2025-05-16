import StaffChart from "@/components/Charts/BarChart";
import TableColumn from "@/components/Table/RecurceTable/TableColumn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetStatementColumnsReportQuery } from "@/services/reportsApi";
import { ChartNoAxesColumn } from "lucide-react";

function ResourceContainer() {
  const { data, isLoading, error } = useGetStatementColumnsReportQuery();

  if (isLoading) return <h1>loading...</h1>;
  if (error) return <h1>error</h1>;
  console.log(data);

  return (
    <div className="py-3">
      <div className="w-full">
        <Tabs defaultValue={data[0].title} className="w-full">
          <TabsList className="w-full border border-[#A3A3A3] min-h-[50px] justify-start px-3">
            {data.map((item: any) => (
              <TabsTrigger
                className="max-w-[190px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
                value={item?.title}
                key={item?.id}
              >
                {item?.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {data.map((item: any) => (
            <TabsContent value={item?.title} key={item?.id}>
              <StaffChart />
              <div className="bg-white shadow px-5 py-4 rounded-2xl">
                <div className="flex items-end gap-2 pb-3">
                  <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
                  <h2>Jadval bo'yicha qisqacha ma'lumot</h2>
                </div>
                <div className="flex items-center justify-between gap-10 overflow-x-auto">
                  <div className="bg-[#457aff4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-[500] text-[#4579FF]">
                        Jami xodimlar
                      </h3>
                      <h2 className="text-3xl font-[500] text-[#4579FF]">
                        1324
                      </h2>
                    </div>
                    <div>
                      <span className="text-[#4579FF] text-lg">
                        Eng ko'p xodimlar: Respublika tashkilotlari (150)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">Boshqaruv: 122</span>
                      <span className="text-lg">Mutaxassislar: 465</span>
                    </div>
                  </div>
                  <div className="bg-[#FFB1454c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-[500] text-[#FFB145]">
                        Jami xodimlar
                      </h3>
                      <h2 className="text-3xl font-[500] text-[#FFB145]">
                        1324
                      </h2>
                    </div>
                    <div>
                      <span className="text-[#FFB145] text-lg">
                        Eng ko'p xodimlar: Respublika tashkilotlari (150)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">Boshqaruv: 122</span>
                      <span className="text-lg">Mutaxassislar: 465</span>
                    </div>
                  </div>
                  <div className="bg-[#09B86F4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-[500] text-[#09B86F]">
                        Jami xodimlar
                      </h3>
                      <h2 className="text-3xl font-[500] text-[#09B86F]">
                        1324
                      </h2>
                    </div>
                    <div>
                      <span className="text-[#09B86F] text-lg">
                        Eng ko'p xodimlar: Respublika tashkilotlari (150)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">Boshqaruv: 122</span>
                      <span className="text-lg">Mutaxassislar: 465</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="py-4">
                <div className="w-full ">{item?.children[0].title}</div>
                <TableColumn data={item?.children[0].children} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default ResourceContainer;
