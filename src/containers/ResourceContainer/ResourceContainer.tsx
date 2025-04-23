import StaffChart from "@/components/Charts/BarChart";
import RecurceTable from "@/components/Table/RecurceTable/RecurceTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartNoAxesColumn } from "lucide-react";

function ResourceContainer() {
  return (
    <div className="py-3">
      <div className="w-full">
        <Tabs defaultValue="1-Ilova" className="w-full">
          <TabsList className="w-full border border-[#A3A3A3] min-h-[50px] justify-start">
            <TabsTrigger
              className="max-w-[150px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:rounded-bl-[9px] data-[state=active]:text-[#000]"
              value="1-Ilova"
            >
              1-Ilova
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[150px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
              value="2-Ilova"
            >
              2-Ilova
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[150px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
              value="3-Ilova"
            >
              3-Ilova
            </TabsTrigger>
          </TabsList>

          <TabsContent value="1-Ilova">
            <StaffChart />
            <div className="bg-white shadow px-5 py-4 rounded-2xl">
              <div className="flex items-end gap-2 pb-3">
                <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
                <h2>Jadval bo'yicha qisqacha ma'lumot</h2>
              </div>
              <div className="flex items-center justify-between gap-10">
                <div className="bg-[#457aff4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-[500] text-[#4579FF]">
                      Jami xodimlar
                    </h3>
                    <h2 className="text-3xl font-[500] text-[#4579FF]">1324</h2>
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
                    <h2 className="text-3xl font-[500] text-[#FFB145]">1324</h2>
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
                    <h2 className="text-3xl font-[500] text-[#09B86F]">1324</h2>
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
            <RecurceTable />
          </TabsContent>
          <TabsContent value="2-Ilova">Change your password here.</TabsContent>
          <TabsContent value="3-Ilova">Change your password here.</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ResourceContainer;
