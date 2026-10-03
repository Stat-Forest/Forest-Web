"use client";

import { useGetLandDocumentsReportsQuery } from "@/services/generalApi";
import { Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/utils/useDebounce";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

function LandDocumentsContainers() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "uz";
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);

  const {
    data: landDocumentsData,
    isLoading,
    isFetching,
    isError,
  } = useGetLandDocumentsReportsQuery({
    ordering: "date_created",
    page,
    per_page: perPage,
    search: debouncedSearchTerm,
    lang,
  });

  const formatDocType = (docType?: string) => {
    if (!docType) return "-";
    if (i18n.language === "ru") {
      const map: Record<string, string> = {
        Qaror: "Решение",
        "Yo'riqnoma": "Инструкция",
        Nizom: "Положение",
        Farmoish: "Распоряжение",
        Buyruq: "Приказ",
      };
      return map[docType] || docType;
    }
    return docType;
  };

  const formatOrganizationName = (orgName?: string) => {
    if (!orgName) return "-";
    if (i18n.language === "ru") {
      if (orgName === "O'rmon xo'jaligini raqamlashtirish markazi davlat muassasasi") {
        return t("compny_name");
      }
      let name = orgName;
      name = name.replace(/davlat o'rmon xo'jaligi/gi, "Государственное лесное хозяйство");
      name = name.replace(/davlat o'rmon ishlab chiqarish korxonasi/gi, "Государственное лесопроизводственное предприятие");
      return name;
    }
    return orgName;
  };

  const formatDocName = (docName?: string) => {
    if (!docName) return "-";
    if (i18n.language === "ru") {
      let name = docName;
      name = name.replace(/Туман ҳокимининг қарори/gi, "Решение хокима района");
      name = name.replace(/Tuman hokimining qarori/gi, "Решение хокима района");
      name = name.replace(/Хатирчи туман ҳокимининг қарори/gi, "Решение хокима Хатирчинского района");
      name = name.replace(/Тахтакопир районы хакими шешеими/gi, "Решение хокима Тахтакупырского района");
      return name;
    }
    return docName;
  };

  // ------------------------------------------------
  // ✅ 100% TO'G'RI ISHLAYDIGAN DOWNLOAD FUNKSIYASI
  // ------------------------------------------------
  const handleDownload = async (doc: any) => {
    if (!doc.file_url) {
      alert(t("fileNotFound") || "Fayl manzili topilmadi!");
      return;
    }

    try {
      // 🔹 Agar URL http bo'lsa, avtomatik https ga o'zgartirish
      let fileUrl = doc.file_url;
      if (fileUrl.startsWith("http://")) {
        fileUrl = fileUrl.replace("http://", "https://");
      }

      const response = await fetch(fileUrl, {
        method: "GET",
        headers: {
          Accept: "*/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Server xatosi: ${response.status}`);
      }

      // Faylni blob sifatida olish
      const blob = await response.blob();

      // Fayl nomini olish
      const fileExtension =
        doc.file_url.split(".").pop()?.split("?")[0] || "pdf";
      const fileName = `${doc.name || "document"}.${fileExtension}`;

      // Yuklash uchun link yaratish
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // URLni tozalash
      window.URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error("Download error:", error);

      // 🔹 Agar fetch https versiyada ham ishlamasa, fallback uchun alert
      alert(
        t("downloadError") || "Faylni yuklab bo'lmadi. Iltimos, brauzer konsolini tekshiring yoki administrator bilan bog'laning."
      );
    }
  };

  // Filtlarni o'zgartirganda sahifa reset bo'ladi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  const totalPages = Math.ceil((landDocumentsData?.count || 0) / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, landDocumentsData?.count || 0);

  const handleNextPage = () => page < totalPages && setPage(page + 1);
  const handlePrevPage = () => page > 1 && setPage(page - 1);

  const isAnyFilterActive = searchTerm;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          onClick={() => setPage(i)}
          variant={page === i ? "default" : "outline"}
          className={`mx-1 min-w-[40px] ${
            page === i ? "bg-blue-600 text-white" : ""
          }`}
          disabled={isFetching}
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500 text-center p-4">{t("error")}</div>;
  }

  return (
    <div className="w-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 shadow-xs backdrop-blur-md transition-colors my-4">
      {/* 🔍 Filter */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder={`${t("search")}...`}
          className="w-[260px] text-xs sm:text-sm h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:!bg-slate-800 dark:!text-slate-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {isAnyFilterActive && (
          <Button
            variant="outline"
            onClick={() => setSearchTerm("")}
            className="h-[40px] rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 text-xs sm:text-sm"
          >
            {t("reset")}
          </Button>
        )}

        <div className="ml-auto">
          <Button
            onClick={() => navigate("/land-documents-create")}
            className="h-[40px] px-4 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
          >
            {t("new_document")}
          </Button>
        </div>
      </div>

      {/* 📄 Table */}
      <div className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs p-1">
        <div className="p-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          {t("totalRecords", { count: landDocumentsData?.count || 0 })}
          {landDocumentsData?.results?.length > 0 && (
            <span> ({t("shown", { count: startItem, count2: endItem })})</span>
          )}
        </div>

        <Table className="w-full border-collapse">
          <TableHeader className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            <TableRow className="h-[44px] hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
              <TableHead className="w-[20%] text-xs sm:text-sm font-bold pl-3 text-slate-800 dark:text-slate-200">
                {t("name")}
              </TableHead>
              <TableHead className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("date")}
              </TableHead>
              <TableHead className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("document_type")}
              </TableHead>
              <TableHead className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("organization")}
              </TableHead>
              <TableHead className="text-right pr-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("actions")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-xs sm:text-sm text-slate-800 dark:text-slate-100">
            {landDocumentsData?.results?.map((doc: any) => (
              <TableRow key={doc.id} className="h-[46px] hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200 dark:border-slate-800">
                <TableCell className="font-medium pl-3">
                  {formatDocName(doc.name)}
                </TableCell>
                <TableCell className="font-normal">
                  {doc.date}
                </TableCell>
                <TableCell className="font-normal">
                  {formatDocType(doc.document_type_display)}
                </TableCell>
                <TableCell className="font-normal">
                  {formatOrganizationName(doc.organization_name || doc.organization)}
                </TableCell>

                <TableCell className="text-right pr-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={!doc.file_url}
                      className="h-8 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 text-xs"
                    >
                      {t("download")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 📄 Pagination */}
        {landDocumentsData?.results?.length > 0 ? (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <div className="text-sm text-gray-600">
              {t("records", {
                start: startItem,
                end: endItem,
                total: landDocumentsData?.count || 0,
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrevPage}
                disabled={page === 1 || isFetching}
                variant="outline"
                size="sm"
              >
                {t("before")}
              </Button>

              <div className="flex items-center">{renderPageNumbers()}</div>

              <Button
                onClick={handleNextPage}
                disabled={page >= totalPages || isFetching}
                variant="outline"
                size="sm"
              >
                {t("next")}
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              {t("page")} {page} / {totalPages}
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-40">
            <h1 className="text-gray-500">
              {isAnyFilterActive ? t("noDataFound") : t("noDataAvailable")}
            </h1>
          </div>
        )}
      </div>

      {isFetching && !isLoading && (
        <div className="flex justify-center items-center mt-4">
          <span className="text-[#3B82F6]">{t("loading")}</span>
        </div>
      )}
    </div>
  );
}

export default LandDocumentsContainers;
