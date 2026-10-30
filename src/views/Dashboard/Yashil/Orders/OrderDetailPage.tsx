/** Buyurtma tafsiloti (TZ §7.1, §9, §10): bosqich tasmasi, ma'lumotlar, xarita, qatorlar (qabul/qolgan), ombor natijasi, aktlar, bekor qilish, hujjatlar, jurnal. */
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
import ActFormDialog from "../Acts/ActFormDialog";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { OrderAction, OrderDetail, ReturnReason } from "@/features/yashil/types";
import {
  openDocumentHtml,
  openDocumentPdf,
  useAcceptYashilOrderMutation,
  useCancelYashilOrderMutation,
  useDecideYashilCancelMutation,
  useForwardYashilOrderMutation,
  useGetYashilDocumentVersionQuery,
  useGetYashilOrderQuery,
  useReturnYashilOrderMutation,
  useReviewYashilOrderMutation,
} from "@/services/yashilApi";
import { ActStatusBadge, CancelStatusBadge, DeadlineText, JourneyStrip, StateBadge, apiErrorText, fmtBytes, fmtDate, fmtDateTime } from "./orderUi";

const REASONS: ReturnReason[] = ["address", "lines", "supplier", "documents", "norms", "other"];
const FIELD_OPTIONS = ["title", "address", "lat", "area_ha", "lines", "attachments", "supplier_org", "extra_info"];
// Qaytarishda belgilanadigan maydonlar — foydalanuvchi ko'radigan nomlar
const FIELD_LABEL: Record<string, YashilKey> = {
  title: "title_label", address: "address", lat: "point", area_ha: "area_ha", lines: "lines_title",
  attachments: "attachments_title", supplier_org: "col_supplier", extra_info: "extra_info",
};
const ACTION_KEY: Record<OrderAction, YashilKey> = {
  submit: "action_submit", review: "action_review", forward: "action_forward", return: "action_return", accept: "action_accept", edit: "action_edit",
  create_act: "action_create_act", cancel: "action_cancel", cancel_request: "action_cancel_request", cancel_agree: "action_cancel_agree",
  cancel_reject: "action_cancel_reject", cancel_approve: "action_cancel_approve",
};
const PRIMARY: OrderAction[] = ["submit", "forward", "accept", "create_act", "cancel_agree", "cancel_approve"];
const DOC_KEY: Record<string, YashilKey> = { order_form: "doc_order_form", act: "doc_act", cancellation: "doc_cancellation" };
const DELIVERY_STATES = new Set(["execution", "partial", "closed", "cancelled"]);

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex gap-2 text-sm"><dt className="ym-muted min-w-[150px] shrink-0">{k}</dt><dd className="font-medium break-words">{v}</dd></div>;
}

type DialogKind = "return" | "accept" | "sign" | "act" | "cancel" | "cancel_request" | "cancel_reject" | "cancel_confirm" | null;

function OrderDetailPage() {
  const { t, c } = useYashilT();
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);
  const { data: o, isLoading, error } = useGetYashilOrderQuery(id);
  const { me } = useYashilAccess();
  const [review] = useReviewYashilOrderMutation();
  const [forward] = useForwardYashilOrderMutation();
  const [ret, { isLoading: returning }] = useReturnYashilOrderMutation();
  const [accept, { isLoading: accepting }] = useAcceptYashilOrderMutation();
  const [cancelOrder, { isLoading: cancelling }] = useCancelYashilOrderMutation();
  const [decideCancel, { isLoading: deciding }] = useDecideYashilCancelMutation();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pendingDecision, setPendingDecision] = useState<"agree" | "approve" | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [reason, setReason] = useState<ReturnReason>("address");
  const [comment, setComment] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [executor, setExecutor] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [cancelFull, setCancelFull] = useState(true);
  const [cancelLines, setCancelLines] = useState<Record<string, string>>({});
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

  const onAction = (action: OrderAction, order: OrderDetail) => {
    switch (action) {
      case "edit": navigate(YASHIL_ROUTES.orderEdit(order.id)); break;
      case "submit": setDialog("sign"); break;
      case "review": void run(() => review({ id: order.id, version_no: order.version_no }).unwrap(), t("action_ok")); break;
      case "forward": void run(() => forward({ id: order.id, version_no: order.version_no }).unwrap(), t("action_ok")); break;
      case "return": setComment(""); setFields([]); setDialog("return"); break;
      case "accept": setExecutor(""); setConfirmed(false); setDialog("accept"); break;
      case "create_act": setDialog("act"); break;
      case "cancel": setComment(""); setDialog("cancel"); break;
      case "cancel_request": setComment(""); setCancelFull(true); setCancelLines({}); setDialog("cancel_request"); break;
      case "cancel_agree": setPendingDecision("agree"); setDialog("cancel_confirm"); break;
      case "cancel_approve": setPendingDecision("approve"); setDialog("cancel_confirm"); break;
      case "cancel_reject": setComment(""); setDialog("cancel_reject"); break;
    }
  };

  if (isLoading) return <YashilLayout title={t("order_detail")}><div className="ym-card ym-muted">{t("loading")}</div></YashilLayout>;
  if (error || !o) return <YashilLayout title={t("order_detail")}><div className="ym-card">{apiErrorText(error, t("error_generic"))}</div></YashilLayout>;

  const supplierLabel = o.supplier.supplier_type === "forest" ? t("supplier_forest") : t("supplier_dm");
  const stage = o.deadline;
  const actPending = o.acts.some((a) => a.status === "draft" || a.status === "mahalla_review" || a.status === "returned");
  const showAccepted = DELIVERY_STATES.has(o.state);
  const cr = o.cancel_request;
  const acc = o.acceptance;

  return (
    <YashilLayout
      title={o.display_number}
      actions={<Link to={YASHIL_ROUTES.orders} className="ym-btn">← {t("orders_title")}</Link>}
    >
      <JourneyStrip state={o.state} actPending={actPending} />

      {o.last_return && (o.state === "returned") && (
        <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>
          <b>{o.last_return.by === "union" ? t("returned_by_union") : t("returned_by_supplier")}</b> ({t(`reason_${o.last_return.reason_code}` as YashilKey)}, {fmtDateTime(o.last_return.at)}): {o.last_return.comment}
          {o.last_return.fields.length > 0 && (
            <div className="mt-1 text-sm">{t("return_fields")}: {o.last_return.fields.map((f) => (FIELD_LABEL[f] ? t(FIELD_LABEL[f]) : f)).join(", ")}</div>
          )}
        </div>
      )}

      {cr && (cr.status === "requested" || cr.status === "agreed") && (
        <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>
          <div className="flex flex-wrap items-center gap-2">
            <b>{t("cancel_card_title")}</b> <CancelStatusBadge status={cr.status} />
            <span className="ym-muted text-xs">{t("requested_by")}: {cr.requested_by_party === "mahalla" ? t("member_type_mahalla") : t("member_type_supplier")} · {fmtDateTime(cr.created_at)}</span>
          </div>
          <div className="text-sm mt-1">{cr.reason}</div>
          <div className="text-xs ym-muted mt-1">{t("cancel_lines")}: {cr.is_full ? t("all_remaining") : cr.lines.map((l) => `${l.name_cyr} — ${l.qty}`).join("; ")}</div>
          {cr.agreed_by_name && <div className="text-xs ym-muted">{t("agreed_by")}: {cr.agreed_by_name}</div>}
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
              {stage.stage === "review" && stage.review_used != null && <span className="ym-muted text-xs">{stage.review_used} / {me?.rules.review_workdays ?? 3} {t("used_days")}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.actions.map((a) => (
              <button key={a} type="button" className={`ym-btn ${PRIMARY.includes(a) ? "ym-btn--primary" : ""}`} onClick={() => onAction(a, o)}>
                {t(ACTION_KEY[a])}
              </button>
            ))}
          </div>
        </div>
        <dl className="grid md:grid-cols-2 gap-x-6 gap-y-1.5">
          <Row k={t("col_mahalla")} v={`${o.mahalla.name} (${o.mahalla.district}, ${o.mahalla.region})`} />
          <Row k={t("col_supplier")} v={`${o.supplier.name} — ${supplierLabel}`} />
          <Row k={t("union_unit")} v={o.union_unit?.name ?? "—"} />
          <Row k={t("object_type")} v={o.object_type ? pickName(o.object_type) + (o.object_note ? ` (${o.object_note})` : "") : "—"} />
          <Row k={t("season")} v={o.season ? c(o.season.label_cyr) : "—"} />
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
          {o.closed_at && <Row k={t("closed_at")} v={fmtDateTime(o.closed_at)} />}
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
            <thead><tr><th>#</th><th>{t("col_name")}</th><th>{t("col_qty")}</th>{showAccepted && <><th>{t("accepted_qty")}</th><th>{t("remaining_qty")}</th></>}<th>{t("col_unit")}</th></tr></thead>
            <tbody>
              {o.lines.map((l, i) => (
                <tr key={l.id}>
                  <td>{i + 1}</td>
                  <td>{pickName(l.catalog_item)}{Object.values(l.catalog_item.attributes || {}).length ? <div className="ym-muted text-xs">{Object.values(l.catalog_item.attributes).join(" · ")}</div> : null}</td>
                  <td>{l.qty}</td>
                  {showAccepted && <><td className="font-semibold">{l.accepted_qty ?? "—"}</td><td className={Number(l.remaining_qty) > 0 ? "" : "ym-muted"}>{l.remaining_qty ?? "—"}</td></>}
                  <td>{c(l.unit_cyr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {acc && (
            <div className="mt-3">
              <h4 className="font-semibold mb-1">{t("stock_result_title")}</h4>
              <div className="ym-muted text-xs mb-1">{acc.warehouse.name} · {fmtDate(acc.accepted_on)} · {acc.accepted_by}</div>
              <table className="ym-table">
                <thead><tr><th>{t("col_code")}</th><th>{t("col_qty")}</th><th>{t("col_balance")}</th><th>{t("col_shortage")}</th></tr></thead>
                <tbody>
                  {acc.result.lines.map((l) => (
                    <tr key={l.order_line_id}><td>{l.code}</td><td>{l.qty}</td><td>{l.balance_before} → <b className={Number(l.balance_after) < 0 ? "text-[var(--ym-red)]" : ""}>{l.balance_after}</b>{l.period ? <span className="ym-muted text-xs"> ({l.period})</span> : null}</td><td>{l.shortage !== "0" ? <span className="ym-badge ym-badge--red">{l.shortage}</span> : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {showAccepted && (
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("acts_section")}</h3>
          {o.acts.length === 0 ? <p className="ym-muted text-sm">{t("no_acts")}</p> : (
            <table className="ym-table">
              <thead><tr><th>{t("col_number")}</th><th>{t("delivery_date")}</th><th>{t("col_state")}</th><th>{t("version")}</th><th></th></tr></thead>
              <tbody>
                {o.acts.map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(YASHIL_ROUTES.act(a.id))}>
                    <td className="font-semibold">{a.number}{a.is_partial && <span className="ym-badge ym-badge--blue ml-2">{t("partial_badge")}</span>}</td>
                    <td>{fmtDate(a.delivery_date)}</td>
                    <td><ActStatusBadge status={a.status} /></td>
                    <td>v{a.version_no}</td>
                    <td><Link to={YASHIL_ROUTES.act(a.id)} className="ym-btn !min-h-7 !px-2 text-xs" onClick={(e) => e.stopPropagation()}>{t("view")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("documents_title")}</h3>
          {o.documents.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : o.documents.map((d) => (
            <div key={d.id} className="space-y-1 mb-2">
              <div className="font-medium">{t(DOC_KEY[d.kind] ?? "doc_order_form")} {d.number}</div>
              <ul className="text-sm space-y-1">
                {d.versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <span>v{v.version_no}</span>
                    <span className={`ym-badge ${v.status === "signed" ? "" : v.status === "unsigned" || v.status === "partly_signed" ? "ym-badge--amber" : "ym-badge--blue"}`}>{t(`doc_status_${v.status}` as YashilKey)}</span>
                    {v.signatures.map((s) => <span key={s.id} className="ym-muted text-xs">{s.signer_cn} · {fmtDateTime(s.signed_at)}</span>)}
                    <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => setDocId(v.id)}>{t("view")}</button>
                    <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => openDocumentHtml(v.id, token).catch(() => toast.error(t("error_generic")))}>{t("print")}</button>
                    <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => openDocumentPdf(v.id, token).catch(() => toast.error(t("error_generic")))}>{t("pdf")}</button>
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
                  <span className="font-medium">{t(`ev_${e.action}` as YashilKey)}</span>
                  {(e.payload as { act_number?: string }).act_number && <span className="ym-badge">{(e.payload as { act_number?: string }).act_number}</span>}
                  {e.to_state && e.to_state !== e.from_state && <StateBadge state={e.to_state as OrderDetail["state"]} />}
                  <span className="ym-muted text-xs">{fmtDateTime(e.created_at)} · {e.actor_label || e.actor_name}</span>
                </div>
                {e.comment && <div className="text-xs mt-0.5">{e.reason_code ? `${t((e.action.startsWith("act_") ? `act_reason_${e.reason_code}` : `reason_${e.reason_code}`) as YashilKey)}: ` : ""}{e.comment}</div>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {dialog === "sign" && <SignSubmitDialog orderId={o.id} versionNo={o.version_no} onClose={() => setDialog(null)} onDone={() => setDialog(null)} />}
      {dialog === "act" && <ActFormDialog order={o} onClose={() => setDialog(null)} onDone={(act) => { setDialog(null); navigate(YASHIL_ROUTES.act(act.id)); }} />}

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
                <button key={f} type="button" className={`ym-btn !min-h-7 !px-2 text-xs ${fields.includes(f) ? "ym-btn--active" : ""}`} onClick={() => setFields((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]))}>{t(FIELD_LABEL[f])}</button>
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
          <DialogHeader><DialogTitle>{t("accept_title")}</DialogTitle><DialogDescription>{o.supplier.supplier_type === "dm" ? t("accept_hint_dm") : t("accept_hint_forest")}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("executor")} *<input className="ym-select w-full mt-1" value={executor} onChange={(e) => setExecutor(e.target.value)} /></label>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> {t("accept_confirm")}</label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={accepting || !executor.trim() || !confirmed} onClick={() => run(() => accept({ id: o.id, version_no: o.version_no, executor_name: executor }).unwrap(), t("action_ok"))}>{t("confirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("cancel_draft_title")}</DialogTitle><DialogDescription>{t("cancel_draft_hint")}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("cancel_reason")}<textarea className="ym-select w-full mt-1 min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("close")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={cancelling || !comment.trim()} onClick={() => run(() => cancelOrder({ id: o.id, body: { reason: comment } }).unwrap(), t("action_ok"))}>{t("confirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel_request"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root sm:max-w-2xl">
          <DialogHeader><DialogTitle>{t("cancel_request_title")}</DialogTitle><DialogDescription>{t("cancel_request_hint")}</DialogDescription></DialogHeader>
          <div className="flex gap-2" role="tablist">
            <button type="button" className={`ym-btn ${cancelFull ? "ym-btn--active" : ""}`} onClick={() => setCancelFull(true)}>{t("cancel_full")}</button>
            <button type="button" className={`ym-btn ${!cancelFull ? "ym-btn--active" : ""}`} onClick={() => setCancelFull(false)}>{t("cancel_partial")}</button>
          </div>
          {!cancelFull && (
            <table className="ym-table">
              <thead><tr><th>{t("col_name")}</th><th>{t("remaining_qty")}</th><th>{t("col_qty")}</th></tr></thead>
              <tbody>
                {o.lines.filter((l) => Number(l.remaining_qty ?? l.qty) > 0).map((l) => (
                  <tr key={l.id}><td>{pickName(l.catalog_item)}</td><td>{l.remaining_qty ?? l.qty} {c(l.unit_cyr)}</td>
                    <td><input type="number" min={0} max={Number(l.remaining_qty ?? l.qty)} step="any" className="ym-select w-28" value={cancelLines[l.id] ?? ""} onChange={(e) => setCancelLines((m) => ({ ...m, [l.id]: e.target.value }))} /></td></tr>
                ))}
              </tbody>
            </table>
          )}
          <label className="text-sm block">{t("cancel_reason")}<textarea className="ym-select w-full mt-1 min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("close")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={cancelling || !comment.trim() || (!cancelFull && !Object.values(cancelLines).some((v) => Number(v) > 0))}
              onClick={() => run(() => cancelOrder({ id: o.id, body: { reason: comment, lines: cancelFull ? [] : Object.entries(cancelLines).filter(([, v]) => Number(v) > 0).map(([k, v]) => ({ order_line: k, qty: v })) } }).unwrap(), t("action_ok"))}>
              {t("send_request")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel_confirm"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{pendingDecision === "approve" ? t("action_cancel_approve") : t("action_cancel_agree")}</DialogTitle><DialogDescription>{cr?.reason}</DialogDescription></DialogHeader>
          <p className="text-sm">{t("cancel_lines")}: {cr?.is_full ? t("all_remaining") : cr?.lines.map((l) => `${l.name_cyr} — ${l.qty}`).join("; ")}</p>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("close")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={deciding || !cr || !pendingDecision} onClick={() => cr && pendingDecision && run(() => decideCancel({ id: cr.id, decision: pendingDecision }).unwrap(), t("action_ok"))}>{t("confirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel_reject"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("action_cancel_reject")}</DialogTitle><DialogDescription>{cr?.reason}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("reject_note")} *<textarea className="ym-select w-full mt-1 min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("close")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={deciding || !comment.trim() || !cr} onClick={() => cr && run(() => decideCancel({ id: cr.id, decision: "reject", note: comment }).unwrap(), t("action_ok"))}>{t("reject")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docId} onOpenChange={(v) => !v && setDocId(null)}>
        <DialogContent className="yashil-root sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("documents_title")}</DialogTitle><DialogDescription>{docVersion ? `v${docVersion.version_no} · ${t(`doc_status_${docVersion.status}` as YashilKey)}` : t("loading")}</DialogDescription></DialogHeader>
          {docVersion && <div className="bg-white text-black rounded-xl p-3 border border-[var(--ym-border)]"><DocumentPreview content={docVersion.content} qrToken={docVersion.qr_token} signatures={docVersion.signatures} unsigned={docVersion.status === "unsigned"} /></div>}
          <DialogFooter>
            {docVersion && <button type="button" className="ym-btn" onClick={() => openDocumentHtml(docVersion.id, token).catch(() => toast.error(t("error_generic")))}>{t("print")}</button>}
            {docVersion && <button type="button" className="ym-btn" onClick={() => openDocumentPdf(docVersion.id, token).catch(() => toast.error(t("error_generic")))}>{t("pdf")}</button>}
            <button type="button" className="ym-btn ym-btn--primary" onClick={() => setDocId(null)}>{t("back")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </YashilLayout>
  );
}

export default OrderDetailPage;
