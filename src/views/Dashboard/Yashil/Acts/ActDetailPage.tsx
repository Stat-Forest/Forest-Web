/** Dalolatnoma tafsiloti (TZ §10, §12): qatorlar, dalillar, versiyalar, hujjat (HTML/PDF), imzo, qaytarish, bekor. */
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import type { RootState } from "@/app/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import YashilLayout from "../YashilLayout";
import DocumentPreview from "../Orders/DocumentPreview";
import ActFormDialog from "./ActFormDialog";
import ActSignDialog from "./ActSignDialog";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { ActAction, ActReturnReason } from "@/features/yashil/types";
import {
  openDocumentHtml,
  openDocumentPdf,
  useCancelYashilActMutation,
  useDeleteYashilActAttachmentMutation,
  useGetYashilActQuery,
  useGetYashilDocumentVersionQuery,
  useGetYashilOrderQuery,
  useReturnYashilActMutation,
  useUploadYashilActAttachmentMutation,
} from "@/services/yashilApi";
import { ActStatusBadge, StateBadge, apiErrorText, fmtBytes, fmtDate, fmtDateTime } from "../Orders/orderUi";

const ACT_REASONS: ActReturnReason[] = ["document", "quantity", "quality", "not_delivered", "other"];
const ACTION_KEY: Record<ActAction, YashilKey> = {
  edit: "act_action_edit", attach: "act_action_attach", sign: "act_action_sign", cancel: "act_action_cancel", approve: "act_action_approve", return: "act_action_return",
};
const PRIMARY: ActAction[] = ["sign", "approve"];

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex gap-2 text-sm"><dt className="ym-muted min-w-[170px] shrink-0">{k}</dt><dd className="font-medium break-words">{v}</dd></div>;
}

function ActDetailPage() {
  const { t, script } = useYashilT();
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);
  const { data: act, isLoading, error } = useGetYashilActQuery(id);
  const { data: order } = useGetYashilOrderQuery(act?.order.id ?? skipToken);
  const [dialog, setDialog] = useState<"edit" | "sign" | "return" | "cancel" | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const { data: docVersion } = useGetYashilDocumentVersionQuery(docId ?? skipToken);
  const [reason, setReason] = useState<ActReturnReason>("quantity");
  const [comment, setComment] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading: uploading }] = useUploadYashilActAttachmentMutation();
  const [removeFile] = useDeleteYashilActAttachmentMutation();
  const [ret, { isLoading: returning }] = useReturnYashilActMutation();
  const [cancelAct, { isLoading: cancelling }] = useCancelYashilActMutation();

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      setDialog(null);
    } catch (e) {
      toast.error(apiErrorText(e, t("error_generic")));
    }
  };

  const onAction = (a: ActAction) => {
    switch (a) {
      case "edit": setDialog("edit"); break;
      case "attach": fileRef.current?.click(); break;
      case "sign":
      case "approve": setDialog("sign"); break;
      case "return": setComment(""); setDialog("return"); break;
      case "cancel": setComment(""); setDialog("cancel"); break;
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !act) return;
    for (const f of Array.from(files)) {
      try {
        await upload({ id: act.id, file: f }).unwrap();
      } catch (e) {
        toast.error(apiErrorText(e, t("error_generic")));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isLoading) return <YashilLayout title={t("act_detail")}><div className="ym-card ym-muted">{t("loading")}</div></YashilLayout>;
  if (error || !act) return <YashilLayout title={t("act_detail")}><div className="ym-card">{apiErrorText(error, t("error_generic"))}</div></YashilLayout>;

  const cv = act.current_version;
  const docVersions = act.document?.versions ?? [];
  const events = (order?.events ?? []).filter((e) => (e.payload as { act_id?: string })?.act_id === act.id);

  return (
    <YashilLayout title={act.number} actions={<Link to={YASHIL_ROUTES.acts} className="ym-btn">← {t("acts_title")}</Link>}>
      {act.last_return && act.status === "returned" && (
        <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>
          <b>{t("act_returned_notice")}</b> ({t(`act_reason_${act.last_return.reason_code}` as YashilKey)}, {fmtDateTime(act.last_return.at)}): {act.last_return.comment}
        </div>
      )}

      <section className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">{t("doc_act")} {act.number}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <ActStatusBadge status={act.status} />
              <span className="ym-badge">v{act.version_no}</span>
              {act.is_partial && <span className="ym-badge ym-badge--blue">{t("partial_badge")}</span>}
              <Link to={YASHIL_ROUTES.order(act.order.id)} className="text-sm underline text-[var(--ym-green-dark)]">{t("order_link")}: {act.order.number}</Link>
              <StateBadge state={act.order.state} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {act.actions.map((a) => (
              <button key={a} type="button" className={`ym-btn ${PRIMARY.includes(a) ? "ym-btn--primary" : ""}`} onClick={() => onAction(a)} disabled={a === "attach" && uploading}>
                {t(ACTION_KEY[a])}
              </button>
            ))}
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </div>
        </div>
        <dl className="grid md:grid-cols-2 gap-x-6 gap-y-1.5">
          <Row k={t("col_mahalla")} v={act.order.mahalla_name} />
          <Row k={t("col_supplier")} v={act.order.supplier_name} />
          <Row k={t("delivery_date")} v={fmtDate(cv?.delivery_date)} />
          <Row k={t("responsible")} v={cv?.responsible || "—"} />
          <Row k={t("delivery_address")} v={cv?.delivery_address || order?.address || "—"} />
          {cv?.note && <Row k={t("act_note")} v={cv.note} />}
          {cv?.submitted_at && <Row k={t("act_submitted_at")} v={fmtDateTime(cv.submitted_at)} />}
          {act.approved_at && <Row k={t("act_status_approved")} v={fmtDateTime(act.approved_at)} />}
        </dl>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("lines_title")}</h3>
          <table className="ym-table">
            <thead><tr><th>#</th><th>{t("col_name")}</th><th>{t("col_ordered")}</th><th>{t("col_delivered")}</th><th>{t("col_unit")}</th></tr></thead>
            <tbody>
              {(cv?.lines ?? []).map((l, i) => (
                <tr key={l.id}><td>{i + 1}</td><td>{pickName(l.catalog_item, script)}</td><td>{l.ordered_qty}</td><td className="font-semibold">{l.qty}</td><td>{l.unit_cyr}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-1">{t("act_evidence_title")}</h3>
          <p className="ym-muted text-xs mb-2">{t("act_evidence_hint")}</p>
          {act.attachments.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : (
            <ul className="text-sm space-y-1">
              {act.attachments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2">
                  <a href={a.url ?? "#"} target="_blank" rel="noreferrer" className="text-[var(--ym-green-dark)] underline">{a.original_name}</a>
                  <span className="ym-muted text-xs">{fmtBytes(a.size)} · v{a.version_no}</span>
                  {act.actions.includes("attach") && (
                    <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => run(() => removeFile({ id: act.id, attachmentId: a.id }).unwrap())}>{t("delete")}</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {act.actions.includes("attach") && <button type="button" className="ym-btn mt-3" onClick={() => fileRef.current?.click()} disabled={uploading}>{t("add_file")}</button>}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("documents_title")}</h3>
          {docVersions.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : (
            <ul className="text-sm space-y-1">
              {docVersions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <span>v{v.version_no}</span>
                  <span className={`ym-badge ${v.status === "signed" ? "" : v.status === "unsigned" || v.status === "partly_signed" ? "ym-badge--amber" : "ym-badge--blue"}`}>{t(`doc_status_${v.status}` as YashilKey)}</span>
                  {v.signatures.map((s) => <span key={s.id} className="ym-muted text-xs">{s.role === "mahalla" ? t("member_type_mahalla") : t("member_type_supplier")}: {s.signer_cn} · {fmtDateTime(s.signed_at)}</span>)}
                  <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => setDocId(v.id)}>{t("view")}</button>
                  <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => openDocumentHtml(v.id, token).catch(() => toast.error(t("error_generic")))}>{t("print")}</button>
                  <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => openDocumentPdf(v.id, token).catch(() => toast.error(t("error_generic")))}>{t("pdf")}</button>
                </li>
              ))}
            </ul>
          )}
          <h4 className="font-semibold mt-4 mb-1">{t("act_versions")}</h4>
          <ul className="text-sm space-y-1">
            {act.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap gap-2 items-center">
                <span>v{v.version_no}</span>
                <span className="ym-muted text-xs">{fmtDate(v.delivery_date)} · {v.lines.map((l) => `${l.catalog_item.code}: ${l.qty}`).join(", ")}</span>
                {v.superseded_at && <span className="ym-badge ym-badge--blue">{t("superseded")}</span>}
              </li>
            ))}
          </ul>
        </section>
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-2">{t("journal_title")}</h3>
          {events.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : (
            <ol className="text-sm space-y-2">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-[var(--ym-border)] pl-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-medium">{t(`ev_${e.action}` as YashilKey)}</span>
                    <span className="ym-muted text-xs">{fmtDateTime(e.created_at)} · {e.actor_label || e.actor_name}</span>
                  </div>
                  {e.comment && <div className="text-xs mt-0.5">{e.reason_code ? `${t(`act_reason_${e.reason_code}` as YashilKey)}: ` : ""}{e.comment}</div>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {dialog === "edit" && order && <ActFormDialog order={order} act={act} onClose={() => setDialog(null)} onDone={() => setDialog(null)} />}
      {dialog === "sign" && <ActSignDialog actId={act.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); if (act.actions.includes("approve")) navigate(YASHIL_ROUTES.acts); }} />}

      <Dialog open={dialog === "return"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("act_return_title")}</DialogTitle><DialogDescription>{act.number}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("return_reason")}
            <select className="ym-select w-full mt-1" value={reason} onChange={(e) => setReason(e.target.value as ActReturnReason)}>
              {ACT_REASONS.map((r) => <option key={r} value={r}>{t(`act_reason_${r}` as YashilKey)}</option>)}
            </select>
          </label>
          <label className="text-sm block">{t("return_comment")}<textarea className="ym-select w-full mt-1 min-h-[90px]" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={returning || !comment.trim()} onClick={() => run(() => ret({ id: act.id, reason_code: reason, comment }).unwrap(), t("action_ok"))}>{t("act_action_return")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("act_cancel_title")}</DialogTitle><DialogDescription>{t("act_cancel_hint")}</DialogDescription></DialogHeader>
          <label className="text-sm block">{t("note")}<textarea className="ym-select w-full mt-1 min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDialog(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={cancelling} onClick={() => run(() => cancelAct({ id: act.id, comment }).unwrap(), t("action_ok"))}>{t("confirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docId} onOpenChange={(v) => !v && setDocId(null)}>
        <DialogContent className="yashil-root sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("doc_act")}</DialogTitle><DialogDescription>{docVersion ? `v${docVersion.version_no} · ${t(`doc_status_${docVersion.status}` as YashilKey)}` : t("loading")}</DialogDescription></DialogHeader>
          {docVersion && <div className="bg-white text-black rounded-xl p-3 border border-[var(--ym-border)]"><DocumentPreview content={docVersion.content} qrToken={docVersion.qr_token} signatures={docVersion.signatures} unsigned={docVersion.status === "unsigned"} /></div>}
          <DialogFooter>
            {docVersion && <button type="button" className="ym-btn" onClick={() => openDocumentPdf(docVersion.id, token).catch(() => toast.error(t("error_generic")))}>{t("pdf")}</button>}
            <button type="button" className="ym-btn ym-btn--primary" onClick={() => setDocId(null)}>{t("back")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </YashilLayout>
  );
}

export default ActDetailPage;
