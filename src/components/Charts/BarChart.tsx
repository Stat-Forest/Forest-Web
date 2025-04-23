import { useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { data } from "@/services/chartData";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileDown, FileImage, FileCode, Printer } from "lucide-react";

const colors = {
  boshqaruv: "#2ECC71",
  mutaxassis: "#F4B740",
  ishlab: "#4C6EF5",
  texnik: "#9B59B6",
  xizmat: "#E74C3C",
  ishchi: "#FF00FF",
};

import { LegendProps } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const CustomLegend = (props: LegendProps) => {
  const { payload } = props;

  return (
    <div className="flex flex-wrap justify-center items-center gap-4 px-4">
      {payload?.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div
            style={{
              backgroundColor: entry.color,
              width: 14,
              height: 14,
              borderRadius: 3,
            }}
          />
          <span className="text-md text-gray-700">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const StaffChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);

  const exportAs = async (type: "pdf" | "png" | "svg" | "print") => {
    if (!chartRef.current) return;

    const node = chartRef.current;

    if (type === "pdf") {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#fff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [297, 210],
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("staff_chart.pdf");
    }

    if (type === "png") {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#fff",
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "staff_chart.png";
      link.click();
    }

    if (type === "svg") {
      const svg = node.querySelector("svg");
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "staff_chart.svg";
      link.click();
    }

    if (type === "print") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#fff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      printWindow.document.write(`<img src="${imgData}" style="width:100%">`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  return (
    <div className="my-2">
      <div
        ref={chartRef}
        style={{
          background: "white",
          borderRadius: "10px",
          filter: "none",
        }}
        className="shadow"
      >
        <div className="flex items-center justify-between px-5 py-2">
          <div>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-green-500 text-white w-full">
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full max-w-[200px]">
                <DropdownMenuItem
                  onClick={() => exportAs("pdf")}
                  className="w-full gap-2"
                >
                  <FileDown size={16} />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportAs("png")}
                  className="w-full gap-2"
                >
                  <FileImage size={16} />
                  Export PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportAs("svg")}
                  className="w-full gap-2"
                >
                  <FileCode size={16} />
                  Export SVG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportAs("print")}
                  className="w-full gap-2"
                >
                  <Printer size={16} />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={600}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="8 4" />
            <XAxis
              dataKey="name"
              interval={0}
              height={80}
              tick={{
                fontSize: 14,
                width: "100%",
                textAnchor: "middle",
                fill: "#555",
              }}
            />
            <YAxis />
            <Tooltip cursor={false} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="boshqaruv" stackId="a" fill={colors.boshqaruv} />
            <Bar dataKey="mutaxassis" stackId="a" fill={colors.mutaxassis} />
            <Bar dataKey="ishlab" stackId="a" fill={colors.ishlab} />
            <Bar dataKey="texnik" stackId="a" fill={colors.texnik} />
            <Bar dataKey="xizmat" stackId="a" fill={colors.xizmat} />
            <Bar dataKey="ishchi" stackId="a" fill={colors.ishchi} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StaffChart;
