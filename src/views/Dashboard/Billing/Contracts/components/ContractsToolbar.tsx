import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BILLING_ROUTES } from "@/features/billing/constants";
import type { ContractsViewMode } from "./contractsFilters";

interface ContractsToolbarProps {
  canEdit: boolean;
  hasFilters: boolean;
  refreshing: boolean;
  exporting: boolean;
  downloadingTemplate: boolean;
  viewMode: ContractsViewMode;
  onOpenFilter: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onTemplate: () => void;
  onViewModeChange: (mode: ContractsViewMode) => void;
}

const btn =
  "rounded-xl font-semibold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 transition-all";
const outlineBtn = `${btn} border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`;

function ContractsToolbar({
  canEdit,
  hasFilters,
  refreshing,
  exporting,
  downloadingTemplate,
  viewMode,
  onOpenFilter,
  onRefresh,
  onExport,
  onTemplate,
  onViewModeChange,
}: ContractsToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <>
            <Button asChild className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
              <Link to={BILLING_ROUTES.create}>
                <Plus size={16} />
                {t("billing.create_contract")}
              </Link>
            </Button>
            <Button asChild variant="outline" className={outlineBtn}>
              <Link to={BILLING_ROUTES.uploadExcel}>
                <FileUp size={16} />
                {t("billing.upload_contracts")}
              </Link>
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          title={t("billing.filter")}
          aria-label={t("billing.filter")}
          onClick={onOpenFilter}
          className={`${outlineBtn} relative size-9`}
        >
          <Filter size={16} />
          {hasFilters && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={t("billing.contracts_refresh")}
          aria-label={t("billing.contracts_refresh")}
          onClick={onRefresh}
          disabled={refreshing}
          className={`${outlineBtn} size-9`}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </Button>
        <Button type="button" variant="outline" onClick={onExport} disabled={exporting} className={outlineBtn}>
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          {t("billing.contracts_export_excel")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onTemplate}
          disabled={downloadingTemplate}
          className={outlineBtn}
        >
          {downloadingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {t("billing.contracts_template")}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("billing.contracts_view")}
        </span>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {(
            [
              { mode: "table", icon: <Table2 size={16} />, label: t("billing.contracts_view_table") },
              { mode: "grid", icon: <LayoutGrid size={16} />, label: t("billing.contracts_view_grid") },
            ] as Array<{ mode: ContractsViewMode; icon: ReactNode; label: string }>
          ).map((item) => (
            <button
              key={item.mode}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={viewMode === item.mode}
              onClick={() => onViewModeChange(item.mode)}
              className={`inline-flex items-center gap-1.5 px-3 h-9 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                viewMode === item.mode
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContractsToolbar;
