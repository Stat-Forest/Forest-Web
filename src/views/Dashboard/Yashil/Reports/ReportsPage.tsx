/**
 * Ҳисоботлар (TZ §14): reestr — qator = buyurtma pozitsiyasi, ikki yo'nalish tab'i,
 * filtrlar, jami blok (unikal buyurtmalar), qo'shimcha ustunlar, XLSX/CSV/PDF eksport;
 * dalolatnomalar reestri alohida tab (javob З2).
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import YashilLayout from "../YashilLayout";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { RegistryRow } from "@/features/yashil/types";
import { useGetYashilActsQuery, useGetYashilRegistryQuery, useGetYashilRegistrySummaryQuery } from "@/services/yashilApi";
import { ActStatusBadge, StateBadge, fmtDate, fmtDateTime } from "../Orders/orderUi";
import { ExportMenu, RecentExports } from "./ExportMenu";
import { ReportFilterBar, RouteTabs, useReportFilters } from "./ReportFilters";

const PER_PAGE = 50;
const OPTIONAL: { key: string; label: YashilKey }[] = [
  { key: "executor_name", label: "col_executor" },
  { key: "act_numbers", label: "col_acts" },
  { key: "last_delivery_date", label: "col_delivered_on" },
  { key: "accepted_on", label: "journey_execution" },
  { key: "address", label: "col_address" },
  { key: "lat", label: "col_coords" },
];
const COLUMNS_KEY = "yashil_report_columns";

const loadColumns = (): string[] => {
  try {
    const raw = localStorage.getItem(COLUMNS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

function LateCell({ row }: { row: RegistryRow }) {
  const { t } = useYashilT();
  if (!row.late_workdays) return <span className="ym-muted">—</span>;
  return <span className="ym-badge ym-badge--red">{row.late_workdays} {t("workdays_short")} · {row.overdue_stage_cyr}</span>;
}

function RegistryTab() {
  const { t } = useYashilT();
  const f = useReportFilters();
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get("page") || 1));
  const [extra, setExtra] = useState<string[]>(loadColumns);
  const [showCols, setShowCols] = useState(false);
  const params = useMemo(() => ({ ...f.params, page, per_page: PER_PAGE }), [f.params, page]);
  const { data, isFetching } = useGetYashilRegistryQuery(params);
  const { data: summary } = useGetYashilRegistrySummaryQuery(f.params);
  const pages = data ? Math.max(1, Math.ceil(data.count / PER_PAGE)) : 1;
  const setPage = (p: number) => { const next = new URLSearchParams(sp); next.set("page", String(p)); setSp(next, { replace: true }); };
  const toggle = (k: string) => {
    const next = extra.includes(k) ? extra.filter((x) => x !== k) : [...extra, k];
    setExtra(next);
    try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(next)); } catch { /* xotira mavjud emas */ }
  };
  const has = (k: string) => extra.includes(k);
  const exportColumns = extra.includes("lat") ? [...extra, "lon"] : extra;

  return (
    <>
      <div className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RouteTabs f={f} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ym-btn" onClick={() => setShowCols((v) => !v)} aria-expanded={showCols}>{t("columns")}{extra.length ? ` (${extra.length})` : ""}</button>
            <ExportMenu kind="registry" filters={f.params} columns={exportColumns} disabled={!data || data.count === 0} />
          </div>
        </div>
        {showCols && (
          <div className="flex flex-wrap gap-3 text-sm">
            {OPTIONAL.map((c) => (
              <label key={c.key} className="inline-flex items-center gap-2"><input type="checkbox" checked={has(c.key)} onChange={() => toggle(c.key)} />{t(c.label)}</label>
            ))}
          </div>
        )}
        <ReportFilterBar f={f} />
        {data?.filters_label && <p className="text-xs ym-muted">{data.filters_label}</p>}
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="ym-stat"><span className="text-[13px] ym-muted">{t("summary_orders")}</span><strong>{summary.orders}<small>{t("summary_unique_note")}</small></strong></div>
          <div className="ym-stat"><span className="text-[13px] ym-muted">{t("summary_lines")}</span><strong>{summary.lines}</strong></div>
          <div className="ym-stat"><span className="text-[13px] ym-muted">{t("stat_overdue")}</span><strong className={summary.overdue_orders ? "!text-[var(--ym-red)]" : ""}>{summary.overdue_orders}<small>{t("orders_count_unit")}</small></strong></div>
          <div className="ym-stat"><span className="text-[13px] ym-muted">{t("stat_done")}</span><strong>{summary.by_state.closed ?? 0}<small>{t("orders_count_unit")}</small></strong></div>
        </div>
      )}

      <div className="ym-card space-y-3">
        {data && data.results.length === 0 && !isFetching ? (
          <p className="ym-muted text-sm py-6 text-center">{t("empty")}</p>
        ) : (
          <div className="overflow-auto">
            <table className="ym-table text-[13px]">
              <thead>
                <tr>
                  <th>{t("col_no")}</th>
                  <th>{t("col_mahalla")}</th>
                  <th>{t("col_supplier")}</th>
                  <th>{t("col_number")}</th>
                  <th>{t("col_item")}</th>
                  <th className="text-right">{t("col_qty")}</th>
                  <th className="text-right">{t("col_accepted")}</th>
                  <th className="text-right">{t("col_remaining")}</th>
                  <th>{t("col_state")}</th>
                  <th>{t("col_submitted")}</th>
                  <th>{t("col_due")}</th>
                  <th>{t("col_late")}</th>
                  {has("executor_name") && <th>{t("col_executor")}</th>}
                  {has("act_numbers") && <th>{t("col_acts")}</th>}
                  {has("last_delivery_date") && <th>{t("col_delivered_on")}</th>}
                  {has("accepted_on") && <th>{t("journey_execution")}</th>}
                  {has("address") && <th>{t("col_address")}</th>}
                  {has("lat") && <th>{t("col_coords")}</th>}
                </tr>
              </thead>
              <tbody>
                {(data?.results ?? []).map((r) => (
                  <tr key={r.line_id}>
                    <td className="ym-muted">{r.row_no}</td>
                    <td>{r.mahalla}<div className="ym-muted text-[11px]">{r.region} · {r.district}</div></td>
                    <td>{r.supplier}<div className="ym-muted text-[11px]">{r.route_cyr}</div></td>
                    <td className="whitespace-nowrap"><Link to={YASHIL_ROUTES.order(r.order_id)} className="font-semibold text-[var(--ym-green-dark)] hover:underline">{r.number ?? "—"}</Link><div className="ym-muted text-[11px] max-w-[220px] truncate" title={r.title}>{r.title}</div></td>
                    <td>{r.item}</td>
                    <td className="text-right whitespace-nowrap">{r.qty} <span className="ym-muted">{r.unit_cyr}</span></td>
                    <td className="text-right">{r.accepted_qty}</td>
                    <td className="text-right">{r.remaining_qty}</td>
                    <td><StateBadge state={r.state} />{r.responsible_cyr && <div className="ym-muted text-[11px]">{r.responsible_cyr}</div>}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.first_submitted_on)}{r.last_submitted_on && r.first_submitted_on !== r.last_submitted_on && <div className="ym-muted text-[11px]">{t("col_resubmitted")}: {fmtDate(r.last_submitted_on)}</div>}</td>
                    <td className="whitespace-nowrap text-[12px]">{r.review_due && <div>{t("review_due")}: {fmtDate(r.review_due)}</div>}{r.delivery_due && <div>{t("delivery_due")}: {fmtDate(r.delivery_due)}</div>}{!r.review_due && !r.delivery_due && "—"}</td>
                    <td><LateCell row={r} /></td>
                    {has("executor_name") && <td>{r.executor_name || "—"}</td>}
                    {has("act_numbers") && <td className="whitespace-nowrap">{r.act_numbers || "—"}</td>}
                    {has("last_delivery_date") && <td>{fmtDate(r.last_delivery_date)}</td>}
                    {has("accepted_on") && <td>{fmtDate(r.accepted_on)}</td>}
                    {has("address") && <td className="max-w-[240px]">{r.address || "—"}</td>}
                    {has("lat") && <td className="whitespace-nowrap text-[12px]">{r.lat && r.lon ? `${r.lat}, ${r.lon}` : "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="ym-muted">{data ? `${data.count} ${t("summary_lines").toLowerCase()}` : ""}</span>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" className="ym-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              <span className="ym-muted">{page} / {pages}</span>
              <button type="button" className="ym-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </div>
      </div>

      {summary && summary.by_item.length > 0 && (
        <div className="ym-card space-y-2">
          <h3 className="font-semibold">{t("summary_by_item")}</h3>
          <div className="overflow-auto">
            <table className="ym-table text-[13px]">
              <thead><tr><th>{t("col_item")}</th><th className="text-right">{t("col_ordered_qty")}</th><th className="text-right">{t("col_accepted")}</th><th className="text-right">{t("col_remaining")}</th><th className="text-right">{t("summary_orders")}</th></tr></thead>
              <tbody>
                {summary.by_item.map((i) => (
                  <tr key={i.item_code}><td>{i.item}</td><td className="text-right">{i.ordered} <span className="ym-muted">{i.unit_cyr}</span></td><td className="text-right">{i.accepted}</td><td className="text-right">{i.remaining}</td><td className="text-right">{i.orders}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="ym-card space-y-2"><p className="text-xs ym-muted">{t("export_note")}</p><RecentExports /></div>
    </>
  );
}

function ActsTab() {
  const { t } = useYashilT();
  const f = useReportFilters();
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get("page") || 1));
  const [status, setStatus] = useState("");
  const params = useMemo(() => {
    const { state: _s, overdue: _o, ...rest } = f.params;
    void _s; void _o;
    return { ...rest, status: status || undefined, page, per_page: 20 };
  }, [f.params, status, page]);
  const { data, isFetching } = useGetYashilActsQuery(params);
  const pages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;
  const setPage = (p: number) => { const next = new URLSearchParams(sp); next.set("page", String(p)); setSp(next, { replace: true }); };
  const exportFilters = useMemo(() => { const { state: _s, overdue: _o, ...rest } = f.params; void _s; void _o; return { ...rest, status: status || undefined }; }, [f.params, status]);
  return (
    <>
      <div className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RouteTabs f={f} />
          <div className="flex flex-wrap items-center gap-2">
            <select className="ym-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("col_status")}>
              <option value="">{t("filter_all")}</option>
              {(["draft", "mahalla_review", "approved", "returned", "cancelled"] as const).map((s) => <option key={s} value={s}>{t(`act_status_${s}` as YashilKey)}</option>)}
            </select>
            <ExportMenu kind="acts" filters={exportFilters} disabled={!data || data.count === 0} />
          </div>
        </div>
        <ReportFilterBar f={f} withState={false} withOverdue={false} />
        <p className="text-xs ym-muted">{t("period_delivered")}</p>
      </div>
      <div className="ym-card space-y-3">
        {data && data.results.length === 0 && !isFetching ? <p className="ym-muted text-sm py-6 text-center">{t("empty")}</p> : (
          <div className="overflow-auto">
            <table className="ym-table text-[13px]">
              <thead><tr><th>{t("col_number")}</th><th>{t("col_status")}</th><th>{t("col_mahalla")}</th><th>{t("col_supplier")}</th><th>{t("col_delivered_on")}</th><th>{t("col_date")}</th></tr></thead>
              <tbody>
                {(data?.results ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap"><Link to={YASHIL_ROUTES.act(a.id)} className="font-semibold text-[var(--ym-green-dark)] hover:underline">{a.number}</Link><div className="ym-muted text-[11px]">v{a.version_no}{a.is_partial ? ` · ${t("partial_badge")}` : ""}</div></td>
                    <td><ActStatusBadge status={a.status} /></td>
                    <td>{a.order.mahalla_name}<div className="ym-muted text-[11px]">{a.order.number}</div></td>
                    <td>{a.order.supplier_name}</td>
                    <td>{fmtDate(a.delivery_date)}</td>
                    <td className="ym-muted whitespace-nowrap">{fmtDateTime(a.approved_at || a.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <button type="button" className="ym-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            <span className="ym-muted">{page} / {pages}</span>
            <button type="button" className="ym-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>
    </>
  );
}

function ReportsPage() {
  const { t } = useYashilT();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "acts" ? "acts" : "registry";
  const setTab = (v: "registry" | "acts") => { const next = new URLSearchParams(sp); if (v === "acts") next.set("tab", "acts"); else next.delete("tab"); next.delete("page"); setSp(next, { replace: true }); };
  return (
    <YashilLayout
      title={t("reports_title")}
      actions={(
        <div className="inline-flex rounded-[10px] overflow-hidden border border-[var(--ym-border)]" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "registry"} className={`ym-btn !border-0 !rounded-none ${tab === "registry" ? "ym-btn--active" : ""}`} onClick={() => setTab("registry")}>{t("tab_registry")}</button>
          <button type="button" role="tab" aria-selected={tab === "acts"} className={`ym-btn !border-0 !rounded-none ${tab === "acts" ? "ym-btn--active" : ""}`} onClick={() => setTab("acts")}>{t("tab_acts_registry")}</button>
        </div>
      )}
    >
      {tab === "acts" ? <ActsTab /> : <RegistryTab />}
    </YashilLayout>
  );
}

export default ReportsPage;
