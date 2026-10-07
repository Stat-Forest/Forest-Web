import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BILLING_ROUTES } from "@/features/billing/constants";
import { formatArea, formatDate, formatMoney } from "@/features/billing/format";
import type { ContractListItem } from "@/features/billing/types";
import ContractActionsMenu from "./ContractActionsMenu";
import ContractStatusControl from "./ContractStatusControl";
import type { OpenContractDialog } from "./contractDialogTypes";
import { GREEN_MONEY_CLASS as green, debtClass, debtText } from "./money";

interface ContractsTableProps {
  contracts: ContractListItem[];
  loading: boolean;
  canEdit: boolean;
  onOpen: OpenContractDialog;
}

const COLUMN_KEYS = [
  "actions",
  "xojalik",
  "start",
  "end",
  "number",
  "fullname",
  "area",
  "calculated",
  "paid",
  "debt",
  "files",
  "map",
  "location",
  "status",
] as const;

const headClass =
  "text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap px-3 h-[44px] bg-slate-100 dark:bg-slate-800";
const cellClass = "px-3 py-2 text-xs sm:text-sm whitespace-nowrap";
const linkBtn =
  "text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer text-xs sm:text-sm";
/** Qator ichidagi tugma/select/link bosilganda detail'ga o'tmaslik. */
const isInteractiveTarget = (e: MouseEvent<HTMLElement>) => {
  const el = e.target as HTMLElement | null;
  return !!el?.closest?.("button, a, [role='combobox'], [role='menu'], [data-no-row-click]");
};

/** 14 ustunli jadval (spec §4.5) — gorizontal scroll, yopishqoq sarlavha. */
function ContractsTable({ contracts, loading, canEdit, onOpen }: ContractsTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currency = t("billing.currency");

  return (
    <div className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs max-h-[70vh] overflow-y-auto">
      <Table className="w-full border-collapse min-w-[1500px]">
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
            {COLUMN_KEYS.map((key) => (
              <TableHead key={key} className={`${headClass} ${key === "actions" ? "w-[64px] text-center" : ""}`}>
                {t(`billing.contracts_col_${key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="text-slate-800 dark:text-slate-100">
          {loading && contracts.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b border-slate-200 dark:border-slate-800">
                  {COLUMN_KEYS.map((key) => (
                    <TableCell key={key} className={cellClass}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : contracts.map((c) => {
                const hasLocation = !!(c.latitude && c.longitude);
                return (
                  <TableRow
                    key={c.id}
                    onClick={(e) => {
                      if (isInteractiveTarget(e)) return;
                      navigate(BILLING_ROUTES.detail(c.id));
                    }}
                    className="h-[48px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200 dark:border-slate-800"
                  >
                    <TableCell className={`${cellClass} text-center`}>
                      <ContractActionsMenu contract={c} canEdit={canEdit} onOpen={onOpen} />
                    </TableCell>
                    <TableCell className={`${cellClass} font-medium max-w-[260px] truncate`} title={c.xojalik_name}>
                      {c.xojalik_name || "-"}
                    </TableCell>
                    <TableCell className={cellClass}>{formatDate(c.contract_date, "-")}</TableCell>
                    <TableCell className={cellClass}>{c.expired_date ? formatDate(c.expired_date) : "-"}</TableCell>
                    <TableCell className={`${cellClass} font-medium`}>{c.contract_number || c.number || "-"}</TableCell>
                    <TableCell className={`${cellClass} max-w-[240px] truncate`} title={c.renter?.full_name}>
                      {c.renter?.full_name || "-"}
                    </TableCell>
                    <TableCell className={cellClass}>{c.rent_area ? formatArea(c.rent_area) : "-"}</TableCell>
                    <TableCell className={`${cellClass} ${green}`}>{formatMoney(c.rent_amount, currency)}</TableCell>
                    <TableCell className={`${cellClass} ${green}`}>{formatMoney(c.paid_amount, currency)}</TableCell>
                    <TableCell className={`${cellClass} ${debtClass(c.debt)}`}>{debtText(c.debt, currency)}</TableCell>
                    <TableCell className={cellClass}>
                      <button type="button" className={linkBtn} onClick={() => onOpen("files", c)}>
                        {t("billing.contracts_files_btn")}
                        {c.files_count > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 min-w-[18px]">
                            {c.files_count}
                          </span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className={cellClass}>
                      {c.has_boundary ? (
                        <button type="button" className={linkBtn} onClick={() => onOpen("boundary", c)}>
                          {t("billing.contracts_view_on_map")}
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className={`${cellClass} text-center`}>
                      {hasLocation ? (
                        <button
                          type="button"
                          title={t("billing.contracts_col_location")}
                          aria-label={t("billing.contracts_col_location")}
                          className="inline-flex items-center justify-center text-red-600 hover:text-red-700 cursor-pointer"
                          onClick={() => onOpen("location", c)}
                        >
                          <MapPin size={20} fill="currentColor" className="text-red-600" />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <ContractStatusControl
                        status={c.status}
                        canEdit={canEdit}
                        onRequestChange={(next) => onOpen(next === "inactive" ? "cancel" : "reactivate", c)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}

export default ContractsTable;
