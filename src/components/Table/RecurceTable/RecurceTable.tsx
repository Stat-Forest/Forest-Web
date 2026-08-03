import { Button } from "@/components/ui/button";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { read, utils, writeFileXLSX } from "xlsx";

function RecurceTable() {
  const [htmlContent, setHtmlContent] = useState("");
  const tableRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { t } = useTranslation();

  // ✅ Excel faylni import qilish
  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let html = utils.sheet_to_html(worksheet);

    // Chegarali jadval uchun class qo‘shamiz
    html = html.replace("<table", "<table class='excel-table'");
    setHtmlContent(html);
  };

  // ✅ Export qilish (xlsx faylga)
  const handleExport = useCallback(() => {
    const tableElement = tableRef.current?.getElementsByTagName("TABLE")[0];
    if (!tableElement) return;

    const workbook = utils.table_to_book(tableElement);
    writeFileXLSX(workbook, "ExportedData.xlsx");
  }, []);

  // ✅ Print qilish
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && tableRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Jadvalni chop etish</title>
            <style>
              table {
                border-collapse: collapse;
                width: 100%;
              }
              th, td {
                border: 1px solid black;
                padding: 8px;
                text-align: left;
              }
            </style>
          </head>
          <body>
            ${tableRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };









  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => alert("Yangi xisobot qo‘shish logikasi")}>
          {t('new_report')}
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => fileInputRef.current?.click()}>{t('import')}</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={importFile}
            className="hidden"
          />
          <Button onClick={handleExport}>Export</Button>
          <Button onClick={handlePrint}>Chop etish</Button>
        </div>
      </div>

      <div ref={tableRef} style={{ overflow: "auto" }} dangerouslySetInnerHTML={{ __html: htmlContent }} />

      {/* Excel uchun custom style */}
      <style>{`
        .excel-table {
          border-collapse: collapse;
          width: 100%;
        }
        .excel-table th, .excel-table td {
          border: 1px solid black;
          padding: 8px;
          text-align: left;
        }
      `}</style>
    </div>
  );
}

export default RecurceTable;
