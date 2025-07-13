"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

function SupportInformation() {
  const { t } = useTranslation();

  return (
    <div className="pt-2 px-4">
      <h2 className="text-xl font-semibold text-black mb-2">
        {t("item_11")}
      </h2>
      <div className="w-full bg-gray-200 h-[5px] rounded-full mb-4">
        <div className="w-[280px] h-[5px] rounded-full bg-green-500"></div>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-2 flex flex-col gap-3"
      >
        <AccordionItem value="item-1" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            {t("item_61")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>{t("item_66")}</p>
            <p>{t("item_67")}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            {t("item_62")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>{t("item_68")}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
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

        <AccordionItem value="item-4" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
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

        <AccordionItem value="item-5" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            5. {t("item_65")}
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>{t("item_76")}</p>
            <p>{t("item_77")}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default SupportInformation;
