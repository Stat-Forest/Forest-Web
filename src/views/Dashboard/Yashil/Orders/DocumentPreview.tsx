/** Buyurtmanoma blankasi (TZ §11.1) — backend `content` dan brauzerda ko'rinish; chop etish server HTML'idan. */
import QRCode from "react-qr-code";
import type { OrderFormContent, SignatureOut } from "@/features/yashil/types";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { fmtDateTime } from "./orderUi";

interface Props {
  content: OrderFormContent;
  qrToken: string;
  signatures?: SignatureOut[];
  unsigned?: boolean;
}

function DocumentPreview({ content: c, qrToken, signatures = [], unsigned }: Props) {
  const verifyUrl = `${window.location.origin}${YASHIL_ROUTES.verify(qrToken)}`;
  const signed = !unsigned && signatures.some((s) => s.is_valid);
  return (
    <div className="text-[13px] leading-relaxed" style={{ fontFamily: "Arial, sans-serif" }}>
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
      <div className="mt-3 flex flex-wrap items-start gap-4 border rounded-lg p-3">
        <div className="flex-1 min-w-[200px]">
          <b>Электрон тасдиқ</b><br />
          {signed ? (
            signatures.filter((s) => s.is_valid).map((s) => (
              <div key={s.id}>Имзоловчи: {s.signer_cn} · {fmtDateTime(s.signed_at)} · E-IMZO ({s.mode}) · <span className="ym-badge">Ҳақиқий</span></div>
            ))
          ) : (
            <span className="ym-badge ym-badge--amber">Имзоланмаган</span>
          )}
          <div className="text-xs text-slate-500 mt-1">Ҳужжат IDси: {qrToken}<br />Текшириш: {verifyUrl}</div>
        </div>
        <div className="bg-white p-1 rounded"><QRCode value={verifyUrl} size={84} /></div>
      </div>
    </div>
  );
}

export default DocumentPreview;
