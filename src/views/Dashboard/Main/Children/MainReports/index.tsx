import React, { useState } from "react";
import { FaRegCheckCircle, FaRegFileAlt } from "react-icons/fa";
import { LuChartColumn } from "react-icons/lu";
import { RiSdCardMiniLine } from "react-icons/ri";
import { FiArrowUpCircle } from "react-icons/fi";
import { BiXCircle } from "react-icons/bi";
import { useGetDashboardReportQuery,  useGetStatementStatsReportQuery   } from "@/services/reportsApi";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useExportStatsMutation } from "@/services/uniqeApi";




function Mainreports() {
   // Jadval APi
  const { data: reportData, isLoading: loading } = useGetStatementStatsReportQuery();
  const [isOpen, setIsOpen] = useState(false);
  // format yuklash API

  const [exportStats, { isLoading: exportLoading }] = useExportStatsMutation();

  const handleDownload = async (type:any) => {
    try {
      const res = await exportStats(type).unwrap();

      const blob = new Blob([res]);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = type === "csv" ? "hisobot.csv" : "hisobot.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  // to'plam Api
  const { data, isLoading } = useGetDashboardReportQuery();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="px-5 py-4">
      {/* Format yuklash */}
    <div className="w-full bg-white px-7 py-8 mt-5 rounded-3xl flex flex-col sm:flex-row items-center gap-4 sm:gap-5">

      {/* CSV */}
      <button
        onClick={() => handleDownload("csv")}
        disabled={exportLoading}
        className="text-lg sm:text-xl cursor-pointer text-white font-bold bg-indigo-500 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-2 w-full sm:w-auto justify-center"
      >
        <FaRegFileAlt />
        {exportLoading ? "Yuklanmoqda..." : "CSV formatda yuklab olish"}
      </button>

      {/* EXCEL */}
      <button
        onClick={() => handleDownload("excel")}
        disabled={exportLoading}
        className="text-lg sm:text-xl cursor-pointer text-white font-bold bg-green-600 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-2 w-full sm:w-auto justify-center"
      >
        <FaRegFileAlt />
        {exportLoading ? "Yuklanmoqda..." : "Excel formatda yuklab olish"}
      </button>

    </div>

      {/* To'plam */}
   <div className="w-full mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">

  {/* CARD1 */}
  <div className="relative border-l-4 border-blue-500 bg-gray-50 p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
    <div className="bg-blue-100 text-blue-500 p-3 rounded-xl text-2xl">
      <LuChartColumn />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">ASOSIY FORMALAR</p>
      <h1 className="text-2xl font-bold text-gray-800">
        {data?.father_statements ?? 0}
      </h1>
    </div>
  </div>

  {/* CARD2 */}
  <div className="relative border-l-4 border-indigo-500 bg-gray-50 p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
    <div className="bg-indigo-100 text-indigo-500 p-3 rounded-xl text-2xl">
      <FaRegCheckCircle />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">JAMI HISOBOTLAR</p>
      <h1 className="text-2xl font-bold text-gray-800">
        {data?.total_reports ?? 0}
      </h1>
    </div>
  </div>

  {/* CARD3 */}
  <div className="relative border-l-4 border-cyan-600 bg-gray-50 p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
    <div className="bg-cyan-100 text-cyan-600 p-3 rounded-xl text-2xl">
      <RiSdCardMiniLine />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">JAMI SAQLANGAN</p>
      <h1 className="text-2xl font-bold text-gray-800">
        {data?.draft_reports ?? 0}
      </h1>
    </div>
  </div>

  {/* CARD4 */}
  <div className="relative border-l-4 border-yellow-500 bg-gray-50 p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
    <div className="bg-yellow-100 text-yellow-500 p-3 rounded-xl text-2xl">
      <FiArrowUpCircle />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">JAMI YUBORILGAN</p>
      <h1 className="text-2xl font-bold text-gray-800">
        {data?.sent_reports ?? 0}
      </h1>
    </div>
  </div>

  {/* CARD5 */}
  <div className="relative border-l-4 border-red-500 bg-gray-50 p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
    <div className="bg-red-100 text-red-500 p-3 rounded-xl text-2xl">
      <BiXCircle />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">JAMI BEKOR QILINGAN</p>
      <h1 className="text-2xl font-bold text-gray-800">
        {data?.returned_reports ?? 0}
      </h1>
    </div>
  </div>

  {/* CARD6 */}
  <div className="relative border-l-4 border-green-600 bg-gray-50 p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
    <div className="bg-green-100 text-green-600 p-3 rounded-xl text-2xl">
      <FaRegCheckCircle />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">JAMI QABUL QILINGAN</p>
      <h1 className="text-2xl font-bold text-gray-800">
        {data?.accepted_reports ?? 0}
      </h1>
    </div>
  </div>

</div>

      {/* Jadval */}

      <div className="w-full mt-10">
  <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">

    <table className="w-full border-collapse text-sm">

      {/* HEADER */}
      <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <tr>
          <th className="px-6 py-4 text-left w-[35%]">
            HISOBOT FORMASI
          </th>
          <th className="py-4">ICHKI FORMALAR</th>
          <th className="py-4">SAQLANGAN</th>
          <th className="py-4">YUBORILGAN</th>
          <th className="py-4">BEKOR</th>
          <th className="py-4">QABUL</th>
          <th className="py-4">JAMI</th>
        </tr>
      </thead>

      <tbody className="text-gray-700">

        {loading && (
          <tr>
            <td colSpan={7} className="text-center py-6">
              Loading...
            </td>
          </tr>
        )}

        {reportData?.data?.map((item: any) => (
          <React.Fragment key={item.id}>

            {/* MAIN ROW */}
            <tr
              onClick={() =>
                setIsOpen(isOpen === item.id ? null : item.id)
              }
              className="border-b cursor-pointer hover:bg-gray-50 transition group"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 font-bold text-black">
                  <span className="text-gray-400  group-hover:text-indigo-500 transition">
                    {isOpen === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                  {item.name}
                </div>
              </td>

              <td className="text-center font-bold text-black">{item.count} ta</td>
              <td className="text-center text-blue-600 font-medium">{item.saved}</td>
              <td className="text-center text-orange-500 font-medium">{item.sent}</td>
              <td className="text-center text-red-500 font-medium">{item.cancelled}</td>
              <td className="text-center text-green-600 font-medium">{item.accepted}</td>
              <td className="text-center font-bold text-gray-900">{item.total}</td>
            </tr>

            {/* CHILDREN */}
            {isOpen === item.id && item.children?.map((child: any) => (
              <tr key={child.id} className="bg-gray-50 border-b">
                <td className="pl-12 py-5 font-medium text-gray-700">
                  ↳ {child.name}
                </td>
                <td className="text-center font-medium text-gray-800">{child.count} ta</td>
                <td className="text-center text-blue-600">{child.saved}</td>
                <td className="text-center text-orange-500">{child.sent}</td>
                <td className="text-center text-red-500">{child.cancelled}</td>
                <td className="text-center text-green-600">{child.accepted}</td>
                <td className="text-center font-semibold">{child.total}</td>
              </tr>
            ))}

          </React.Fragment>
        ))}

        {/* TOTAL */}
        {reportData?.totals && (
          <tr className="bg-gray-100 font-bold text-gray-800">
            <td className="px-6 py-4">JAMI</td>
            <td className="text-center font-bold text-black ">{reportData.totals.count}ta</td>
            <td className="text-center">{reportData.totals.saved}</td>
            <td className="text-center">{reportData.totals.sent}</td>
            <td className="text-center">{reportData.totals.cancelled}</td>
            <td className="text-center">{reportData.totals.accepted}</td>
            <td className="text-center">{reportData.totals.total}</td>
          </tr>
        )}

      </tbody>
    </table>
  </div>
</div>

    </div>
  );
}

export default Mainreports;