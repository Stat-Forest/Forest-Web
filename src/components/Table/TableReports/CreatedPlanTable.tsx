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
  const { t } = useTranslation();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleDelete = async (id: number) => {
    setLoadingId(id);
    try {
      await deletePlan(id).unwrap();
    } catch (err) {
      console.error("Xatolik:", err);
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
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[5%] text-lg pl-2 text-[#717171] text-left rounded-tl-lg rounded-bl-lg border-none">
            №
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_12")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_83")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[15%] text-left border-none">
            {t("item_14")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_15")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none rounded-tr-lg rounded-br-lg"></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data?.map((item: any, index: number) => (
          <Fragment key={item.id}>
            <TableRow
              className="h-[50px] cursor-pointer hover:bg-gray-100"
              onClick={() => toggleRow(index)}
            >
              {/* Global raqam: 1-20, 21-40, 41-60, ... */}
              <TableCell className="w-[5%] text-base font-[300] border-none">
                {getGlobalIndex(index)}
              </TableCell>
              <TableCell className="w-[20%] text-lg font-[300] border-none">
                {item?.organization || "N/A"}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                {item?.statement || "N/A"}
              </TableCell>
              <TableCell className="w-[15%] text-base font-[300] border-none">
                {item?.year || "N/A"}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                {item?.created_at || "N/A"}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/plan-update/${item.id}`);
                    }}
                    className="bg-[#09B86F] hover:bg-[#09B86F]"
                    size="sm"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    className="bg-[#09B86F] hover:bg-[#09B86F]"
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
            </TableRow>

            {openRow === index && (
              <TableRow className="bg-gray-50 transition-all duration-300">
                <TableCell colSpan={6} className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {item?.plan_items?.map((plan: any, idx: number) => (
                      <div
                        key={plan.id || idx}
                        className="p-3 border rounded-md shadow-sm bg-white"
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
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

export default CreatedPlantable;
