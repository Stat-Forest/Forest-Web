/**
 * Статистика (TZ §15.1–15.3): kartalar (unikal buyurtma; muddati buzilgan alohida),
 * ko'chatlar farqi (tur kesimida, «тасдиқ кутилмоқда» alohida), orqada qolayotgan tashkilotlar.
 */
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, ListChecks, RotateCcw, Sprout, XCircle, Inbox } from "lucide-react";
import YashilLayout from "../YashilLayout";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { StatsCards } from "@/features/yashil/types";
import { useGetYashilStatsCardsQuery, useGetYashilStatsOrganizationsQuery, useGetYashilStatsSeedlingsQuery } from "@/services/yashilApi";
import { ReportFilterBar, RouteTabs, useReportFilters } from "../Reports/ReportFilters";

interface Card {
  key: keyof StatsCards;
  label: YashilKey;
  icon: ReactElement;
  sub?: (c: StatsCards, t: (k: YashilKey) => string) => string;
  states?: string;
  red?: boolean;
}

const CARDS: Card[] = [
  { key: "total", label: "stat_total", icon: <ListChecks size={18} />, states: "" },
  { key: "new", label: "stat_new", icon: <Inbox size={18} />, sub: (c, t) => `${t("stat_union")} ${c.new_union} · ${t("stat_supplier")} ${c.new_supplier}`, states: "union_new,supplier_new" },
  { key: "reviewing", label: "stat_reviewing", icon: <Clock size={18} />, sub: (c, t) => `${t("stat_union")} ${c.reviewing_union} · ${t("stat_supplier")} ${c.reviewing_supplier}`, states: "union_review,supplier_review" },
  { key: "reviewed", label: "stat_reviewed", icon: <Sprout size={18} />, sub: (c, t) => `${t("state_execution")} ${c.execution} · ${t("state_partial")} ${c.partial}`, states: "execution,partial" },
  { key: "done", label: "stat_done", icon: <CheckCircle2 size={18} />, states: "closed" },
  { key: "returned", label: "stat_returned", icon: <RotateCcw size={18} />, states: "returned" },
  { key: "cancelled", label: "stat_cancelled", icon: <XCircle size={18} />, states: "cancelled" },
  { key: "overdue", label: "stat_overdue", icon: <AlertTriangle size={18} />, sub: (c, t) => `${t("stat_review_stage")} ${c.overdue_review} · ${t("stat_delivery_stage")} ${c.overdue_delivery}`, red: true },
];

export function StatCards({ cards, compact }: { cards: StatsCards | undefined; compact?: boolean }) {
  const { t } = useYashilT();
  const list = compact ? CARDS.filter((c) => ["total", "reviewing", "reviewed", "done", "overdue"].includes(c.key)) : CARDS;
  return (
    <section className={`grid grid-cols-2 gap-3 ${compact ? "lg:grid-cols-5" : "md:grid-cols-4"}`}>
      {list.map((c) => {
        const value = cards ? (cards[c.key] as number) : "—";
        const inner = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] ym-muted">{t(c.label)}</span>
              <span className={`ym-stat-icon ${c.red ? "!bg-[var(--ym-red-bg)] !text-[var(--ym-red)]" : ""}`} aria-hidden="true">{c.icon}</span>
            </div>
            <strong className={c.red && cards && cards.overdue > 0 ? "!text-[var(--ym-red)]" : ""}>{value}<small>{t("orders_count_unit")}</small></strong>
            {cards && c.sub && <div className="text-[11px] ym-muted mt-1">{c.sub(cards, t)}</div>}
            {c.red && <div className="text-[11px] ym-muted mt-1">{t("stat_overdue_note")}</div>}
          </>
        );
        const to = c.red ? `${YASHIL_ROUTES.reports}?overdue=1` : c.states !== undefined ? `${YASHIL_ROUTES.reports}${c.states ? `?state=${c.states}` : ""}` : null;
        return to ? <Link key={c.key} to={to} className="ym-stat block hover:border-[var(--ym-green-line)]">{inner}</Link> : <div key={c.key} className="ym-stat">{inner}</div>;
      })}
    </section>
  );
}

function Bar({ value, max, red }: { value: string; max: number; red?: boolean }) {
  const v = Number(value) || 0;
  const w = max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded bg-[var(--ym-bg)] overflow-hidden" aria-hidden="true">
      <div className="h-full" style={{ width: `${w}%`, background: red ? "var(--ym-red)" : "var(--ym-green)" }} />
    </div>
  );
}

function StatsPage() {
  const { t } = useYashilT();
  const f = useReportFilters();
  const { data: cards } = useGetYashilStatsCardsQuery(f.params);
  const { data: seeds } = useGetYashilStatsSeedlingsQuery(f.params);
  const { data: orgs } = useGetYashilStatsOrganizationsQuery(f.params);
  const maxOrdered = Math.max(0, ...(seeds?.items ?? []).map((i) => Number(i.ordered) || 0));

  return (
    <YashilLayout title={t("stats_title")}>
      <div className="ym-card space-y-3">
        <RouteTabs f={f} />
        <ReportFilterBar f={f} withState={false} withOverdue={false} withSearch={false} />
        {cards?.filters_label && <p className="text-xs ym-muted">{cards.filters_label}</p>}
      </div>

      <StatCards cards={cards} />

      <section className="ym-card space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{t("seedlings_title")}</h3>
          <p className="text-xs ym-muted">{t("seedlings_note")}</p>
        </div>
        {seeds && seeds.items.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : (
          <div className="overflow-auto">
            <table className="ym-table text-[13px]">
              <thead>
                <tr><th>{t("col_item")}</th><th className="min-w-[160px]"></th><th className="text-right">{t("col_ordered_qty")}</th><th className="text-right">{t("col_accepted")}</th><th className="text-right">{t("col_pending")}</th><th className="text-right">{t("col_returned_open")}</th><th className="text-right">{t("col_diff")}</th></tr>
              </thead>
              <tbody>
                {(seeds?.items ?? []).map((r) => (
                  <tr key={r.item_code}>
                    <td>{r.item}<div className="ym-muted text-[11px]">{r.orders} {t("orders_count_unit")}</div></td>
                    <td><Bar value={r.accepted} max={Number(r.ordered) || maxOrdered} /><div className="text-[11px] ym-muted mt-1">{r.ordered !== "0" ? `${Math.round((Number(r.accepted) / Number(r.ordered)) * 100)}%` : "—"}</div></td>
                    <td className="text-right whitespace-nowrap">{r.ordered} <span className="ym-muted">{r.unit_cyr}</span></td>
                    <td className="text-right">{r.accepted}</td>
                    <td className="text-right"><span className={Number(r.pending) ? "ym-badge ym-badge--amber" : ""}>{r.pending}</span></td>
                    <td className="text-right">{r.returned_open}</td>
                    <td className="text-right font-semibold">{r.diff}</td>
                  </tr>
                ))}
                {seeds && seeds.items.length > 0 && (
                  <tr className="font-semibold">
                    <td>{t("col_total_row")}</td><td></td>
                    <td className="text-right">{seeds.totals.ordered}</td><td className="text-right">{seeds.totals.accepted}</td>
                    <td className="text-right">{seeds.totals.pending}</td><td className="text-right">{seeds.totals.returned_open}</td><td className="text-right">{seeds.totals.diff}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ym-card space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{t("orgs_title")}</h3>
          <p className="text-xs ym-muted">{t("orgs_note")}</p>
        </div>
        {orgs && orgs.results.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : (
          <div className="overflow-auto">
            <table className="ym-table text-[13px]">
              <thead>
                <tr><th>{t("col_org")}</th><th className="text-right">{t("col_total")}</th><th className="text-right">{t("col_in_progress")}</th><th className="text-right">{t("col_done")}</th><th className="text-right">{t("col_review_late")}</th><th className="text-right">{t("col_delivery_late")}</th><th className="text-right">{t("col_max_late")}</th><th className="text-right">{t("col_done_pct")}</th></tr>
              </thead>
              <tbody>
                {(orgs?.results ?? []).map((r) => (
                  <tr key={`${r.kind}-${r.id}`}>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.name}</span>
                        {r.has_late && <span className="ym-badge ym-badge--red">{t("has_late")}</span>}
                      </div>
                      <div className="ym-muted text-[11px]">{t(r.kind === "union" ? "org_kind_union" : "org_kind_supplier")}</div>
                    </td>
                    <td className="text-right">{r.total}</td>
                    <td className="text-right">{r.in_progress}</td>
                    <td className="text-right">{r.done}</td>
                    <td className={`text-right ${r.review_late ? "text-[var(--ym-red)] font-semibold" : ""}`}>{r.review_late}</td>
                    <td className={`text-right ${r.delivery_late ? "text-[var(--ym-red)] font-semibold" : ""}`}>{r.delivery_late}</td>
                    <td className="text-right whitespace-nowrap">{r.max_late_days ? `${r.max_late_days} ${t("workdays_short")}` : "—"}</td>
                    <td className="text-right">{r.done_pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </YashilLayout>
  );
}

export default StatsPage;
