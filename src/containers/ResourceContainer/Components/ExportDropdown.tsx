import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

interface ExportDropdownProps {
  onExportExcel: () => void;
  onPrint: () => void;
}

export default function ExportDropdown({
  onExportExcel,
  onPrint,
}: ExportDropdownProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="py-2.5 font-semibold w-full md:w-[150px] rounded bg-[#3B82F6] border-1 text-[white] hover:bg-[#2563EB] transition-colors duration-300"
          data-aos="zoom-in"
          data-aos-delay="50"
        >
          {t("export")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2 ml-20">
        <DropdownMenuItem onClick={onExportExcel}>
          {t("exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint}>
          {t("printReport")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
