/** Buyurtma tafsiloti (TZ §7.1): bosqich tasmasi, ma'lumotlar, xarita, qatorlar, hujjatlar, jurnal, amallar. */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import type { Polygon } from "geojson";
import type { RootState } from "@/app/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import YashilLayout from "../YashilLayout";
import PointMap from "./PointMap";
import SignSubmitDialog from "./SignSubmitDialog";
import DocumentPreview from "./DocumentPreview";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { OrderDetail, ReturnReason } from "@/features/yashil/types";
import {
  openDocumentHtml,
  useAcceptYashilOrderMutation,
  useForwardYashilOrderMutation,
  useGetYashilDocumentVersionQuery,
  useGetYashilOrderQuery,
  useReturnYashilOrderMutation,
  useReviewYashilOrderMutation,
} from "@/services/yashilApi";
import { DeadlineText, JourneyStrip, StateBadge, apiErrorText, fmtBytes, fmtDate, fmtDateTime } from "./orderUi";

const REASONS: ReturnReason[] = ["address", "lines", "supplier", "documents", "norms", "other"];
const FIELD_OPTIONS = ["title", "address", "lat", "area_ha", "lines", "attachments", "supplier_org", "extra_info"];
const ACTION_KEY: Record<string, YashilKey> = {
  submit: "action_submit", review: "action_review", forward: "action_forward", return: "action_return", accept: "action_accept", edit: "action_edit",
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex gap-2 text-sm"><dt className="ym-muted min-w-[150px] shrink-0">{k}</dt><dd className="font-medium break-words">{v}</dd></div>;
}

function OrderDetailPage() {
  const { t, script } = useYashilT();
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);
  const { data: o, isLoading, error } = useGetYashilOrderQuery(id);
  const [review] = useReviewYashilOrderMutation();
  const [forward] = useForwardYashilOrderMutation();
  const [ret, { isLoading: returning }] = useReturnYashilOrderMutation();
  const [accept, { isLoading: accepting }] = useAcceptYashilOrderMutation();
  const [dialog, setDialog] = useState<"return" | "accept" | "sign" | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [reason, setReason] = useState<ReturnReason>("address");
  const [comment, setComment] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [executor, setExecutor] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { data: docVersion } = useGetYashilDocumentVersionQuery(docId ?? skipToken);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      setDialog(null);
    } catch (e) {
      toast.error(apiErrorText(e, t("error_generic")));
    }
  };

  const onAction = (action: string, order: OrderDetail) => {
    switch (action) {
      case "edit": navigate(YASHIL_ROUTES.orderEdit(order.id)); break;
      case "submit": setDialog("sign"); break;
      case "review": void run(() => review({ id: order.id, version_no: order.version_no }).unwrap(), t("action_ok")); break;
      case "forward": void run(() => forward({ id: order.id, version_no: order.version_no }).unwrap(), t("action_ok")); break;
      case "return": setComment(""); setFields([]); setDialog("return"); break;
      case "accept": setExecutor(""); setConfirmed(false); setDialog("accept"); break;
    }
  };

  if (isLoading) return <YashilLayout title={t("order_detail")}><div className="ym-card ym-muted">{t("loading")}</div></YashilLayout>;
  if (error || !o) return <YashilLayout title={t("order_detail")}><div className="ym-card">{apiErrorText(error, t("error_generic"))}</div></YashilLayout>;

  const supplierLabel = o.supplier.supplier_type === "forest" ? t("supplier_forest") : t("supplier_dm");
  const stage = o.deadline;

  return (
    <YashilLayout
      title={o.display_number}
      actions={<Link to={YASHIL_ROUTES.orders} className="ym-btn">← {t("orders_title")}</Link>}
    >
      <JourneyStrip state={o.state} />

      {o.last_return && (o.state === "returned") && (
        <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>
          <b>{o.last_return.by === "union" ? t("returned_by_union") : t("returned_by_supplier")}</b> ({t(`reason_${o.last_return.reason_code}` as YashilKey)}, {fmtDateTime(o.last_return.at)}): {o.last_return.comment}
        </div>
      )}

      <section className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">{o.title || o.display_number}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StateBadge state={o.state} />
              <span className="ym-badge">v{o.version_no}</span>
              <DeadlineText info={stage} state={o.state} />
              {stage.stage === "review" && stage.review_used != null && <span className="ym-muted text-xs">{stage.review_used} / 3 {t("used_days")}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.actions.map((a) => (
              <button key={a} type="button" className={`ym-btn ${["submit", "forward", "accept"].includes(a) ? "ym-btn--primary" : ""}`} onClick={() => onAction(a, o)}>
                {t(ACTION_KEY[a])}
              </button>
            ))}
          </div>
        </div>
        <dl className="grid md:grid-cols-2 gap-x-6 gap-y-1.5">
          <Row k={t("col_mahalla")} v={`${o.mahalla.name} (${o.mahalla.district}, ${o.mahalla.region})`} />
          <Row k={t("col_supplier")} v={`${o.supplier.name} — ${supplierLabel}`} />
          <Row k={t("union_unit")} v={o.union_unit?.name ?? "—"} />
          <Row k={t("object_type")} v={o.object_type ? pickName(o.object_type, script) + (o.object_note ? ` (${o.object_note})` : "") : "—"} />
          <Row k={t("season")} v={o.season?.label_cyr ?? "—"} />
          <Row k={t("address")} v={o.address || "—"} />
          <Row k={t("point")} v={o.lat ? `${o.lat}, ${o.lon}` : "—"} />
          <Row k={t("area_ha")} v={o.area_ha ?? "—"} />
          {o.area_calc_ha && <Row k={t("area_calc")} v={`${o.area_calc_ha}${o.area_note ? ` · ${o.area_note}` : ""}`} />}
          {o.water_source && <Row k={t("water_source")} v={o.water_source} />}
          {o.contact_person && <Row k={t("contact_person")} v={o.contact_person} />}
          {o.base_seedlings != null && <Row k={t("base_seedlings")} v={o.base_seedlings} />}
          {o.problem_note && <Row k={t("problem_note")} v={o.problem_note} />}
          {o.extra_info && <Row k={t("extra_info")} v={o.extra_info} />}
          {o.executor_name && <Row k={t("executor")} v={o.executor_name} />}
          {o.accepted_at && <Row k={t("accepted_at")} v={fmtDateTime(o.accepted_at)} />}
          {o.delivery_due && <Row k={t("delivery_due")} v={fmtDate(o.delivery_due)} />}
        </dl>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("point")}</h3>
          <PointMap lat={o.lat ? Number(o.lat) : null} lon={o.lon ? Number(o.lon) : null} polygon={(o.polygon as Polygon | null) ?? null} confirmed readOnly />
        </section>
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("lines_title")}</h3>
          <table className="ym-table">
            <thead><tr><th>#</th><th>{t("col_name")}</th><th>{t("col_qty")}</th><th>{t("col_unit")}</th></tr></thead>
            <tbody>
              {o.lines.map((l, i) => (
                <tr key={l.id}><td>{i + 1}</td><td>{pickName(l.catalog_item, script)}{Object.values(l.catalog_item.attributes || {}).length ? <div className="ym-muted text-xs">{Object.values(l.catalog_item.attributes).join(" · ")}</div> : null}</td><td>{l.qty}</td><td>{l.unit_cyr}</td></tr>
              ))}
            </tbody>
          </table>
          {o.attachments.length > 0 && (
            <>
              <h4 className="font-semibold mt-4 mb-1">{t("attachments_title")}</h4>
              <ul className="text-sm space-y-1">
                {o.attachments.map((a) => <li key={a.id}><a href={a.url ?? "#"} target="_blank" rel="noreferrer" className="text-[var(--ym-green-dark)] underline">{a.original_name}</a> <span className="ym-muted text-xs">{fmtBytes(a.size)} · v{a.version_no}</span></li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("documents_title")}</h3>
          {o.documents.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : o.documents.map((d) => (
            <div key={d.id} className="space-y-1">
              <div className="font-medium">{d.kind === "order_form" ? t("doc_order_form") : t("doc_act")} {d.number}</div>
              <ul className="text-sm space-y-1">
                {d.versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <span>v{v.version_no}</span>
                    <span className={`ym-badge ${v.status === "signed" ? "" : v.status === "unsigned" ? "ym-badge--amber" : "ym-badge--blue"}`}>{t(`doc_status_${v.status}` as YashilKey)}</span>
                    {v.signatures.map((s) => <span key={s.id} className="ym-muted text-xs">{s.signer_cn} · {fmtDateTime(s.signed_at)}</span>)}
                    <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => setDocId(v.id)}>{t("view")}</button>
                    <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => openDocumentHtml(v.id, token).catch(() => toast.error(t("error_generic")))}>{t("print")}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("journal_title")}</h3>
          <ol className="text-sm space-y-2">
            {o.events.map((e) => (
              <li key={e.id} className="border-l-2 border-[var(--ym-border)] pl-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-medium">{t(ACTION_KEY[e.action] ?? "action_edit")}</span>
                  {e.to_state && e.to_state !== e.from_state && <StateBadge state={e.to_state as OrderDetail["state"]} />}
                  <span className="ym-muted text-xs">{fmtDateTime(e.created_at)} · {e.actor_label || e.actor_name}</span>
                </div>
                {e.comment && <div className="text-xs mt-0.5">{e.reason_code ? `${t(`reason_${e.reason_code}` as YashilKey)}: ` : ""}{e.comment}</div>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {dialog === "sign" && <SignSubmitDialog orderId={o.id} versionNo={o.version_no} onClose={() => setDialog(null)} onDone={() => setDialog(null)} />}

      <Dialog open={dialog === "return"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("return_title")}</DialogTitle><DialogDescription>{o.display_number}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("return_reason")}
            <select className="ym-select w-full mt-1" value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
              {REASONS.map((r) => <option key={r} value={r}>{t(`reason_${r}` as YashilKey)}</option>)}
            </select>
          </label>
          <label className="text-sm block">{t("return_comment")}<textarea className="ym-select w-full mt-1 min-h-[90px]" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <div className="text-sm">{t("return_fields")}
            <div className="flex flex-wrap gap-2 mt-1">
              {FIELD_OPTIONS.map((f) => (
                <button key={f} type="button" className={`ym-btn !min-h-7 !px-2 text-xs ${fields.includes(f) ? "ym-btn--active" : ""}`} onClick={() => setFields((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]))}>{f}</button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={returning || !comment.trim()} onClick={() => run(() => ret({ id: o.id, version_no: o.version_no, reason_code: reason, comment, fields }).unwrap(), t("action_ok"))}>{t("action_return")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "accept"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("accept_title")}</DialogTitle><DialogDescription>{t("accept_hint")}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("executor")} *<input className="ym-select w-full mt-1" value={executor} onChange={(e) => setExecutor(e.target.value)} /></label>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> {t("accept_confirm")}</label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={accepting || !executor.trim() || !confirmed} onClick={() => run(() => accept({ id: o.id, version_no: o.version_no, executor_name: executor }).unwrap(), t("action_ok"))}>{t("confirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docId} onOpenChange={(v) => !v && setDocId(null)}>
        <DialogContent className="yashil-root sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("doc_order_form")}</DialogTitle><DialogDescription>{docVersion ? `v${docVersion.version_no} · ${t(`doc_status_${docVersion.status}` as YashilKey)}` : t("loading")}</DialogDescription></DialogHeader>
          {docVersion && <div className="bg-white text-black rounded-xl p-3 border border-[var(--ym-border)]"><DocumentPreview content={docVersion.content} qrToken={docVersion.qr_token} signatures={docVersion.signatures} unsigned={docVersion.status !== "signed"} /></div>}
          <DialogFooter>
            {docVersion && <button type="button" className="ym-btn" onClick={() => openDocumentHtml(docVersion.id, token).catch(() => toast.error(t("error_generic")))}>{t("print")}</button>}
            <button type="button" className="ym-btn ym-btn--primary" onClick={() => setDocId(null)}>{t("back")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </YashilLayout>
  );
}

export default OrderDetailPage;
