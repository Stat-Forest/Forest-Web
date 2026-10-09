import { useCallback, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Briefcase,
  Clock,
  Download,
  FileText,
  Landmark,
  Loader2,
  Map as MapIcon,
  Pencil,
  ScrollText,
  Sprout,
  UserRound,
  Wallet,
} from "lucide-react";
import BillingLayout from "../BillingLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BILLING_ROUTES, YEARS } from "@/features/billing/constants";
import { useBillingAccess } from "@/features/billing/permissions";
import { formatArea, formatCoord, formatDate, formatDateTime, formatMoney, formatNumber, toNumber, toNumberOrNull } from "@/features/billing/format";
import { downloadBoundaryKmz } from "@/features/billing/geo";
import type { ContractDetail, ContractTypedArea } from "@/features/billing/types";
import { useGetContractQuery } from "@/services/billingApi";
import ContractActionsMenu from "./components/ContractActionsMenu";
import ContractFilesList from "./components/ContractFilesList";
import ContractHistoryList from "./components/ContractHistoryList";
import ContractMap from "./components/ContractMap";
import ContractStatusControl, { ContractStatusBadge } from "./components/ContractStatusControl";
import { GREEN_MONEY_CLASS, debtClass, debtText } from "./components/money";
import type { ContractDialogKind, ContractDialogTarget } from "./components/contractDialogTypes";
import ContractDialogs from "./modals/ContractDialogs";

// ---------------------------------------------------------------------------
// Kichik ko'rinish bloklari
// ---------------------------------------------------------------------------

function SectionCard({ title, icon, actions, children, className = "" }: { title: string; icon: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs backdrop-blur-md transition-colors ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
          <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center">{icon}</span>
          {title}
        </h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-sm font-semibold text-slate-800 dark:text-slate-100 break-words ${className}`}>{empty ? "—" : value}</dd>
    </div>
  );
}

const headCell = "text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 whitespace-nowrap px-3 h-10";
const bodyCell = "px-3 py-2 text-sm text-slate-800 dark:text-slate-100 whitespace-nowrap";

function TypedAreaTable({ rows, typeLabel, areaLabel, totalLabel, emptyText }: { rows: ContractTypedArea[]; typeLabel: string; areaLabel: string; totalLabel: string; emptyText: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{emptyText}</p>;
  const total = rows.reduce((sum, r) => sum + toNumber(r.area), 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headCell}>#</TableHead>
            <TableHead className={headCell}>{typeLabel}</TableHead>
            <TableHead className={`${headCell} text-right`}>{areaLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id} className="border-b border-slate-200 dark:border-slate-800">
              <TableCell className={`${bodyCell} text-slate-500`}>{i + 1}</TableCell>
              <TableCell className={`${bodyCell} whitespace-normal`}>{r.type_name}</TableCell>
              <TableCell className={`${bodyCell} text-right`}>{formatArea(r.area)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <TableCell className={bodyCell} />
            <TableCell className={`${bodyCell} font-bold`}>{totalLabel}</TableCell>
            <TableCell className={`${bodyCell} text-right font-bold`}>{formatArea(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sahifa
// ---------------------------------------------------------------------------

/** /billing/contracts/:id — shartnoma to'liq ko'rinishi (spec §4.5 "Detail sahifa"). */
function ContractDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useBillingAccess();
  const currency = t("billing.currency");

  const { data: contract, isLoading, isError, refetch } = useGetContractQuery(id ?? skipToken);

  const [dialog, setDialog] = useState<ContractDialogTarget | null>(null);
  const open = useCallback(
    (kind: ContractDialogKind) => {
      if (contract) setDialog({ kind, contract });
    },
    [contract],
  );

  const [kmzLoading, setKmzLoading] = useState(false);
  const downloadKmz = async (c: ContractDetail) => {
    if (!c.boundary_geojson) return;
    setKmzLoading(true);
    try {
      await downloadBoundaryKmz(c.boundary_geojson, c.contract_number || c.number);
    } catch {
      toast.error(t("billing.contracts_kmz_error"));
    } finally {
      setKmzLoading(false);
    }
  };

  const number = contract ? contract.contract_number || contract.number : "";
  const title = contract ? `${t("billing.contracts_detail_title")} ${number}` : t("billing.contract_detail");

  const headerActions = contract ? (
    <>
      <ContractStatusControl
        status={contract.status}
        canEdit={canEdit}
        size="default"
        onRequestChange={(next) => open(next === "inactive" ? "cancel" : "reactivate")}
      />
      {canEdit && (
        <Button type="button" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => open("edit")}>
          <Pencil size={16} />
          {t("billing.contracts_detail_edit")}
        </Button>
      )}
      <ContractActionsMenu contract={contract} canEdit={canEdit} onOpen={(kind) => open(kind)} hideView placement="header" />
    </>
  ) : undefined;

  const emptyText = t("billing.contracts_detail_no_data");

  return (
    <BillingLayout title={title} section={t("billing.contracts_title")} backTo={BILLING_ROUTES.contracts} actions={headerActions}>
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError || !contract ? (
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={28} className="text-red-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {isError ? t("billing.load_error") : t("billing.contracts_detail_not_found")}
          </p>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => refetch()}>
            {t("billing.contracts_refresh")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Shartnoma */}
            <SectionCard title={t("billing.contracts_detail_contract")} icon={<ScrollText size={16} />}>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <Field label={t("billing.contracts_field_contract_number")} value={number} />
                <Field label={t("billing.contracts_field_status")} value={<ContractStatusBadge status={contract.status} />} />
                <Field
                  label={t("billing.contracts_detail_days_remaining")}
                  value={
                    contract.is_expired ? (
                      <span className="text-red-600 dark:text-red-400">{t("billing.contracts_detail_expired")}</span>
                    ) : contract.days_remaining !== null ? (
                      t("billing.contracts_detail_days", { count: contract.days_remaining })
                    ) : null
                  }
                />
                <Field label={t("billing.contracts_field_contract_date")} value={formatDate(contract.contract_date)} />
                <Field label={t("billing.contracts_field_expired_date")} value={contract.expired_date ? formatDate(contract.expired_date) : null} />
                <Field label={t("billing.contracts_detail_created")} value={formatDateTime(contract.created_at)} />
                <Field label={t("billing.contracts_field_auction_date")} value={contract.auction_date ? formatDate(contract.auction_date) : null} />
                <Field label={t("billing.contracts_field_exemptioned_date")} value={contract.exemptioned_date ? formatDate(contract.exemptioned_date) : null} />
                <Field label={t("billing.contracts_detail_is_entity")} value={t(contract.is_entity ? "billing.contracts_yes" : "billing.contracts_no")} />
                <Field label={t("billing.contracts_field_xojalik")} value={contract.xojalik_name} className="col-span-2 sm:col-span-3" />
                <Field label={t("billing.contracts_field_bolim")} value={contract.bolim_name} />
                <Field label={t("billing.contracts_field_region")} value={contract.region_name} />
                <Field label={t("billing.contracts_field_district")} value={contract.district_name} />
                {contract.status === "inactive" && (
                  <div className="col-span-2 sm:col-span-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 mb-1">
                      {t("billing.contracts_field_cancel_reason")}
                      {contract.canceled_date ? ` · ${formatDate(contract.canceled_date)}` : ""}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 break-words">{contract.cancel_reason || "—"}</p>
                  </div>
                )}
              </dl>
            </SectionCard>

            {/* Ijarachi */}
            <SectionCard title={t("billing.contracts_detail_renter")} icon={<UserRound size={16} />}>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <Field label={t("billing.contracts_renter_fullname")} value={contract.renter?.full_name} className="col-span-2 sm:col-span-3" />
                <Field label={t("billing.contracts_renter_pinfl")} value={contract.renter?.pinfl} />
                <Field label={t("billing.contracts_renter_stir")} value={contract.renter?.stir} />
                <Field label={t("billing.contracts_renter_phone")} value={contract.renter?.phone} />
                <Field label={t("billing.contracts_renter_passport")} value={contract.renter?.passport} />
                <Field label={t("billing.contracts_renter_citizenship")} value={contract.renter?.citizenship} />
                <Field label={t("billing.contracts_renter_birth_place")} value={contract.renter?.birth_place} />
                <Field label={t("billing.contracts_renter_address")} value={contract.renter?.per_adr} className="col-span-2 sm:col-span-3" />
                <Field label={t("billing.contracts_renter_legal")} value={t(contract.renter?.is_legal_entity ? "billing.contracts_yes" : "billing.contracts_no")} />
                <Field label={t("billing.contracts_renter_legal_name")} value={contract.renter?.legal_name} className="col-span-2" />
                {contract.renter?.contracts_count !== undefined && (
                  <Field label={t("billing.contracts_renter_contracts")} value={t("billing.contracts_contracts_count", { count: contract.renter.contracts_count })} />
                )}
              </dl>
            </SectionCard>
          </div>

          {/* Moliya */}
          <SectionCard title={t("billing.contracts_detail_finance")} icon={<Wallet size={16} />}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: t("billing.contracts_sum_calculated"), value: formatMoney(contract.rent_amount, currency), cls: GREEN_MONEY_CLASS },
                { label: t("billing.contracts_sum_paid"), value: formatMoney(contract.paid_amount, currency), cls: GREEN_MONEY_CLASS },
                { label: t("billing.contracts_detail_penalty"), value: formatMoney(contract.penalty_amount, currency), cls: "font-semibold text-amber-600 dark:text-amber-400" },
                { label: t("billing.contracts_sum_debt"), value: debtText(contract.debt, currency), cls: debtClass(contract.debt) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className={`text-base tabular-nums ${item.cls}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={headCell}>{t("billing.contracts_detail_year")}</TableHead>
                    <TableHead className={`${headCell} text-right`}>{t("billing.contracts_detail_contract_amount")}</TableHead>
                    <TableHead className={`${headCell} text-right`}>{t("billing.contracts_detail_calculated")}</TableHead>
                    <TableHead className={`${headCell} text-right`}>{t("billing.contracts_sum_paid")}</TableHead>
                    <TableHead className={`${headCell} text-right`}>{t("billing.contracts_detail_penalty")}</TableHead>
                    <TableHead className={`${headCell} text-right`}>{t("billing.contracts_sum_debt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {YEARS.map((year) => {
                    const row = contract.yearly_amounts?.find((y) => y.year === year);
                    const debt = row ? toNumber(row.debt_amount) : 0;
                    return (
                      <TableRow key={year} className={`border-b border-slate-200 dark:border-slate-800 ${row ? "" : "opacity-60"}`}>
                        <TableCell className={`${bodyCell} font-semibold`}>{year}</TableCell>
                        <TableCell className={`${bodyCell} text-right`}>{row ? formatNumber(row.contract_amount) : "—"}</TableCell>
                        <TableCell className={`${bodyCell} text-right`}>{row ? formatNumber(row.calculated_amount) : "—"}</TableCell>
                        <TableCell className={`${bodyCell} text-right`}>{row ? formatNumber(row.paid_amount) : "—"}</TableCell>
                        <TableCell className={`${bodyCell} text-right`}>{row ? formatNumber(row.penalty_amount) : "—"}</TableCell>
                        <TableCell className={`${bodyCell} text-right ${row ? debtClass(debt) : ""}`}>{row ? debtText(debt, "") : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          {/* Yer */}
          <SectionCard
            title={t("billing.contracts_detail_land")}
            icon={<MapIcon size={16} />}
            actions={
              contract.boundary_geojson ? (
                <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={kmzLoading} onClick={() => downloadKmz(contract)}>
                  {kmzLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {t("billing.contracts_kmz_download")}
                </Button>
              ) : undefined
            }
          >
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-4">
              <Field label={t("billing.contracts_field_rent_area")} value={formatArea(contract.rent_area)} />
              <Field label={t("billing.contracts_field_cadastral_number")} value={contract.cadastral_number} />
              <Field label={t("billing.contracts_field_circle")} value={contract.circle} />
              <Field label={t("billing.contracts_field_section")} value={contract.section} />
              <Field label={t("billing.contracts_field_counter")} value={contract.counter} />
              <Field label={t("billing.contracts_field_massive")} value={contract.massive} />
              <Field label={t("billing.contracts_field_latitude")} value={toNumberOrNull(contract.latitude) !== null ? formatCoord(toNumber(contract.latitude)) : null} />
              <Field label={t("billing.contracts_field_longitude")} value={toNumberOrNull(contract.longitude) !== null ? formatCoord(toNumber(contract.longitude)) : null} />
            </dl>
            {contract.boundary_geojson || (contract.latitude && contract.longitude) ? (
              <ContractMap contract={contract} mode="both" height={460} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">{t("billing.contracts_no_location")}</p>
            )}
          </SectionCard>

          {/* Yer turlari / Faoliyat / Imtiyozlar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <SectionCard title={t("billing.contracts_detail_land_types")} icon={<Sprout size={16} />}>
              <TypedAreaTable
                rows={(contract.lands ?? []).map((l) => ({ id: l.id, type: l.type, type_name: l.parent_type_name ? `${l.parent_type_name} → ${l.type_name}` : l.type_name, area: l.area }))}
                typeLabel={t("billing.contracts_detail_type")}
                areaLabel={t("billing.contracts_detail_area")}
                totalLabel={t("billing.contracts_detail_total")}
                emptyText={emptyText}
              />
            </SectionCard>
            <SectionCard title={t("billing.contracts_detail_activities")} icon={<Briefcase size={16} />}>
              <TypedAreaTable
                rows={contract.activities ?? []}
                typeLabel={t("billing.contracts_detail_type")}
                areaLabel={t("billing.contracts_detail_area")}
                totalLabel={t("billing.contracts_detail_total")}
                emptyText={emptyText}
              />
            </SectionCard>
            <SectionCard title={t("billing.contracts_detail_privileges")} icon={<Landmark size={16} />}>
              <TypedAreaTable
                rows={contract.privileges ?? []}
                typeLabel={t("billing.contracts_detail_type")}
                areaLabel={t("billing.contracts_detail_area")}
                totalLabel={t("billing.contracts_detail_total")}
                emptyText={emptyText}
              />
            </SectionCard>
          </div>

          {/* Bajarilgan ishlar */}
          <SectionCard title={t("billing.contracts_detail_action")} icon={<Briefcase size={16} />}>
            {contract.action ? (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-4">
                  <Field label={t("billing.contracts_detail_vacancy")} value={contract.action.vacancy !== null && contract.action.vacancy !== "" ? String(contract.action.vacancy) : null} />
                  <Field label={t("billing.contracts_detail_own_investment")} value={contract.action.own_investment ? formatMoney(contract.action.own_investment, currency) : null} />
                </dl>
                {contract.action.products?.length ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={headCell}>#</TableHead>
                          <TableHead className={headCell}>{t("billing.contracts_detail_product")}</TableHead>
                          <TableHead className={`${headCell} text-right`}>{t("billing.contracts_detail_product_amount")}</TableHead>
                          <TableHead className={`${headCell} text-right`}>{t("billing.contracts_detail_export_amount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.action.products.map((p, i) => (
                          <TableRow key={p.id} className="border-b border-slate-200 dark:border-slate-800">
                            <TableCell className={`${bodyCell} text-slate-500`}>{i + 1}</TableCell>
                            <TableCell className={`${bodyCell} whitespace-normal`}>{p.product_export || "—"}</TableCell>
                            <TableCell className={`${bodyCell} text-right`}>{p.product_amount ? formatNumber(p.product_amount) : "—"}</TableCell>
                            <TableCell className={`${bodyCell} text-right`}>{p.export_amount ? formatNumber(p.export_amount) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">{emptyText}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{emptyText}</p>
            )}
          </SectionCard>

          {/* Fayllar / Tarix */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard title={t("billing.contracts_detail_files")} icon={<FileText size={16} />}>
              <ContractFilesList contractId={contract.id} canEdit={canEdit} />
            </SectionCard>
            <SectionCard title={t("billing.contracts_detail_history")} icon={<Clock size={16} />}>
              <div className="max-h-[560px] overflow-y-auto pr-1">
                <ContractHistoryList contractId={contract.id} />
              </div>
            </SectionCard>
          </div>
        </>
      )}

      <ContractDialogs target={dialog} canEdit={canEdit} onClose={() => setDialog(null)} onChanged={() => refetch()} />
    </BillingLayout>
  );
}

export default ContractDetailPage;
