import { ChartNoAxesColumn } from "lucide-react";
import { useEffect, useState } from "react";

function EmployeeAnalysisSum({ activeTab, data }: any) {
  const [sumData, setSumData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data && data.length > 0) {
      let ilovaData: Record<string, any> = {};

      if (activeTab === "4-ilova") {
        ilovaData = data[0]["4-ilova"] || {};
      } else if (activeTab === "5-ilova") {
        ilovaData = data[0]["5-ilova"] || {};
      } else if (activeTab === "Daromad turlari bo‘yicha") {
        ilovaData = data[0]["Daromad turlari bo‘yicha"] || {};
      } else if (activeTab === "Tushumlar bo‘yicha") {
        ilovaData = data[0]["Tushumlar bo‘yicha"] || {};
      } else if (activeTab === "1-ilova") {
        ilovaData = data[0]["1-ilova"] || {};
      } else if (activeTab === "2-ilova") {
        ilovaData = data[0]["2-ilova"] || {};
      }
       else if (activeTab === "3-ilova") {
        ilovaData = data[0]["3-ilova"] || {};
      } 
       else if (activeTab === "Jamg'arma") {
        ilovaData = data[0]["Jamg'arma"] || {};
      } 
      else {
        // fallback: butun obyektni berib yuborish
        ilovaData = data[0] || {};
      }

      setSumData(ilovaData);
    }
  }, [data, activeTab]);

  // recursive renderer
  const renderEntries = (obj: Record<string, any>) => {
    return Object.entries(obj).map(([label, value], i) => (
      <div
        key={label + i}
        className="bg-gray-100 h-[140px] rounded-xl py-6 px-4 flex flex-col justify-between"
      >
        <h3 className="text-md font-medium text-gray-700">{label}</h3>
        {typeof value === "object" && value !== null ? (
          <div className="mt-2 space-y-1">
            {Object.entries(value).map(([subKey, subVal], j) => (
              <div key={subKey + j} className="flex justify-between text-sm">
                <span className="text-gray-600">{subKey}</span>
                <span className="font-semibold">{String(subVal)}</span>
              </div>
            ))}
          </div>
        ) : (
          <h2 className="text-xl font-bold text-gray-900">{value}</h2>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white shadow px-5 py-4 rounded-2xl mb-6">
      <div className="flex items-end gap-2 pb-3">
        <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
        <h2>Jadval bo'yicha qisqacha ma'lumot</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {renderEntries(sumData)}
      </div>
    </div>
  );
}

export default EmployeeAnalysisSum;
