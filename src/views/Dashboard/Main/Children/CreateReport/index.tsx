import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import {
  usePlanCreateMutation,
  useGetPlanColumnsReportQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

function CreateReport() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [statement, setStatement] = useState<string | null>(null);
  const [createReport] = usePlanCreateMutation();

  const {
    data: organization,
    isLoading: organization_loading,
    error: organization_error,
  } = useGetOrganizationReportsQuery();

  const {
    data: plan_cols,
    isLoading: plan_cols_loading,
    error: plan_cols_error,
  } = useGetPlanColumnsReportQuery();
  const lang = useSelector((state: RootState) => state.language.lang);

  const {
    data: statment,
    isLoading: statment_loading,
    error: statment_error,
  } = useGetStatementsReportQuery({
    lang,
  });

  const createReportHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { year, plan_value } = Object.fromEntries(formData.entries());

    if (!selectedOrg || !selectedColumn) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    const payload = {
      organization: selectedOrg,
      column: selectedColumn,
      statement: statement,
      year,
      plan_value,
    };

    try {
      await createReport(payload).unwrap();
      alert("Hisobot muvaffaqiyatli yaratildi!");
    } catch (error) {
      console.error("Yaratishda xatolik:", error);
      alert("Hisobotni yaratishda xatolik yuz berdi!");
    }
  };

  return (
    <div className="px-5 w-full mb-30">
      <form onSubmit={createReportHandler} className="grid grid-cols-1 gap-3">
        {/* ORGANIZATION */}
        <div className="w-full">
          <Label className="pb-1.5 text-md block">Organizatsiya</Label>
          <Select onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder="Tanlang" />
            </SelectTrigger>
            <SelectContent>
              {organization_loading && (
                <div className="text-center text-sm py-2">Yuklanmoqda...</div>
              )}
              {organization_error && (
                <div className="text-center text-sm text-red-500 py-2">
                  Xatolik yuz berdi
                </div>
              )}
              {organization?.map((item: any) => (
                <SelectItem key={item?.id} value={String(item?.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full">
          <Label className="pb-1.5 text-md block">Hisobot formasi</Label>
          <Select onValueChange={setStatement}>
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder="Tanlang" />
            </SelectTrigger>
            <SelectContent>
              {statment_loading && (
                <div className="text-center text-sm py-2">Yuklanmoqda...</div>
              )}
              {statment_error && (
                <div className="text-center text-sm text-red-500 py-2">
                  Xatolik yuz berdi
                </div>
              )}
              {statment?.results.flatMap((item: any) =>
                item.children.map((child: any) => (
                  <SelectItem key={child.id} value={String(child.id)}>
                    {child.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* PLAN COLUMN */}
        <div className="w-full">
          <Label className="pb-1.5 text-md block">Hisobot ustuni</Label>
          <Select onValueChange={setSelectedColumn}>
            <SelectTrigger className="w-full min-h-[45px]">
              <SelectValue placeholder="Tanlang" />
            </SelectTrigger>
            <SelectContent>
              {plan_cols_loading && (
                <div className="text-center text-sm py-2">Yuklanmoqda...</div>
              )}
              {plan_cols_error && (
                <div className="text-center text-sm text-red-500 py-2">
                  Xatolik yuz berdi
                </div>
              )}
              {plan_cols?.map((item: any) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.parent} - {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* YEAR */}
        <div className="w-full">
          <Label className="pb-1.5 text-md">Yil</Label>
          <Input name="year" className="min-h-[45px]" required />
        </div>

        {/* COUNT */}
        <div className="w-full">
          <Label className="pb-1.5 text-md">Qiymat</Label>
          <Input name="plan_value" className="min-h-[45px]" required />
        </div>

        {/* SUBMIT */}
        <div>
          <Button className="min-h-[40px] min-w-[130px] bg-[#09B86F] text-md">
            Yuborish
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateReport;
