/** Ochiq QR tekshirish sahifasi (TZ §13.2): login'siz, shaxsiy ma'lumotsiz; buyurtmanoma, dalolatnoma, bekor hujjati. */
import { useParams } from "react-router-dom";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useVerifyYashilDocumentQuery } from "@/services/yashilApi";
import { fmtDateTime } from "@/views/Dashboard/Yashil/Orders/orderUi";
import "@/views/Dashboard/Yashil/yashil.css";

const DOC_KEY: Record<string, YashilKey> = { order_form: "doc_order_form", act: "doc_act", cancellation: "doc_cancellation" };

function VerifyDocument() {
  const { t } = useYashilT();
  const { token = "" } = useParams<{ token: string }>();
  const { data, error, isLoading } = useVerifyYashilDocumentQuery(token, { skip: !token });

  const statusKey = data ? (`verify_${data.status}` as YashilKey) : null;
  const badge = data?.status === "valid" ? "" : data?.status === "unsigned" || data?.status === "pending_signature" ? "ym-badge--amber" : "ym-badge--red";
  const roleLabel = (r: string) => (r === "mahalla" ? t("member_type_mahalla") : t("member_type_supplier"));

  return (
    <div className="yashil-root min-h-screen flex items-start justify-center p-4 sm:p-8">
      <div className="ym-card w-full max-w-xl space-y-3">
        <div className="text-[11px] tracking-[1.5px] uppercase ym-muted">STAT-URMON · {t("module_title")}</div>
        <h1 className="ym-title">{t("verify_title")}</h1>
        {isLoading && <p className="ym-muted">{t("loading")}</p>}
        {error && <p className="ym-badge ym-badge--red">{t("verify_not_found")}</p>}
        {data && statusKey && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`ym-badge ${badge} text-sm`}>{t(statusKey)}</span>
              <span className="font-semibold">{t(DOC_KEY[data.doc_type] ?? "doc_order_form")} {data.number ?? "—"}</span>
              <span className="ym-muted text-sm">v{data.version_no}{data.date ? ` · ${data.date}` : ""}</span>
              {data.is_partial && <span className="ym-badge ym-badge--blue">{t("partial_badge")}</span>}
            </div>
            <dl className="text-sm grid gap-1">
              {data.doc_type !== "order_form" && data.order_number && (
                <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_order")}</dt><dd>{data.order_number}</dd></div>
              )}
              <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_parties")}</dt><dd>{data.parties.mahalla} → {data.parties.supplier}</dd></div>
              <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_signatures")}</dt>
                <dd>{data.signatures.length === 0 ? "—" : data.signatures.map((s, i) => <div key={i}>{roleLabel(s.role)} · {fmtDateTime(s.signed_at)} · {s.valid ? t("verify_valid") : "—"}</div>)}</dd></div>
              {data.missing_roles.length > 0 && !["superseded", "cancelled", "tampered"].includes(data.status) && (
                <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_missing")}</dt><dd>{data.missing_roles.map(roleLabel).join(", ")}</dd></div>
              )}
              <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_checked_at")}</dt><dd>{fmtDateTime(data.checked_at)}</dd></div>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyDocument;
