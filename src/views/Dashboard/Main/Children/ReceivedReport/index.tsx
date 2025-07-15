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

function ReceivedReport() {
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useGetAllReportsQuery({
    statement: "",
    status: `status=accepted`,
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
              placeholder="Qidiruv..."
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
                <SelectValue placeholder="Region" />
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
                <SelectValue placeholder="Hisobot turi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Kunlik</SelectItem>
                <SelectItem value="weekly">Haftalik</SelectItem>
                <SelectItem value="monthly">Oylik</SelectItem>
                <SelectItem value="quarterly">Choraklik (3 oy)</SelectItem>
                <SelectItem value="yearly">Yillik</SelectItem>
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
              Reset
            </Button>
          </div>
        </div>
        <TableReports data={data} />
      </div>
    </div>
  );
}

export default ReceivedReport;
