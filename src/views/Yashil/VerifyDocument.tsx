/** Ochiq QR tekshirish sahifasi (TZ §13.2): login'siz, shaxsiy ma'lumotsiz. */
import { useParams } from "react-router-dom";
import { useYashilT } from "@/features/yashil/i18n";
import { useVerifyYashilDocumentQuery } from "@/services/yashilApi";
import { fmtDateTime } from "@/views/Dashboard/Yashil/Orders/orderUi";
import "@/views/Dashboard/Yashil/yashil.css";

function VerifyDocument() {
  const { t } = useYashilT();
  const { token = "" } = useParams<{ token: string }>();
  const { data, error, isLoading } = useVerifyYashilDocumentQuery(token, { skip: !token });

  const statusKey = data ? (`verify_${data.status}` as const) : null;
  const badge = data?.status === "valid" ? "" : data?.status === "unsigned" ? "ym-badge--amber" : "ym-badge--red";

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
              <span className="font-semibold">{data.doc_type === "order_form" ? t("doc_order_form") : t("doc_act")} {data.number ?? "—"}</span>
              <span className="ym-muted text-sm">v{data.version_no}{data.date ? ` · ${data.date}` : ""}</span>
            </div>
            <dl className="text-sm grid gap-1">
              <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_parties")}</dt><dd>{data.parties.mahalla} → {data.parties.supplier}</dd></div>
              <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_signatures")}</dt>
                <dd>{data.signatures.length === 0 ? "—" : data.signatures.map((s, i) => <div key={i}>{s.role === "mahalla" ? t("member_type_mahalla") : t("member_type_supplier")} · {fmtDateTime(s.signed_at)} · {s.valid ? t("verify_valid") : "—"}</div>)}</dd></div>
              <div className="flex gap-2"><dt className="ym-muted min-w-[120px]">{t("verify_checked_at")}</dt><dd>{fmtDateTime(data.checked_at)}</dd></div>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyDocument;
