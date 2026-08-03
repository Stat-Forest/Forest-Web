import React, { useState } from "react";
import { FaRegCheckCircle, FaRegFileAlt } from "react-icons/fa";
import { LuChartColumn } from "react-icons/lu";
import { RiSdCardMiniLine } from "react-icons/ri";
import { FiArrowUpCircle } from "react-icons/fi";
import { BiXCircle } from "react-icons/bi";
import { useGetDashboardReportQuery, useGetStatementStatsReportQuery } from "@/services/reportsApi";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useExportStatsMutation } from "@/services/uniqeApi";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

function Mainreports() {
  const { t } = useTranslation();
  const lang = useSelector((state: RootState) => state.language.lang);
  // Jadval APi
  const { data: reportData, isLoading: loading } = useGetStatementStatsReportQuery({ lang });
  const [isOpen, setIsOpen] = useState<any>(false);
  const navigate = useNavigate();
  // format yuklash API

  const [exportStats, { isLoading: exportLoading }] = useExportStatsMutation();

  const handleDownload = async (type: any) => {
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
    return <p className="p-4 text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="px-3 py-3">
      {/* Format yuklash */}
      <div className="w-full bg-white dark:bg-slate-900 px-5 py-4 mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xs transition-colors">
        {/* CSV */}
        <button
          onClick={() => handleDownload("csv")}
          disabled={exportLoading}
          className="h-[40px] text-xs sm:text-sm cursor-pointer text-white font-semibold bg-indigo-600 hover:bg-indigo-700 px-4 rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <FaRegFileAlt size={16} />
          {exportLoading ? t("loading") : t("download_csv")}
        </button>

        {/* EXCEL */}
        <button
          onClick={() => handleDownload("excel")}
          disabled={exportLoading}
          className="h-[40px] text-xs sm:text-sm cursor-pointer text-white font-semibold bg-emerald-600 hover:bg-emerald-700 px-4 rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <FaRegFileAlt size={16} />
          {exportLoading ? t("loading") : t("download_excel")}
        </button>
      </div>

      {/* To'plam */}
      <div className="w-full mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CARD1 */}
        <div className="relative border border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500 bg-white dark:bg-slate-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0">
            <LuChartColumn />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tight leading-snug">{t("main_forms")}</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {data?.father_statements ?? 0}
            </h1>
          </div>
        </div>

        {/* CARD2 */}
        <div className="relative border border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-500 bg-white dark:bg-slate-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0">
            <FaRegCheckCircle />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tight leading-snug">{t("total_reports")}</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {data?.total_reports ?? 0}
            </h1>
          </div>
        </div>

        {/* CARD3 */}
        <div className="relative border border-slate-200 dark:border-slate-700 border-l-4 border-l-cyan-600 bg-white dark:bg-slate-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0">
            <RiSdCardMiniLine />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tight leading-snug">{t("total_saved")}</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {data?.draft_reports ?? 0}
            </h1>
          </div>
        </div>

        {/* CARD4 */}
        <div className="relative border border-slate-200 dark:border-slate-700 border-l-4 border-l-amber-500 bg-white dark:bg-slate-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0">
            <FiArrowUpCircle />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tight leading-snug">{t("total_sent")}</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {data?.sent_reports ?? 0}
            </h1>
          </div>
        </div>

        {/* CARD5 */}
        <div className="relative border border-slate-200 dark:border-slate-700 border-l-4 border-l-red-500 bg-white dark:bg-slate-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0">
            <BiXCircle />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tight leading-snug">{t("total_cancelled")}</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {data?.returned_reports ?? 0}
            </h1>
          </div>
        </div>

        {/* CARD6 */}
        <div className="relative border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0">
            <FaRegCheckCircle />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tight leading-snug">{t("total_accepted")}</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {data?.accepted_reports ?? 0}
            </h1>
          </div>
        </div>
      </div>

      {/* Jadval */}

      <div className="w-full mt-10">
        {/* Jadval */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors mt-4">
          <table className="w-full border-collapse text-xs">
            {/* HEADER */}
            <thead className="bg-indigo-600 dark:bg-indigo-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left w-[38%] text-xs font-bold text-white dark:text-white uppercase tracking-wider">
                  {t("report_form")}
                </th>
                <th className="py-3 text-xs font-bold text-white dark:text-white uppercase tracking-wider text-center">{t("inner_forms")}</th>
                <th className="py-3 text-xs font-bold text-white dark:text-white uppercase tracking-wider text-center">{t("saved_status")}</th>
                <th className="py-3 text-xs font-bold text-white dark:text-white uppercase tracking-wider text-center">{t("sent_status")}</th>
                <th className="py-3 text-xs font-bold text-white dark:text-white uppercase tracking-wider text-center">{t("cancelled_status")}</th>
                <th className="py-3 text-xs font-bold text-white dark:text-white uppercase tracking-wider text-center">{t("accepted_status")}</th>
                <th className="py-3 text-xs font-bold text-white dark:text-white uppercase tracking-wider text-center">{t("total_status")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500 dark:text-slate-300">
                    {t("loading")}
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
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                        <span className="text-slate-400 group-hover:text-indigo-400 transition-colors">
                          {isOpen === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                        <span className="text-xs text-slate-800 dark:text-white">{item.name}</span>
                      </div>
                    </td>

                    <td className="text-center font-bold text-slate-800 dark:text-white">{item.count} {t("count")}</td>
                    <td className="text-center text-blue-600 dark:text-blue-300 font-semibold">{item.saved}</td>
                    <td className="text-center text-amber-600 dark:text-amber-300 font-semibold">{item.sent}</td>
                    <td className="text-center text-red-600 dark:text-red-300 font-semibold">{item.cancelled}</td>
                    <td className="text-center text-emerald-600 dark:text-emerald-300 font-semibold">{item.accepted}</td>
                    <td className="text-center font-extrabold text-slate-900 dark:text-white">{item.total}</td>
                  </tr>

                  {/* CHILDREN */}
                  {isOpen === item.id && item.children?.map((child: any) => (
                    <tr
                      key={child.id}
                      onClick={() => navigate(`/resource-management/${child.id}/${encodeURIComponent(child.name)}`)}
                      className="bg-slate-50/70 dark:bg-slate-800/50 cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-colors"
                    >
                      <td className="pl-10 py-2 font-semibold text-xs text-slate-700 dark:text-slate-100">
                        ↳ {child.name}
                      </td>
                      <td className="text-center font-semibold text-xs text-slate-700 dark:text-slate-100">{child.count} {t("count")}</td>
                      <td className="text-center text-xs text-blue-600 dark:text-blue-300 font-semibold">{child.saved}</td>
                      <td className="text-center text-xs text-amber-600 dark:text-amber-300 font-semibold">{child.sent}</td>
                      <td className="text-center text-xs text-red-600 dark:text-red-300 font-semibold">{child.cancelled}</td>
                      <td className="text-center text-xs text-emerald-600 dark:text-emerald-300 font-semibold">{child.accepted}</td>
                      <td className="text-center text-xs font-bold text-slate-800 dark:text-white">{child.total}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* TOTAL */}
              {reportData?.totals && (
                <tr className="bg-slate-100 dark:bg-slate-800/90 font-bold text-xs text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">{t("total_status")}</td>
                  <td className="text-center font-extrabold text-slate-900 dark:text-white">{reportData.totals.count} {t("count")}</td>
                  <td className="text-center font-bold text-blue-600 dark:text-blue-300">{reportData.totals.saved}</td>
                  <td className="text-center font-bold text-amber-600 dark:text-amber-300">{reportData.totals.sent}</td>
                  <td className="text-center font-bold text-red-600 dark:text-red-300">{reportData.totals.cancelled}</td>
                  <td className="text-center font-bold text-emerald-600 dark:text-emerald-300">{reportData.totals.accepted}</td>
                  <td className="text-center font-extrabold text-slate-900 dark:text-white">{reportData.totals.total}</td>
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