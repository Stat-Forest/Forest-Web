"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useGetHandbooksQuery } from "@/services/generalApi";

function SupportInformation() {
  const { t } = useTranslation();
  const { data: handbooksData, isLoading: handbooksLoading } = useGetHandbooksQuery();

  const handleDownload = async (handbook: any) => {
    if (!handbook.file_url) {
      alert("Fayl manzili topilmadi!");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      // 🔹 Agar URL http bo'lsa, avtomatik https ga o'zgartirish
      let fileUrl = handbook.file_url;
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
        handbook.file_url.split(".").pop()?.split("?")[0] || "pdf";
      const fileName = `${handbook.name || "document"}.${fileExtension}`;

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
      alert(
        "Faylni yuklab bo'lmadi. Iltimos, brauzer konsolini tekshiring yoki administrator bilan bog'laning."
      );
    }
  };

  return (
    <div className="pt-2 px-4">
      <h2 className="text-xl font-semibold text-white mb-2">
        {t("item_11")}
      </h2>
      <div className="w-full bg-gray-200 h-[5px] rounded-full mb-4">
        <div className="w-[280px] h-[5px] rounded-full bg-blue-500"></div>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-2 flex flex-col gap-3"
      >
        <AccordionItem value="item-1" className="shadow py-2 rounded-lg px-5 bg-ice">
          <AccordionTrigger className="text-2xl font-medium text-blue-600">
            {t("item_61")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>{t("item_66")}</p>
            <p>{t("item_67")}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="shadow py-2 rounded-lg px-5 bg-ice">
          <AccordionTrigger className="text-2xl font-medium text-blue-600">
            {t("item_62")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>{t("item_68")}</p>
            {handbooksLoading ? (
              <p className="mt-2 text-gray-500">Yuklanmoqda...</p>
            ) : handbooksData?.results && handbooksData.results.length > 0 ? (
              <ul className="list-disc list-inside mt-2 space-y-1">
                {handbooksData.results.map((handbook: any) => (
                  <li key={handbook.id}>
                    <button
                      onClick={() => handleDownload(handbook)}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                    >
                    {handbook.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="shadow py-2 rounded-lg px-5 bg-ice">
          <AccordionTrigger className="text-2xl font-medium text-blue-600">
            {t("item_63")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <ul className="list-disc list-inside mt-1">
              <li>{t("item_69")}</li>
              <li>{t("item_70")}</li>
              <li>{t("item_71")}</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="shadow py-2 rounded-lg px-5 bg-ice">
          <AccordionTrigger className="text-2xl font-medium text-blue-600">
            {t("item_64")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            {/* <p>{t("form_803")}</p> */}
            <ul className="list-disc list-inside mt-1">
              <li>{t("item_72")}</li>
              <li>{t("item_73")}</li>
              <li>{t("item_74")}</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5" className="shadow py-2 rounded-lg px-5 bg-ice">
          <AccordionTrigger className="text-2xl font-medium text-blue-600">
            5. {t("item_65")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <Link to={"/video"} className="underline text-blue-500 block">{t("item_76")}</Link>
            <Link to={"/video"} className="underline text-blue-500 block">{t("item_77")}</Link>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default SupportInformation;
