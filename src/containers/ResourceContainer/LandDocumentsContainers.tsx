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

function LandDocumentsContainers() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const navigate = useNavigate();

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
  });

  // ------------------------------------------------
  // ✅ 100% TO'G'RI ISHLAYDIGAN DOWNLOAD FUNKSIYASI
  // ------------------------------------------------
  const handleDownload = async (doc: any) => {
    if (!doc.file_url) {
      alert(t("fileNotFound") || "Fayl manzili topilmadi!");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

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
    <div className="w-full p-5 my-5 bg-ice rounded-xl">
      {/* 🔍 Filter */}
      <div className="my-5 flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder={`${t("search")}...`}
          className="w-[260px] text-xl min-h-[40px] border-black"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {isAnyFilterActive && (
          <Button
            variant="outline"
            onClick={() => setSearchTerm("")}
            className="min-h-[40px]"
          >
            {t("reset")}
          </Button>
        )}

        <div className="ml-auto">
          <Button
            onClick={() => navigate("/land-documents-create")}
            className="bg-blue-600 text-white hover:bg-blue-700 min-h-[40px]"
          >
            {t("new_document")}
          </Button>
        </div>
      </div>

      {/* 📄 Table */}
      <div className="w-full border border-[silver] rounded-xl px-3 py-5">
        <div className="mb-3 text-sm text-gray-600">
          {t("totalRecords", { count: landDocumentsData?.count || 0 })}
          {landDocumentsData?.results?.length > 0 && (
            <span> ({t("shown", { count: startItem, count2: endItem })})</span>
          )}
        </div>

        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-[#eaeaea] h-[50px]">
              <TableHead className="w-[20%] text-lg text-[#717171] pl-2">
                {t("name")}
              </TableHead>
              <TableHead className="text-lg text-[#717171]">
                {t("date")}
              </TableHead>
              <TableHead className="text-lg text-[#717171]">
                {t("document_type")}
              </TableHead>
              <TableHead className="text-lg text-[#717171]">
                {t("organization")}
              </TableHead>
              <TableHead className="text-right pr-2 text-lg text-[#717171]">
                {t("actions")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {landDocumentsData?.results?.map((doc: any) => (
              <TableRow key={doc.id} className="h-[50px] hover:bg-gray-100">
                <TableCell className="text-base font-[300]">
                  {doc.name}
                </TableCell>
                <TableCell className="text-base font-[300]">
                  {doc.date}
                </TableCell>
                <TableCell className="text-base font-[300]">
                  {doc.document_type_display}
                </TableCell>
                <TableCell className="text-base font-[300]">
                  {doc.organization_name || doc.organization}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={!doc.file_url}
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
