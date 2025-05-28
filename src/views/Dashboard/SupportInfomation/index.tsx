"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function SupportInformation() {
  return (
    <div className="pt-2 px-4">
      <h2 className="text-xl font-semibold text-black mb-2">
        Yordam va ma’lumot
      </h2>
      <div className="w-full bg-gray-200 h-[2px] rounded-full mb-4">
        <div className="w-[250px] h-[2px] rounded-full bg-green-500"></div>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-2 flex flex-col gap-3"
      >
        <AccordionItem value="item-1" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            1. Hisobot formatlari va yuborish tartibi
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>Formati: Excel (.xlsx), Word (.docx), PDF (*.pdf)</p>
            <p>Elektron imzo: Talab qilinadi (.pfx, .key)</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            2. Qo‘llanma (PDF shaklida)
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>[Qo‘llanma yuklab olish (PDF)]</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            3. Ko‘p so‘raladigan savollar (FAQ)
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>
              Hisobotni noto‘g‘ri yuborsam, uni qayta topshirish mumkinmi? – Ha,
              hisobot muddati tugamaguncha yangilab yuborish mumkin.
            </p>
            <p>
              Elektron imzo tizimini tan olmayapti, nima qilishim kerak? – Imzo
              sertifikatining amal qilish muddatini tekshiring yoki texnik
              xizmatga murojaat qiling.
            </p>
            <p>
              Hisobot yuklanmayotgani haqida xatolik chiqayapti. – Fayl hajmi 10
              MB dan oshmasligi, format to‘g‘ri tanlangani va internet tezligi
              yetarliligini tekshiring.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            4. Texnik yordam
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>Muammo yuzaga kelsa, texnik yordamga murojaat qiling:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Telefon: +998 95 195 99 29</li>
              <li>Email: support@urmon.uz</li>
              <li>Telegram: @urmontexnoserviss</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5" className="shadow py-2 rounded-lg px-5">
          <AccordionTrigger className="text-2xl font-medium text-green-600">
            5. Video qo‘llanmalar
          </AccordionTrigger>
          <AccordionContent className="text-lg text-gray-700 pl-2">
            <p>Hisobot qanday yuboriladi</p>
            <p>Elektron imzo bilan ishlash</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default SupportInformation;
