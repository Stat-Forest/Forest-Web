import TableReports from "@/components/Table/TableReports/TableReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAllReportsQuery } from "@/services/reportsApi";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function MainDetail() {
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  const { data, isLoading, error } = useGetAllReportsQuery({
    statement: "",
    status: `status=sent`,
    organization__region: selectedOrganization,
    statement__period: selectedPeriod,
    search: searchTerm,
  });

  return (
    <div className="px-5 w-full">
      {isLoading && <h1>Yuklanmoqda...</h1>}
      {error && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <div className="flex items-center gap-5 mb-6">
          <div>
            <Input
              type="text"
              placeholder={`${t("item_79")}...`}
              className="w-[260px] text-xl min-h-[40px] border-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <Select
              value={selectedOrganization}
              onValueChange={(value) => setSelectedOrganization(value)}
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("region")}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tashkent">Tashkent</SelectItem>
                <SelectItem value="namangan">Namangan</SelectItem>
                <SelectItem value="andijon">Andijon</SelectItem>
                <SelectItem value="fargona">Fergana</SelectItem>
                <SelectItem value="buxoro">Bukhara</SelectItem>
                <SelectItem value="samarqand">Samarkand</SelectItem>
                <SelectItem value="navoiy">Navoi</SelectItem>
                <SelectItem value="qashqadaryo">Qashqadarya</SelectItem>
                <SelectItem value="surxondaryo">Surxondaryo</SelectItem>
                <SelectItem value="xorazm">Khorezm</SelectItem>
                <SelectItem value="sirdaryo">Sirdaryo</SelectItem>
                <SelectItem value="jizzax">Jizzakh</SelectItem>
                <SelectItem value="qoraqalpog‘iston">Karakalpakstan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={selectedPeriod}
              onValueChange={(value) => setSelectedPeriod(value)}
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("reportType")}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("daily")}</SelectItem>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
                <SelectItem value="yearly">{t("yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              onClick={() => {
                setSelectedOrganization("");
                setSelectedPeriod("");
                setSearchTerm("");
              }}
              className="bg-[#09B86F] text-[white] hover:bg-[#09B86F] cursor-pointer"
            >
              {t("reset")}
            </Button>
          </div>
        </div>
        <TableReports data={data} />
      </div>
    </div>
  );
}

export default MainDetail;
