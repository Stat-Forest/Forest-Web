import { useGetAllReportsQuery } from "@/services/reportsApi";
import TableReports from "../TableReports/TableReports";
import { useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function ReportItemTable({ setDetailId }: any) {
  const { id } = useParams();

  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: report,
    isLoading,
    error,
  } = useGetAllReportsQuery(
    id
      ? {
          statement: id,
          status: `status=${selectedStatus}`,
          organization__region: selectedOrganization,
          statement__period: selectedPeriod,
          search: searchTerm,
        }
      : skipToken
  );

  if (isLoading) return <h1>loading...</h1>;
  if (error) return <h1>error</h1>;

  return (
    <>
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
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value)}
          >
            <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
              <SelectValue placeholder="Hisobot holati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="saved">Qoralama</SelectItem>
              <SelectItem value="sent">Jo'natilgan</SelectItem>
              <SelectItem value="cancelled">Qaytarilgan</SelectItem>
              <SelectItem value="accepted">Qabul qilingan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button
            onClick={() => {
              setSelectedOrganization("");
              setSelectedPeriod("");
              setSelectedStatus("");
              setSearchTerm("");
            }}
            className="bg-[#09B86F] text-[white] hover:bg-[#09B86F] cursor-pointer"
          >
            Reset
          </Button>
        </div>
      </div>

      <div>
        <TableReports data={report} />
      </div>
    </>
  );
}

export default ReportItemTable;
