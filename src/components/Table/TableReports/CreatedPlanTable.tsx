import { Button } from "@/components/ui/button";
import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeletePlanMutation } from "@/services/reportsApi";
import { Edit2, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { toast } from "react-toastify";
import { translateStatementName } from "@/utils/i18nHelpers";

interface CreatedPlantableProps {
  data: any[];
  currentPage: number;
  perPage: number;
}

function CreatedPlantable({
  data,
  currentPage,
  perPage,
}: CreatedPlantableProps) {
  const [deletePlan] = useDeletePlanMutation();
  const { t, i18n } = useTranslation();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const navigate = useNavigate();

  const user_role = useSelector((state: RootState) => state.auth.user?.role);

  const handleDelete = async (id: number) => {
    setLoadingId(id);
    try {
      await deletePlan(id).unwrap();
      toast.success("Muvaffaqiyatli o‘chirildi");
    } catch (err: any) {
      console.error("Xatolik:", err);

      const message = err?.data?.message || err?.error || "Xatolik yuz berdi";

      toast.error(message);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleRow = (index: number) => {
    setOpenRow((prev) => (prev === index ? null : index));
  };

  // Global raqamni hisoblash: (currentPage - 1) * perPage + index + 1
  const getGlobalIndex = (index: number) => {
    return (currentPage - 1) * perPage + index + 1;
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shadow-xs">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 h-[50px] border-b border-slate-200 dark:border-slate-700">
            <TableHead className="w-[5%] text-sm font-semibold pl-3 text-slate-700 dark:text-slate-200 text-left border-none">
              №
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-sm font-semibold w-[20%] text-left border-none">
              {t("item_12")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-sm font-semibold w-[20%] text-left border-none">
              {t("item_83")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-sm font-semibold w-[15%] text-left border-none">
              {t("item_14")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-sm font-semibold w-[20%] text-left border-none">
              {t("item_15")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-sm font-semibold w-[20%] text-left border-none"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {data?.map((item: any, index: number) => (
            <Fragment key={item.id}>
              <TableRow
                className="h-[50px] cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                onClick={() => toggleRow(index)}
              >
                {/* Global raqam: 1-20, 21-40, 41-60, ... */}
                <TableCell className="w-[5%] text-sm font-medium text-slate-700 dark:text-slate-300 border-none pl-3">
                  {getGlobalIndex(index)}
                </TableCell>
                <TableCell className="w-[50%] text-sm font-medium text-slate-800 dark:text-slate-100 border-none whitespace-normal break-words">
                  {i18n.language === "ru" &&
                  (item?.organization === "O'rmon xo'jaligini raqamlashtirish markazi davlat muassasasi" ||
                    !item?.organization)
                    ? t("compny_name")
                    : item?.organization || "N/A"}
                </TableCell>
                <TableCell className="w-[20%] text-sm font-medium text-slate-700 dark:text-slate-200 border-none">
                  {translateStatementName(item?.statement, i18n.language) || "N/A"}
                </TableCell>
                <TableCell className="w-[15%] text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                  {item?.year || "N/A"}
                </TableCell>
                <TableCell className="w-[20%] text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                  {item?.created_at || "N/A"}
                </TableCell>
                {(user_role == "super_admin" || user_role == "bolim_admin") && (
                  <TableCell className="w-[20%] text-sm font-medium border-none">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/plan-update/${item.id}`);
                      }}
                      className="bg-[#3B82F6] hover:bg-[#2563EB]"
                      size="sm"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      className="bg-[#3B82F6] hover:bg-[#2563EB]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item?.id);
                      }}
                      disabled={loadingId === item?.id}
                      size="sm"
                    >
                      {loadingId === item?.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(index);
                      }}
                      size="sm"
                    >
                      {openRow === index ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>

            {openRow === index && (
              <TableRow className="bg-gray-50 transition-all duration-300">
                <TableCell colSpan={6} className="p-4">
                  {/* Plants section (for "Daromad 1" statement) */}
                  {item?.plants && Array.isArray(item.plants) && item.plants.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">
                        Plantlar:
                      </h3>
                      <div className="space-y-4">
                        {item.plants.map((plant: any, plantIdx: number) => (
                          <div
                            key={plant.id || plantIdx}
                            className="border rounded-lg p-4 bg-white shadow-sm"
                          >
                            <h4 className="text-md font-semibold text-gray-700 mb-3">
                              Plant: {plant.plant_name || plant.plant || `Plant ${plantIdx + 1}`}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {plant.items?.map((item: any, itemIdx: number) => (
                                <div
                                  key={item.id || itemIdx}
                                  className="p-3 border rounded-md shadow-sm bg-ice"
                                >
                                  <p className="text-sm font-semibold text-gray-700 break-words whitespace-pre-wrap">
                                    {item?.column_parent_name || item?.column_name || `Column ${itemIdx + 1}`}
                                  </p>
                                  <p className="text-base text-black break-words whitespace-pre-wrap">
                                    {item.plan_value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reja elementlari bo'limi (boshqa ustunlar yoki oddiy rejalar uchun) */}
                  {item?.plan_items && Array.isArray(item.plan_items) && item.plan_items.length > 0 && (
                    <div>
                      {item?.plants && item.plants.length > 0 && (
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">
                          Qolgan ustunlar:
                        </h3>
                      )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {item.plan_items.map((plan: any, idx: number) => (
                      <div
                        key={plan.id || idx}
                        className="p-3 border rounded-md shadow-sm bg-ice"
                      >
                        <p className="text-sm font-semibold text-gray-700 break-words whitespace-pre-wrap">
                          {plan?.column_parent_name} {plan.column_name}
                        </p>
                        <p className="text-base text-black break-words whitespace-pre-wrap">
                          {plan.plan_value}
                        </p>
                      </div>
                    ))}
                  </div>
                    </div>
                  )}

                  {/* No data message */}
                  {(!item?.plan_items || item.plan_items.length === 0) &&
                    (!item?.plants || item.plants.length === 0) && (
                      <div className="text-center text-gray-500 py-4">
                        Ma'lumotlar topilmadi
                      </div>
                    )}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

export default CreatedPlantable;
