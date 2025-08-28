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

function CreatedPlantable({ data }: any) {
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

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[20%] text-lg pl-2 text-[#717171] text-left rounded-tl-lg rounded-bl-lg border-none">
            {t("item_12")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_83")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
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
              <TableCell className="w-[20%] text-lg font-[300] border-none">
                {item?.organization}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                {item?.statement}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                {item?.year}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                {item?.created_at}
              </TableCell>
              <TableCell className="w-[20%] text-base font-[300] border-none">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => navigate(`/plan-update/${item.id}`)}
                    className="bg-[#09B86F] hover:bg-[#09B86F]"
                  >
                    <Edit2 />
                  </Button>
                  <Button
                    className="bg-[#09B86F] hover:bg-[#09B86F]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item?.id);
                    }}
                    disabled={loadingId === item?.id}
                  >
                    {loadingId === item?.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(index);
                    }}
                  >
                    {openRow === index ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            {openRow === index && (
              <TableRow className="bg-gray-50 transition-all duration-300">
                <TableCell colSpan={5} className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-4">
                    {item?.plan_items?.map((plan: any, idx: number) => (
                      <div
                        key={plan.id || idx}
                        className="p-3 border rounded-md shadow-sm bg-white"
                      >
                        <p className="text-sm font-semibold text-gray-700">
                          {plan?.column_parent_name} {plan.column_name}
                        </p>
                        <p className="text-base text-black">
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
