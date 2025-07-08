import { useGetIncomeSumQuery } from "@/services/sumApi";
import { ChartNoAxesColumn } from "lucide-react";
import { useEffect, useState } from "react";

function IncomeSum({ activeTab }: any) {
  const { data, isLoading } = useGetIncomeSumQuery();
  const [sumData, setSumData] = useState<any[]>([]);

  useEffect(() => {
    if (data && data.length > 0) {

      let ilovaData = [];

      if (activeTab === "Daromad turlari bo‘yicha") {
        ilovaData = data[0]["Daromad turlari bo‘yicha"] || [];
      } else if (activeTab === "Tushumlar bo‘yicha") {
        ilovaData = data[0]["Tushumlar bo‘yicha"] || [];
      }

      setSumData(ilovaData || []);
    }
  }, [data, activeTab]);

  if (isLoading) return <h1>loading...</h1>;

  console.log(sumData);
  return (
    <>
      {activeTab == "Daromad turlari bo‘yicha" && (
        <div className="bg-white shadow px-5 py-4 rounded-2xl mb-6">
          <div className="flex items-end gap-2 pb-3">
            <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
            <h2>Jadval bo'yicha qisqacha ma'lumot</h2>
          </div>

          <div className="flex items-center justify-between gap-10 overflow-x-auto">
            {/* {["#457AFF", "#FFB145", "#09B86F"].map((color, i) => ( */}
            <div
              className={`bg-[#457AFF4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-[500] text-[#457AFF]`}>
                  {}
                </h3>
                <h2 className={`text-3xl font-[500] text-[#457AFF]`}>1324</h2>
              </div>
              <div>
                <span className={`text-[#457AFF] text-lg`}>
                  Eng ko'p xodimlar: Respublika tashkilotlari (150)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg">Boshqaruv: 122</span>
                <span className="text-lg">Mutaxassislar: 465</span>
              </div>
            </div>
            <div
              className={`bg-[#FFB1454c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-[500] text-[#FFB145]`}>
                  Jami xodimlar
                </h3>
                <h2 className={`text-3xl font-[500] text-[#FFB145]`}>1324</h2>
              </div>
              <div>
                <span className={`text-[#FFB145] text-lg`}>
                  Eng ko'p xodimlar: Respublika tashkilotlari (150)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg">Boshqaruv: 122</span>
                <span className="text-lg">Mutaxassislar: 465</span>
              </div>
            </div>
            <div
              className={`bg-[#09B86F4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-[500] text-[#09B86F]`}>
                  Jami xodimlar
                </h3>
                <h2 className={`text-3xl font-[500] text-[#09B86F]`}>1324</h2>
              </div>
              <div>
                <span className={`text-[#09B86F] text-lg`}>
                  Eng ko'p xodimlar: Respublika tashkilotlari (150)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg">Boshqaruv: 122</span>
                <span className="text-lg">Mutaxassislar: 465</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* {activeTab == "2-ilova" && (
        <div className="bg-white shadow px-5 py-4 rounded-2xl mb-6">
          <div className="flex items-end gap-2 pb-3">
            <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
            <h2>Jadval bo'yicha qisqacha ma'lumot</h2>
          </div>

          <div className="flex items-center justify-between gap-10 overflow-x-auto">
            {["#457AFF", "#FFB145", "#09B86F"].map((color, i) => (
              <div
                key={i}
                className={`bg-[${color}4c] h-[220px] w-[100%] min-w-[400px] rounded-xl py-6 px-3 flex flex-col gap-5`}
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-[500] text-[${color}]`}>
                    Jami xodimlar
                  </h3>
                  <h2 className={`text-3xl font-[500] text-[${color}]`}>
                    1324
                  </h2>
                </div>
                <div>
                  <span className={`text-[${color}] text-lg`}>
                    Eng ko'p xodimlar: Respublika tashkilotlari (150)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg">Boshqaruv: 122</span>
                  <span className="text-lg">Mutaxassislar: 465</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}
    </>
  );
}

export default IncomeSum;
