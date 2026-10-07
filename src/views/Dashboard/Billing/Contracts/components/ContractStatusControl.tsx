import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContractStatus } from "@/features/billing/types";

interface ContractStatusControlProps {
  status: ContractStatus;
  /** Yozish huquqi bo'lsa Select, aks holda badge. */
  canEdit: boolean;
  /** Foydalanuvchi boshqa holat tanlasa (dialog ochish uchun). Qiymat o'zgarmaydi — real holat qoladi. */
  onRequestChange: (next: ContractStatus) => void;
  size?: "sm" | "default";
}

const PILL: Record<ContractStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  inactive:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
};

export function ContractStatusBadge({ status, className = "" }: { status: ContractStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${PILL[status]} ${className}`}
    >
      {t(status === "active" ? "billing.status_active" : "billing.status_inactive")}
    </span>
  );
}

/**
 * Holati ustuni: canEdit → pill ko'rinishidagi Select (Faol / Faol emas).
 * Select boshqariladigan (`value={status}`) — tanlov dialog ochadi, dialog
 * bekor qilinsa hech narsa o'zgarmaydi, select real holatda qoladi.
 */
function ContractStatusControl({ status, canEdit, onRequestChange, size = "sm" }: ContractStatusControlProps) {
  const { t } = useTranslation();
  if (!canEdit) return <ContractStatusBadge status={status} />;

  return (
    <Select
      value={status}
      onValueChange={(v) => {
        if (v !== status) onRequestChange(v as ContractStatus);
      }}
    >
      <SelectTrigger
        size={size}
        data-no-row-click
        onClick={(e) => e.stopPropagation()}
        className={`rounded-full border px-3 font-semibold text-xs shadow-none hover:opacity-90 ${PILL[status]} [&_svg]:opacity-70`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value="active">{t("billing.status_active")}</SelectItem>
        <SelectItem value="inactive">{t("billing.status_inactive")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default ContractStatusControl;
