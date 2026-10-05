// Ochiq sahifa: hisobot imzosini tekshirish (QR koddan ochiladi, login kerak emas)
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { base_url } from "@/services/baseUrl";

interface VerifyResponse {
  id: string;
  valid: boolean;
  report_unchanged: boolean;
  signed_at: string;
  timestamp_tsa?: string | null;
  signer: {
    full_name: string;
    tin: string;
    pinfl_masked: string;
    cert_serial: string;
    cert_valid_from: string;
    cert_valid_to: string;
  };
  report: {
    id: string;
    organization: string | null;
    statement: string | null;
    period: string;
    quarter: string | null;
    status: string;
  };
  document_hash: string;
}

export default function VerifySignature() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    if (!id) return;
    const lang = (i18n.language || "uz").slice(0, 2);
    fetch(`${base_url}/reports/signatures/${id}/verify/?lang=${lang}`)
      .then(async (r) => {
        if (r.status === 404) return setState("notfound");
        if (!r.ok) return setState("error");
        setData(await r.json());
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [id, i18n.language]);

  const verdict =
    data && data.valid && data.report_unchanged
      ? { icon: ShieldCheck, cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40", text: t("signature_valid") }
      : data && data.valid
        ? { icon: ShieldAlert, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40", text: t("signature_valid_changed") }
        : { icon: ShieldX, cls: "text-red-600 bg-red-50 dark:bg-red-950/40", text: t("signature_invalid") };

  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right break-all">{value}</span>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{t("verify_signature")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">STAT-URMON</p>

        {state === "loading" && (
          <p className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
          </p>
        )}
        {state === "notfound" && <p className="text-red-600">{t("signature_not_found")}</p>}
        {state === "error" && <p className="text-red-600">{t("unexpectedSignError")}</p>}

        {state === "ok" && data && (
          <>
            <div className={`flex items-center gap-3 rounded-xl p-4 mb-6 ${verdict.cls}`}>
              <verdict.icon className="w-7 h-7 shrink-0" />
              <span className="font-semibold">{verdict.text}</span>
            </div>

            <Row label={t("signer")} value={data.signer.full_name} />
            <Row label={t("organization")} value={data.report.organization} />
            <Row label="STIR" value={data.signer.tin} />
            <Row label="PINFL" value={data.signer.pinfl_masked} />
            <Row label={t("statement")} value={data.report.statement} />
            <Row label={t("period")} value={data.report.period} />
            <Row label={t("quarter")} value={data.report.quarter?.toUpperCase()} />
            <Row label={t("signed_at")} value={new Date(data.signed_at).toLocaleString("ru-RU")} />
            <Row label={t("cert_valid_until")} value={data.signer.cert_valid_to} />
            <Row label={t("report_status")} value={t(data.report.status) || data.report.status} />
            <Row label={t("report_unchanged")} value={data.report_unchanged ? t("yes") : t("no")} />
            <div className="mt-4">
              <span className="text-xs text-slate-400 font-mono break-all">{data.document_hash}</span>
            </div>
          </>
        )}

        <Link to="/" className="inline-block mt-6 text-sm text-[#00BC7D] hover:underline">
          ← {t("back_home")}
        </Link>
      </div>
    </div>
  );
}
