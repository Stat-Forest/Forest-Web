/**
 * Hujjat ko'rinishi (TZ §11.1, §12.1) — backend `content` dan brauzerda; chop etish/PDF server tomonida.
 * Matn hujjat tilida (`content.lang`, D-28): uz — lotin, ru — rus, yo'q — eski hujjat (kirill).
 * DOC matnlari backend shablon/PDF matnlari bilan bir xil (`services/lang_ru.DOC_RU`, lotin — transliteratsiya).
 */
import QRCode from "react-qr-code";
import type { ActContent, CancellationContent, DocumentContent, DocumentLang, OrderFormContent, SignatureOut } from "@/features/yashil/types";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { fmtDateTime } from "./orderUi";

interface Props {
  content: DocumentContent;
  qrToken: string;
  signatures?: SignatureOut[];
  unsigned?: boolean;
}

type Entry = readonly [cyr: string, lat: string, ru: string];

const DOC = {
  to: ["{0}га", "{0}ga", "Кому: {0}"],
  from_place: ["{0}, {1}даги", "{0}, {1}dagi", "{0}, {1}"],
  on_behalf: ["{0} номидан", "{0} nomidan", "от имени {0}"],
  order_form: ["Буюртманома", "Buyurtmanoma", "Заявка"],
  number: ["Рақами", "Raqami", "Номер"],
  date: ["Сана", "Sana", "Дата"],
  version: ["Версия", "Versiya", "Версия"],
  order_basis: ["Ўзбекистон Республикаси Президентининг 2026 йил 23 сентябрдаги ПФ-206-сон Фармонига асосан {0} манзилида, {1} жойлашув нуқтасидаги {2} гектар ҳудудда «Яшил маҳалла» ташкил этиш учун қуйидаги {3} бўйича буюртма берилмоқда.", "O'zbekiston Respublikasi Prezidentining 2026 yil 23 sentyabrdagi PF-206-son Farmoniga asosan {0} manzilida, {1} joylashuv nuqtasidagi {2} gektar hududda «Yashil mahalla» tashkil etish uchun quyidagi {3} bo'yicha buyurtma berilmoqda.", "На основании Указа Президента Республики Узбекистан от 23 сентября 2026 года № УП-206 подаётся заявка на {3} для организации «Зелёной махалли» на территории площадью {2} га по адресу: {0}, точка расположения {1}."],
  object_name: ["Объект номи: {0}.", "Obyekt nomi: {0}.", "Наименование объекта: {0}."],
  object_type: ["Объект тури: {0}.", "Obyekt turi: {0}.", "Тип объекта: {0}."],
  season: ["Мавсум: {0}.", "Mavsum: {0}.", "Сезон: {0}."],
  point: ["Жойлашув нуқтаси: {0} (WGS84).", "Joylashuv nuqtasi: {0} (WGS84).", "Точка расположения: {0} (WGS84)."],
  supplier_line: ["Етказиб берувчи: {0}.", "Yetkazib beruvchi: {0}.", "Поставщик: {0}."],
  col_n: ["Т/р", "T/r", "№"],
  col_item_attrs: ["Маҳсулот ёки хизмат номи ва хусусияти", "Mahsulot yoki xizmat nomi va xususiyati", "Наименование и характеристика продукции или услуги"],
  col_qty: ["Миқдор", "Miqdor", "Количество"],
  col_unit_full: ["Ўлчов бирлиги", "O'lchov birligi", "Единица измерения"],
  extra: ["Қўшимча маълумот: {0}.", "Qo'shimcha ma'lumot: {0}.", "Дополнительная информация: {0}."],
  attachments: ["Иловалар: {0}.", "Ilovalar: {0}.", "Приложения: {0}."],
  customer: ["Буюртма берувчи", "Buyurtma beruvchi", "Заказчик"],
  mahalla_line: ["Маҳалла: {0}.", "Mahalla: {0}.", "Махалля: {0}."],
  signer: ["Ваколатли шахс: {0}.", "Vakolatli shaxs: {0}.", "Уполномоченное лицо: {0}."],
  position: ["Лавозими ва ваколат асоси: {0}.", "Lavozimi va vakolat asosi: {0}.", "Должность и основание полномочий: {0}."],
  phone: ["Алоқа рақами: {0}.", "Aloqa raqami: {0}.", "Контактный телефон: {0}."],
  e_confirm: ["Электрон тасдиқ", "Elektron tasdiq", "Электронное подтверждение"],
  valid: ["Ҳақиқий", "Haqiqiy", "Действительна"],
  waiting: ["Имзо кутилмоқда", "Imzo kutilmoqda", "Ожидается подпись"],
  doc_id: ["Ҳужжат IDси", "Hujjat IDsi", "ID документа"],
  verify: ["Текшириш", "Tekshirish", "Проверка"],
  role_mahalla: ["Маҳалла", "Mahalla", "Махалля"],
  role_supplier: ["Етказиб берувчи", "Yetkazib beruvchi", "Поставщик"],
  act_title: ["ТОПШИРИШ-ҚАБУЛ ҚИЛИШ ДАЛОЛАТНОМАСИ", "TOPSHIRISH-QABUL QILISH DALOLATNOMASI", "АКТ ПРИЁМА-ПЕРЕДАЧИ"],
  partial: ["Қисман", "Qisman", "Частично"],
  place: ["Жой: {0}", "Joy: {0}", "Место: {0}"],
  act_basis: ["Ўзбекистон Республикаси Президентининг 2026 йил 23 сентябрдаги ПФ-206-сон Фармони ва {0}даги {1} сонли буюртманомага асосан {2} томонидан {3}га {4} учун қуйидаги маҳсулотлар етказиб берилди ва (ёки) хизматлар кўрсатилди.", "O'zbekiston Respublikasi Prezidentining 2026 yil 23 sentyabrdagi PF-206-son Farmoni va {0}dagi {1} sonli buyurtmanomaga asosan {2} tomonidan {3}ga {4} uchun quyidagi mahsulotlar yetkazib berildi va (yoki) xizmatlar ko'rsatildi.", "На основании Указа Президента Республики Узбекистан от 23 сентября 2026 года № УП-206 и заявки № {1} от {0} поставщиком {2} махалле {3} для объекта: {4} поставлена следующая продукция и (или) оказаны следующие услуги."],
  col_item: ["Маҳсулот ёки хизмат номи", "Mahsulot yoki xizmat nomi", "Наименование продукции или услуги"],
  col_act_qty: ["Ушбу акт бўйича миқдор", "Ushbu akt bo'yicha miqdor", "Количество по данному акту"],
  col_unit: ["Бирлик", "Birlik", "Ед. изм."],
  delivered_on: ["Ҳақиқий етказилган ёки хизмат кўрсатилган сана: {0}.", "Haqiqiy yetkazilgan yoki xizmat ko'rsatilgan sana: {0}.", "Фактическая дата поставки или оказания услуги: {0}."],
  notes: ["Қўшимча маълумот ва қайдлар: {0}.", "Qo'shimcha ma'lumot va qaydlar: {0}.", "Дополнительная информация и примечания: {0}."],
  deliverer: ["Топширувчи", "Topshiruvchi", "Сдал"],
  receiver: ["Қабул қилувчи", "Qabul qiluvchi", "Принял"],
  act_confirm: ["Етказиб берувчи юқоридаги миқдорларни топширганини электрон имзоси билан тасдиқлайди. Маҳалла ушбу ҳужжатни электрон имзолаш орқали айнан кўрсатилган маҳсулотлар ёки хизматларни қабул қилганини тасдиқлайди.", "Yetkazib beruvchi yuqoridagi miqdorlarni topshirganini elektron imzosi bilan tasdiqlaydi. Mahalla ushbu hujjatni elektron imzolash orqali aynan ko'rsatilgan mahsulotlar yoki xizmatlarni qabul qilganini tasdiqlaydi.", "Поставщик своей электронной подписью подтверждает передачу указанных выше количеств. Махалля, подписывая настоящий документ электронной подписью, подтверждает приёмку именно указанной продукции или услуг."],
  cancel_title: ["БУЮРТМАНИ БЕКОР ҚИЛИШ ҲУЖЖАТИ", "BUYURTMANI BEKOR QILISH HUJJATI", "ДОКУМЕНТ ОБ ОТМЕНЕ ЗАЯВКИ"],
  order: ["Буюртма", "Buyurtma", "Заявка"],
  requested_by: ["Сўровчи: {0}.", "So'rovchi: {0}.", "Инициатор: {0}."],
  agreed_by: ["Келишган: {0}.", "Kelishgan: {0}.", "Согласовал: {0}."],
  approved_by: ["Тасдиқлаган (уюшма): {0}.", "Tasdiqlagan (uyushma): {0}.", "Утвердил (союз махаллей): {0}."],
  reason: ["Сабаб: {0}", "Sabab: {0}", "Причина: {0}"],
  col_item_short: ["Маҳсулот ёки хизмат", "Mahsulot yoki xizmat", "Продукция или услуга"],
  col_accepted: ["Қабул қилинган", "Qabul qilingan", "Принято"],
  col_cancelled: ["Бекор қилинган", "Bekor qilingan", "Отменено"],
  result: ["Якуний ҳолат", "Yakuniy holat", "Итоговый статус"],
  cancel_note: ["Бекор қилиш уч томонлама электрон келишув асосида тизим томонидан расмийлаштирилган; имзоланган буюртманома ва далолатномалар ўзгартирилмайди.", "Bekor qilish uch tomonlama elektron kelishuv asosida tizim tomonidan rasmiylashtirilgan; imzolangan buyurtmanoma va dalolatnomalar o'zgartirilmaydi.", "Отмена оформлена системой на основании трёхстороннего электронного согласования; подписанные заявки и акты не изменяются."],
} satisfies Record<string, Entry>;

type DocKey = keyof typeof DOC;
type Tr = (key: DocKey, ...values: (string | number | null | undefined)[]) => string;

const docT = (lang?: DocumentLang): Tr => {
  const i = lang === "ru" ? 2 : lang === "uz" ? 1 : 0;
  return (key, ...values) => (DOC[key] as Entry)[i].replace(/\{(\d+)\}/g, (_, n: string) => String(values[Number(n)] ?? ""));
};

const SIGN_ROLE: Record<string, DocKey> = { mahalla: "role_mahalla", supplier: "role_supplier" };

interface ViewProps {
  t: Tr;
  qrToken: string;
  verifyUrl: string;
  signatures: SignatureOut[];
  unsigned?: boolean;
}

function SignLine({ t, sig, label }: { t: Tr; sig: SignatureOut | undefined; label: string }) {
  return (
    <div>
      {label}: {sig ? <>{sig.signer_cn} · {fmtDateTime(sig.signed_at)} · E-IMZO ({sig.mode}) · <span className="ym-badge">{t("valid")}</span></> : <span className="ym-badge ym-badge--amber">{t("waiting")}</span>}
    </div>
  );
}

function SignBlock({ t, qrToken, verifyUrl, roles, signatures, unsigned }: ViewProps & { roles: string[] }) {
  const valid = unsigned ? [] : signatures.filter((s) => s.is_valid);
  return (
    <div className="mt-3 flex flex-wrap items-start gap-4 border rounded-lg p-3">
      <div className="flex-1 min-w-[200px]">
        <b>{t("e_confirm")}</b>
        {roles.map((r) => <SignLine key={r} t={t} label={SIGN_ROLE[r] ? t(SIGN_ROLE[r]) : r} sig={valid.find((s) => s.role === r)} />)}
        <div className="text-xs text-slate-500 mt-1">{t("doc_id")}: {qrToken}<br />{t("verify")}: {verifyUrl}</div>
      </div>
      <div className="bg-white p-1 rounded"><QRCode value={verifyUrl} size={84} /></div>
    </div>
  );
}

function OrderFormView({ c, ...v }: ViewProps & { c: OrderFormContent }) {
  const { t } = v;
  const position = (c.signer.position || "—") + (c.signer.authority ? `, ${c.signer.authority}` : "");
  return (
    <>
      <p className="text-right">{t("to", c.supplier_name)}<br />{t("from_place", c.region, c.district)}<br />{t("on_behalf", c.mahalla_name)}</p>
      <h2 className="text-xl font-semibold mt-3 mb-1">{t("order_form")}</h2>
      <p>{t("number")}: <b>{c.number ?? "—"}</b> &nbsp; {t("date")}: <b>{c.date ?? "—"}</b> &nbsp; {t("version")}: <b>{c.version_no}</b></p>
      <p className="mt-2">{t("order_basis", c.full_address, c.point, c.area_ha, c.subject_phrase)}</p>
      <p>
        {t("object_name", c.title)}{c.object_type ? ` ${t("object_type", c.object_type)}` : ""}{c.season ? ` ${t("season", c.season)}` : ""}
        <br />{t("point", c.point)}<br />{t("supplier_line", c.supplier_name)}
      </p>
      <table className="w-full border-collapse my-2 text-xs">
        <thead><tr className="bg-[#e8eef2]"><th className="border p-1 w-10">{t("col_n")}</th><th className="border p-1 text-left">{t("col_item_attrs")}</th><th className="border p-1 w-24">{t("col_qty")}</th><th className="border p-1 w-28">{t("col_unit_full")}</th></tr></thead>
        <tbody>{c.lines.map((l) => <tr key={l.n}><td className="border p-1 text-center">{l.n}</td><td className="border p-1">{l.name}{l.attrs ? <span className="text-slate-500"> ({l.attrs})</span> : null}</td><td className="border p-1 text-right">{l.qty}</td><td className="border p-1">{l.unit}</td></tr>)}</tbody>
      </table>
      <p>{t("extra", c.extra_info || "—")}<br />{t("attachments", c.attachments_text)}</p>
      <p className="mt-2"><b>{t("customer")}</b><br />{t("mahalla_line", c.mahalla_name)}<br />{t("signer", c.signer.full_name || "—")}<br />{t("position", position)}<br />{t("phone", c.signer.phone || "—")}</p>
      <SignBlock {...v} roles={["mahalla"]} />
    </>
  );
}

function ActView({ c, ...v }: ViewProps & { c: ActContent }) {
  const { t } = v;
  return (
    <>
      <h2 className="text-lg font-semibold text-center mt-1 mb-1">{t("act_title")}</h2>
      <p className="text-center">{t("number")}: <b>{c.number}</b> &nbsp; {t("date")}: <b>{c.date ?? "—"}</b> &nbsp; {t("version")}: <b>{c.version_no}</b>{c.is_partial && <> &nbsp; <span className="ym-badge">{t("partial")}</span></>}</p>
      <p>{t("place", c.place)}</p>
      <p className="mt-2">{t("act_basis", c.order_date, c.order_number, c.supplier_name, c.mahalla_name, c.object_text)}</p>
      <table className="w-full border-collapse my-2 text-xs">
        <thead><tr className="bg-[#e8eef2]"><th className="border p-1 w-10">{t("col_n")}</th><th className="border p-1 text-left">{t("col_item")}</th><th className="border p-1 w-32">{t("col_act_qty")}</th><th className="border p-1 w-24">{t("col_unit")}</th></tr></thead>
        <tbody>{c.lines.map((l) => <tr key={l.n}><td className="border p-1 text-center">{l.n}</td><td className="border p-1">{l.name}{l.attrs ? <span className="text-slate-500"> ({l.attrs})</span> : null}</td><td className="border p-1 text-right">{l.qty}</td><td className="border p-1">{l.unit}</td></tr>)}</tbody>
      </table>
      <p>{t("delivered_on", c.delivery_date)}<br />{t("notes", c.note || "—")}<br />{t("attachments", c.attachments_text)}</p>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div><b>{t("deliverer")}</b><br />{c.deliverer.name}<br />{c.deliverer.full_name || "—"}{c.deliverer.position ? `, ${c.deliverer.position}` : ""}</div>
        <div><b>{t("receiver")}</b><br />{c.receiver.name}<br />{c.receiver.full_name || "—"}{c.receiver.position ? `, ${c.receiver.position}` : ""}</div>
      </div>
      <p className="text-xs text-slate-500 mt-2">{t("act_confirm")}</p>
      <SignBlock {...v} roles={["supplier", "mahalla"]} />
    </>
  );
}

function CancellationView({ c, t, qrToken, verifyUrl }: ViewProps & { c: CancellationContent }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-center mt-1 mb-1">{t("cancel_title")}</h2>
      <p className="text-center">{t("number")}: <b>{c.number}</b> &nbsp; {t("order")}: <b>{c.order_number}</b> &nbsp; {t("date")}: <b>{c.date}</b></p>
      <p>{t("mahalla_line", c.mahalla_name)}<br />{t("supplier_line", c.supplier_name)}<br />{t("requested_by", c.requested_by)}<br />{t("agreed_by", c.agreed_by)}<br />{t("approved_by", c.approved_by)}</p>
      <p>{t("reason", c.reason)}</p>
      <table className="w-full border-collapse my-2 text-xs">
        <thead><tr className="bg-[#e8eef2]"><th className="border p-1 w-10">{t("col_n")}</th><th className="border p-1 text-left">{t("col_item_short")}</th><th className="border p-1">{t("order")}</th><th className="border p-1">{t("col_accepted")}</th><th className="border p-1">{t("col_cancelled")}</th><th className="border p-1">{t("col_unit")}</th></tr></thead>
        <tbody>{c.lines.map((l) => <tr key={l.n}><td className="border p-1 text-center">{l.n}</td><td className="border p-1">{l.name}</td><td className="border p-1 text-right">{l.ordered_qty}</td><td className="border p-1 text-right">{l.accepted_qty}</td><td className="border p-1 text-right">{l.cancelled_qty}</td><td className="border p-1">{l.unit}</td></tr>)}</tbody>
      </table>
      <p>{t("result")}: <span className="ym-badge">{c.result_label ?? c.result_cyr}</span></p>
      <div className="mt-3 flex flex-wrap items-start gap-4 border rounded-lg p-3">
        <div className="flex-1 min-w-[200px] text-xs text-slate-500">{t("cancel_note")}<br />{t("doc_id")}: {qrToken}<br />{t("verify")}: {verifyUrl}</div>
        <div className="bg-white p-1 rounded"><QRCode value={verifyUrl} size={84} /></div>
      </div>
    </>
  );
}

function DocumentPreview({ content, qrToken, signatures = [], unsigned }: Props) {
  const verifyUrl = `${window.location.origin}${YASHIL_ROUTES.verify(qrToken)}`;
  const kind = (content as { doc_type?: string }).doc_type ?? "order_form";
  const lang = (content as { lang?: DocumentLang }).lang;
  const view: ViewProps = { t: docT(lang), qrToken, verifyUrl, signatures, unsigned };
  return (
    <div className="text-[13px] leading-relaxed" style={{ fontFamily: "Arial, sans-serif" }} lang={lang ?? "uz"}>
      {kind === "act" ? (
        <ActView c={content as ActContent} {...view} />
      ) : kind === "cancellation" ? (
        <CancellationView c={content as CancellationContent} {...view} />
      ) : (
        <OrderFormView c={content as OrderFormContent} {...view} />
      )}
    </div>
  );
}

export default DocumentPreview;
