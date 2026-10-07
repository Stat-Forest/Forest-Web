import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Ban, CheckCircle2, Eye, History, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BILLING_ROUTES } from "@/features/billing/constants";
import { formatDate } from "@/features/billing/format";
import type { ContractListItem, ContractStatus } from "@/features/billing/types";
import type { OpenContractDialog } from "./contractDialogTypes";

interface ContractsGridProps {
  contracts: ContractListItem[];
  loading: boolean;
  canEdit: boolean;
  onOpen: OpenContractDialog;
}

const COLUMNS: Array<{ status: ContractStatus; pill: string }> = [
  {
    status: "active",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    status: "inactive",
    pill: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
];

const iconBtn =
  "inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer";

/** Grid ko'rinish: ikki ustun — Faol / Faol emas. */
function ContractsGrid({ contracts, loading, canEdit, onOpen }: ContractsGridProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {COLUMNS.map((col) => {
        const items = contracts.filter((c) => c.status === col.status);
        return (
          <div
            key={col.status}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 shadow-xs backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold ${col.pill}`}>
                {t(col.status === "active" ? "billing.status_active" : "billing.status_inactive")}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{items.length}</span>
            </div>

            {loading && contracts.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                {t("billing.contracts_grid_empty")}
              </p>
            ) : (
              items.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 space-y-2 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <Row label={t("billing.contracts_grid_number")} value={c.contract_number || c.number || "-"} />
                  <Row label={t("billing.contracts_grid_date")} value={formatDate(c.created_at, "-")} />
                  <Row label={t("billing.contracts_grid_xojalik")} value={c.xojalik_name || "-"} />
                  <Row label={t("billing.contracts_grid_renter")} value={c.renter?.full_name || "-"} />
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Link
                      to={BILLING_ROUTES.detail(c.id)}
                      title={t("billing.contracts_action_view")}
                      className={`${iconBtn} text-blue-600 dark:text-blue-400`}
                    >
                      <Eye size={16} />
                    </Link>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          title={t("billing.contracts_action_edit")}
                          className={`${iconBtn} text-amber-600 dark:text-amber-400`}
                          onClick={() => onOpen("edit", c)}
                        >
                          <Pencil size={16} />
                        </button>
                        {c.status === "active" ? (
                          <button
                            type="button"
                            title={t("billing.contracts_action_cancel")}
                            className={`${iconBtn} text-red-600 dark:text-red-400`}
                            onClick={() => onOpen("cancel", c)}
                          >
                            <Ban size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title={t("billing.contracts_action_reactivate")}
                            className={`${iconBtn} text-emerald-600 dark:text-emerald-400`}
                            onClick={() => onOpen("reactivate", c)}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          title={t("billing.contracts_action_transfer")}
                          className={`${iconBtn} text-indigo-600 dark:text-indigo-400`}
                          onClick={() => onOpen("transfer", c)}
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      title={t("billing.contracts_action_history")}
                      className={`${iconBtn} text-slate-600 dark:text-slate-300`}
                      onClick={() => onOpen("history", c)}
                    >
                      <History size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 text-right truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

export default ContractsGrid;
