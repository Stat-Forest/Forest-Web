import { useEffect, useState, useRef } from "react";
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileDown, FileImage, FileCode, Printer } from "lucide-react";
import { useGetLandAcquisitionQuery } from "@/services/statistikApi";

const colors = {
  boshqaruv: "#2ECC71",
  mutaxassis: "#F4B740",
  ishlab: "#4C6EF5",
  texnik: "#9B59B6",
  xizmat: "#E74C3C",
  ishchi: "#FF00FF",
};

const LandAcquisitionChart = ({ activeTab }: { activeTab: string }) => {
  const { data, isLoading } = useGetLandAcquisitionQuery();
  const chartRef = useRef<HTMLDivElement>(null);

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (data && data.length > 0) {

      let ilovaData = [];

      if (activeTab === "1-ilova") {
        ilovaData = data[0]["1-ilova"] || [];
      } else if (activeTab === "2-ilova") {
        ilovaData = data[0]["2-ilova"] || [];
      }

      setChartData(ilovaData || []);
    }
  }, [data, activeTab]);

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

  if (isLoading) {
    return <div className="p-5">Loading...</div>;
  }

  return (
    <div className="my-2">
      <div
        ref={chartRef}
        style={{ background: "white", borderRadius: "10px", filter: "none" }}
        className="shadow"
      >
        <div className="flex items-center justify-between px-5 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#3B82F6] text-white w-full hover:bg-[#2563EB]">Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full max-w-[200px]">
              <DropdownMenuItem
                onClick={() => exportAs("pdf")}
                className="w-full gap-2"
              >
                <span className="flex items-center gap-2">
                  <FileDown size={16} /> Export PDF
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportAs("png")}
                className="w-full gap-2"
              >
                <span className="flex items-center gap-2">
                  <FileImage size={16} /> Export PNG
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportAs("svg")}
                className="w-full gap-2"
              >
                <span className="flex items-center gap-2">
                  <FileCode size={16} /> Export SVG
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportAs("print")}
                className="w-full gap-2"
              >
                <span className="flex items-center gap-2">
                  <Printer size={16} /> Print
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {activeTab === "1-ilova" && (
          <ResponsiveContainer width="100%" height={600}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="8 4" />
              <XAxis
                dataKey="name"
                interval={0}
                height={80}
                tick={{ fontSize: 14, fill: "#555" }}
              />
              <YAxis />
              <Tooltip cursor={false} />
              <Legend />
              <Bar dataKey="Reja" stackId="a" fill={colors.boshqaruv} />
              <Bar dataKey="Amalda" stackId="a" fill={colors.mutaxassis} />
              <Bar dataKey="1-chorak" stackId="a" fill={colors.ishlab} />
              <Bar dataKey="2-chorak" stackId="a" fill={colors.texnik} />
              <Bar dataKey="3-chorak" stackId="a" fill={colors.xizmat} />
              <Bar dataKey="4-chorak" stackId="a" fill={colors.ishchi} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LandAcquisitionChart;
