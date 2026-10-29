/**
 * Dalolatnomani imzolash (TZ §10.1–10.2, §13.1): yetkazib beruvchi (qoralama → mahallaga) yoki
 * mahalla (tasdiq) — rolni backend `sign-task/` aniqlaydi; ikkala imzo bitta hujjat versiyasiga.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEimzoSigner, type SignMethod } from "@/utils/useEimzoSigner";
import { useYashilT } from "@/features/yashil/i18n";
import type { ActSignTask } from "@/features/yashil/types";
import { newIdempotencyKey, usePrepareYashilActSignMutation, useSignYashilActMutation } from "@/services/yashilApi";
import DocumentPreview from "../Orders/DocumentPreview";
import { apiErrorText } from "../Orders/orderUi";

interface Props {
  actId: string;
  onClose: () => void;
  onDone: () => void;
}

function ActSignDialog({ actId, onClose, onDone }: Props) {
  const { t } = useYashilT();
  const { t: tt } = useTranslation();
  const [method, setMethod] = useState<SignMethod>("pfx");
  const [task, setTask] = useState<ActSignTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idemKey] = useState(() => newIdempotencyKey());
  const signer = useEimzoSigner(true, tt);
  const [prepare] = usePrepareYashilActSignMutation();
  const [sign] = useSignYashilActMutation();

  useEffect(() => {
    let cancelled = false;
    prepare(actId)
      .unwrap()
      .then((res) => { if (!cancelled) setTask(res); })
      .catch((e) => { if (!cancelled) setError(apiErrorText(e, t("error_generic"))); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actId]);

  const handleSign = async () => {
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      const pkcs7 = await signer.sign(task.sign_text ?? task.document, method);
      await sign({ id: actId, document_version_id: task.document_version_id, nonce: task.nonce, pkcs7, key: idemKey }).unwrap();
      toast.success(t("act_signed_ok"));
      onDone();
    } catch (e) {
      setError((e as Error)?.message && !(e as { data?: unknown }).data ? (e as Error).message : apiErrorText(e, t("error_generic")));
    } finally {
      setBusy(false);
    }
  };

  const canSign = !!task && !busy && !signer.error && (method === "usb" || (signer.ready && !!signer.selectedKey));

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="yashil-root sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("act_sign_title")}</DialogTitle>
          <DialogDescription>{task?.role === "mahalla" ? t("act_sign_desc_mahalla") : t("act_sign_desc_supplier")}</DialogDescription>
        </DialogHeader>

        {!task && !error && <p className="ym-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("preparing_document")}</p>}
        {task && (
          <>
            <div className="border border-[var(--ym-border)] rounded-xl p-3 max-h-[40vh] overflow-auto bg-white text-black">
              <DocumentPreview content={task.document_version.content} qrToken={task.document_version.qr_token} signatures={task.document_version.signatures} unsigned={task.document_version.status === "unsigned"} />
            </div>
            <p className="ym-muted text-xs">{task.mode === "challenge" ? t("sign_mode_challenge") : t("sign_mode_document")} · {t("hash_label")}: <span className="font-mono">{task.content_hash.slice(0, 16)}…</span></p>
          </>
        )}

        <div className="flex gap-2" role="tablist">
          {(["pfx", "usb"] as SignMethod[]).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={method === m} className={`ym-btn ${method === m ? "ym-btn--active" : ""}`} onClick={() => setMethod(m)}>
              {m === "pfx" ? t("sign_method_pfx") : t("sign_method_usb")}
            </button>
          ))}
        </div>
        {method === "pfx" ? (
          signer.loading ? (
            <p className="ym-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}</p>
          ) : signer.keys.length > 0 ? (
            <label className="text-sm block">{t("select_certificate")}
              <select className="ym-select w-full mt-1" value={signer.selectedKey} onChange={(e) => signer.setSelectedKey(e.target.value)} disabled={busy}>
                {signer.keys.map((k) => <option key={k.id} value={k.id} disabled={k.disabled}>{k.label}{k.disabled ? ` (${t("expired")})` : ""}</option>)}
              </select>
            </label>
          ) : (
            !signer.error && <p className="ym-muted text-sm">{t("no_certificates")}</p>
          )
        ) : (
          <div className="ym-notice">{t("usb_hint")}</div>
        )}
        {(signer.error || error) && <p className="text-sm text-[var(--ym-red)] bg-[var(--ym-red-bg)] rounded-lg p-3">{error || signer.error}</p>}

        <DialogFooter>
          <button type="button" className="ym-btn" onClick={onClose} disabled={busy}>{t("cancel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={handleSign} disabled={!canSign}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("signing")}</> : task?.role === "mahalla" ? t("act_action_approve") : t("act_action_sign")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ActSignDialog;
