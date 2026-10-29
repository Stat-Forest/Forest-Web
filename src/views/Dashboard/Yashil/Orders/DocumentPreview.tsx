/** Hujjat ko'rinishi (TZ §11.1, §12.1) — backend `content` dan brauzerda; chop etish/PDF server tomonida. */
import QRCode from "react-qr-code";
import type { ActContent, CancellationContent, DocumentContent, OrderFormContent, SignatureOut } from "@/features/yashil/types";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { fmtDateTime } from "./orderUi";

interface Props {
  content: DocumentContent;
  qrToken: string;
  signatures?: SignatureOut[];
  unsigned?: boolean;
}

const SIGN_ROLE_CYR: Record<string, string> = { mahalla: "Маҳалла", supplier: "Етказиб берувчи" };

function SignLine({ sig, label }: { sig: SignatureOut | undefined; label: string }) {
  return (
    <div>
      {label}: {sig ? <>{sig.signer_cn} · {fmtDateTime(sig.signed_at)} · E-IMZO ({sig.mode}) · <span className="ym-badge">Ҳақиқий</span></> : <span className="ym-badge ym-badge--amber">Имзо кутилмоқда</span>}
    </div>
  );
}

function SignBlock({ qrToken, verifyUrl, roles, signatures, unsigned }: { qrToken: string; verifyUrl: string; roles: string[]; signatures: SignatureOut[]; unsigned?: boolean }) {
  const valid = unsigned ? [] : signatures.filter((s) => s.is_valid);
  return (
    <div className="mt-3 flex flex-wrap items-start gap-4 border rounded-lg p-3">
      <div className="flex-1 min-w-[200px]">
        <b>Электрон тасдиқ</b>
        {roles.map((r) => <SignLine key={r} label={SIGN_ROLE_CYR[r] ?? r} sig={valid.find((s) => s.role === r)} />)}
        <div className="text-xs text-slate-500 mt-1">Ҳужжат IDси: {qrToken}<br />Текшириш: {verifyUrl}</div>
      </div>
      <div className="bg-white p-1 rounded"><QRCode value={verifyUrl} size={84} /></div>
    </div>
  );
}

function OrderFormView({ c, qrToken, verifyUrl, signatures, unsigned }: { c: OrderFormContent; qrToken: string; verifyUrl: string; signatures: SignatureOut[]; unsigned?: boolean }) {
  return (
    <>
      <p className="text-right">{c.supplier_name}га<br />{c.region}, {c.district}даги<br />{c.mahalla_name} номидан</p>
      <h2 className="text-xl font-semibold mt-3 mb-1">Буюртманома</h2>
      <p>Рақами: <b>{c.number ?? "—"}</b> &nbsp; Сана: <b>{c.date ?? "—"}</b> &nbsp; Версия: <b>{c.version_no}</b></p>
      <p className="mt-2">
        Ўзбекистон Республикаси Президентининг 2026 йил 23 сентябрдаги ПФ-206-сон Фармонига асосан {c.full_address} манзилида, {c.point} жойлашув
        нуқтасидаги {c.area_ha} гектар ҳудудда «Яшил маҳалла» ташкил этиш учун қуйидаги {c.subject_phrase} бўйича буюртма берилмоқда.
      </p>
      <p>Объект номи: {c.title}.{c.object_type ? ` Объект тури: ${c.object_type}.` : ""}{c.season ? ` Мавсум: ${c.season}.` : ""}<br />Жойлашув нуқтаси: {c.point} (WGS84).<br />Етказиб берувчи: {c.supplier_name}.</p>
      <table className="w-full border-collapse my-2 text-xs">
        <thead><tr className="bg-[#e8eef2]"><th className="border p-1 w-10">Т/р</th><th className="border p-1 text-left">Маҳсулот ёки хизмат номи ва хусусияти</th><th className="border p-1 w-24">Миқдор</th><th className="border p-1 w-28">Ўлчов бирлиги</th></tr></thead>
        <tbody>{c.lines.map((l) => <tr key={l.n}><td className="border p-1 text-center">{l.n}</td><td className="border p-1">{l.name}{l.attrs ? <span className="text-slate-500"> ({l.attrs})</span> : null}</td><td className="border p-1 text-right">{l.qty}</td><td className="border p-1">{l.unit}</td></tr>)}</tbody>
      </table>
      <p>Қўшимча маълумот: {c.extra_info || "—"}.<br />Иловалар: {c.attachments_text}.</p>
      <p className="mt-2"><b>Буюртма берувчи</b><br />Маҳалла: {c.mahalla_name}.<br />Ваколатли шахс: {c.signer.full_name || "—"}.<br />Лавозими ва ваколат асоси: {c.signer.position || "—"}{c.signer.authority ? `, ${c.signer.authority}` : ""}.<br />Алоқа рақами: {c.signer.phone || "—"}.</p>
      <SignBlock qrToken={qrToken} verifyUrl={verifyUrl} roles={["mahalla"]} signatures={signatures} unsigned={unsigned} />
    </>
  );
}

function ActView({ c, qrToken, verifyUrl, signatures, unsigned }: { c: ActContent; qrToken: string; verifyUrl: string; signatures: SignatureOut[]; unsigned?: boolean }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-center mt-1 mb-1">ТОПШИРИШ-ҚАБУЛ ҚИЛИШ ДАЛОЛАТНОМАСИ</h2>
      <p className="text-center">Рақами: <b>{c.number}</b> &nbsp; Сана: <b>{c.date ?? "—"}</b> &nbsp; Версия: <b>{c.version_no}</b>{c.is_partial && <> &nbsp; <span className="ym-badge">Қисман</span></>}</p>
      <p>Жой: {c.place}</p>
      <p className="mt-2">
        Ўзбекистон Республикаси Президентининг 2026 йил 23 сентябрдаги ПФ-206-сон Фармони ва {c.order_date}даги {c.order_number} сонли буюртманомага асосан {c.supplier_name} томонидан {c.mahalla_name}га {c.object_text} учун қуйидаги маҳсулотлар етказиб берилди ва (ёки) хизматлар кўрсатилди.
      </p>
      <table className="w-full border-collapse my-2 text-xs">
        <thead><tr className="bg-[#e8eef2]"><th className="border p-1 w-10">Т/р</th><th className="border p-1 text-left">Маҳсулот ёки хизмат номи</th><th className="border p-1 w-32">Ушбу акт бўйича миқдор</th><th className="border p-1 w-24">Бирлик</th></tr></thead>
        <tbody>{c.lines.map((l) => <tr key={l.n}><td className="border p-1 text-center">{l.n}</td><td className="border p-1">{l.name}{l.attrs ? <span className="text-slate-500"> ({l.attrs})</span> : null}</td><td className="border p-1 text-right">{l.qty}</td><td className="border p-1">{l.unit}</td></tr>)}</tbody>
      </table>
      <p>Ҳақиқий етказилган ёки хизмат кўрсатилган сана: {c.delivery_date}.<br />Қўшимча маълумот ва қайдлар: {c.note || "—"}.<br />Иловалар: {c.attachments_text}.</p>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div><b>Топширувчи</b><br />{c.deliverer.name}<br />{c.deliverer.full_name || "—"}{c.deliverer.position ? `, ${c.deliverer.position}` : ""}</div>
        <div><b>Қабул қилувчи</b><br />{c.receiver.name}<br />{c.receiver.full_name || "—"}{c.receiver.position ? `, ${c.receiver.position}` : ""}</div>
      </div>
      <p className="text-xs text-slate-500 mt-2">Етказиб берувчи юқоридаги миқдорларни топширганини электрон имзоси билан тасдиқлайди. Маҳалла ушбу ҳужжатни электрон имзолаш орқали айнан кўрсатилган маҳсулотлар ёки хизматларни қабул қилганини тасдиқлайди.</p>
      <SignBlock qrToken={qrToken} verifyUrl={verifyUrl} roles={["supplier", "mahalla"]} signatures={signatures} unsigned={unsigned} />
    </>
  );
}

function CancellationView({ c, qrToken, verifyUrl }: { c: CancellationContent; qrToken: string; verifyUrl: string }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-center mt-1 mb-1">БУЮРТМАНИ БЕКОР ҚИЛИШ ҲУЖЖАТИ</h2>
      <p className="text-center">Рақами: <b>{c.number}</b> &nbsp; Буюртма: <b>{c.order_number}</b> &nbsp; Сана: <b>{c.date}</b></p>
      <p>Маҳалла: {c.mahalla_name}.<br />Етказиб берувчи: {c.supplier_name}.<br />Сўровчи: {c.requested_by}.<br />Келишган: {c.agreed_by}.<br />Тасдиқлаган (уюшма): {c.approved_by}.</p>
      <p>Сабаб: {c.reason}</p>
      <table className="w-full border-collapse my-2 text-xs">
        <thead><tr className="bg-[#e8eef2]"><th className="border p-1 w-10">Т/р</th><th className="border p-1 text-left">Маҳсулот ёки хизмат</th><th className="border p-1">Буюртма</th><th className="border p-1">Қабул қилинган</th><th className="border p-1">Бекор қилинган</th><th className="border p-1">Бирлик</th></tr></thead>
        <tbody>{c.lines.map((l) => <tr key={l.n}><td className="border p-1 text-center">{l.n}</td><td className="border p-1">{l.name}</td><td className="border p-1 text-right">{l.ordered_qty}</td><td className="border p-1 text-right">{l.accepted_qty}</td><td className="border p-1 text-right">{l.cancelled_qty}</td><td className="border p-1">{l.unit}</td></tr>)}</tbody>
      </table>
      <p>Якуний ҳолат: <span className="ym-badge">{c.result_cyr}</span></p>
      <div className="mt-3 flex flex-wrap items-start gap-4 border rounded-lg p-3">
        <div className="flex-1 min-w-[200px] text-xs text-slate-500">Тизим ҳужжати — уч томонлама электрон келишув асосида, хэш билан муҳрланган.<br />Ҳужжат IDси: {qrToken}<br />Текшириш: {verifyUrl}</div>
        <div className="bg-white p-1 rounded"><QRCode value={verifyUrl} size={84} /></div>
      </div>
    </>
  );
}

function DocumentPreview({ content, qrToken, signatures = [], unsigned }: Props) {
  const verifyUrl = `${window.location.origin}${YASHIL_ROUTES.verify(qrToken)}`;
  const kind = (content as { doc_type?: string }).doc_type ?? "order_form";
  return (
    <div className="text-[13px] leading-relaxed" style={{ fontFamily: "Arial, sans-serif" }}>
      {kind === "act" ? (
        <ActView c={content as ActContent} qrToken={qrToken} verifyUrl={verifyUrl} signatures={signatures} unsigned={unsigned} />
      ) : kind === "cancellation" ? (
        <CancellationView c={content as CancellationContent} qrToken={qrToken} verifyUrl={verifyUrl} />
      ) : (
        <OrderFormView c={content as OrderFormContent} qrToken={qrToken} verifyUrl={verifyUrl} signatures={signatures} unsigned={unsigned} />
      )}
    </div>
  );
}

export default DocumentPreview;
