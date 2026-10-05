// Yuborilgan hisobot ostidagi imzo belgisi: QR kod ochiq tekshirish sahifasiga
// (/verify/<id>) olib boradi. Printda ham chiqadi.
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import type { ReportSignatureInfo } from "@/types/reportInterface";

interface Props {
  signature?: ReportSignatureInfo | null;
  // Eski (imzosiz) yuborilgan hisobotlar uchun faqat matn ko'rsatiladi
  fallbackName?: string;
  orgName?: string;
}

export default function SignatureBadge({ signature, fallbackName, orgName }: Props) {
  const { t } = useTranslation();

  if (!signature?.id) {
    if (!fallbackName) return null;
    return (
      <div className="mt-8 print:mt-12">
        <h2 className="text-lg font-semibold">{fallbackName}</h2>
        {orgName && <h2 className="text-md">{orgName}</h2>}
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${signature.id}`;
  const signedAt = signature.signed_at ? new Date(signature.signed_at).toLocaleString("ru-RU") : "";

  return (
    <div className="mt-8 flex items-center gap-4 justify-start print:mt-12">
      <a href={verifyUrl} target="_blank" rel="noreferrer" title={t("verify_signature")}>
        <QRCodeGenerator value={verifyUrl} />
      </a>
      <div>
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" />
          {t("signed_by_eimzo")}
        </div>
        <h2 className="text-lg font-semibold">{signature.signer_full_name}</h2>
        {orgName && <h2 className="text-md">{orgName}</h2>}
        {signedAt && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("signed_at")}: {signedAt}
          </p>
        )}
        <a
          href={verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[#00BC7D] hover:underline print:hidden"
        >
          {t("verify_signature")}
        </a>
      </div>
    </div>
  );
}
