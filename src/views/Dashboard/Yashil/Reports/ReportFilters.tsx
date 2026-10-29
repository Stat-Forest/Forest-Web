/**
 * Hisobot / statistika / xarita uchun umumiy filtrlar (TZ §14.2, §15.4).
 * Holat URL `?` parametrlarida — sahifalar o'rtasida (reestr → statistika → xarita) saqlanadi.
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import type { PeriodBasis, ReportFilterParams, SupplierType } from "@/features/yashil/types";
import {
  useGetYashilDistrictsQuery,
  useGetYashilMahallasQuery,
  useGetYashilRegionsQuery,
  useGetYashilReportFiltersQuery,
} from "@/services/yashilApi";

const KEYS = ["period_basis", "date_from", "date_to", "region", "district", "mahalla", "supplier_org", "route", "catalog_item", "state", "overdue", "q"] as const;
type Key = (typeof KEYS)[number];

export interface ReportFiltersState {
  /** Backend'ga ketadigan parametrlar (bo'shlar tashlab yuborilgan). */
  params: ReportFilterParams;
  get: (k: Key) => string;
  set: (patch: Partial<Record<Key, string | undefined>>) => void;
  reset: () => void;
  /** Faol filtrlar soni (yo'nalish va davr asosi hisobga kirmaydi). */
  activeCount: number;
}

export function useReportFilters(): ReportFiltersState {
  const [sp, setSp] = useSearchParams();
  const get = useCallback((k: Key) => sp.get(k) ?? "", [sp]);
  const set = useCallback(
    (patch: Partial<Record<Key, string | undefined>>) => {
      const next = new URLSearchParams(sp);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      next.delete("page");
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );
  const reset = useCallback(() => {
    const next = new URLSearchParams();
    const route = sp.get("route");
    if (route) next.set("route", route);
    setSp(next, { replace: true });
  }, [sp, setSp]);
  const params = useMemo<ReportFilterParams>(() => {
    const p: ReportFilterParams = {};
    const basis = sp.get("period_basis");
    if (basis) p.period_basis = basis as PeriodBasis;
    (["date_from", "date_to", "region", "district", "mahalla", "supplier_org", "catalog_item", "state", "q"] as const).forEach((k) => {
      const v = sp.get(k);
      if (v) (p as Record<string, string>)[k] = v;
    });
    const route = sp.get("route");
    if (route === "forest" || route === "dm") p.route = route;
    if (sp.get("overdue") === "1") p.overdue = true;
    return p;
  }, [sp]);
  const activeCount = KEYS.filter((k) => k !== "route" && k !== "period_basis" && sp.get(k)).length;
  return { params, get, set, reset, activeCount };
}

const PERIOD_KEY: Record<PeriodBasis, YashilKey> = { submitted: "period_submitted", accepted: "period_accepted", delivered: "period_delivered" };

/** Yo'nalish tab'lari: Умумий / Ўрмон / ДМ (yetkazib beruvchida ko'rinmaydi — bitta yo'nalish). */
export function RouteTabs({ f }: { f: ReportFiltersState }) {
  const { t } = useYashilT();
  const { cabinet } = useYashilAccess();
  if (cabinet?.member_type === "supplier") return null;
  const route = f.get("route");
  const tabs: { v: SupplierType | ""; k: YashilKey }[] = [{ v: "", k: "tab_route_all" }, { v: "forest", k: "tab_route_forest" }, { v: "dm", k: "tab_route_dm" }];
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((tb) => (
        <button key={tb.v || "all"} type="button" role="tab" aria-selected={route === tb.v} className={`ym-btn ${route === tb.v ? "ym-btn--active" : ""}`} onClick={() => f.set({ route: tb.v || undefined, catalog_item: undefined })}>
          {t(tb.k)}
        </button>
      ))}
    </div>
  );
}

interface BarProps {
  f: ReportFiltersState;
  /** Holat filtri ko'rsatilsinmi (xaritada faqat qabul qilinganlar — kerak emas). */
  withState?: boolean;
  withOverdue?: boolean;
  withSearch?: boolean;
}

export function ReportFilterBar({ f, withState = true, withOverdue = true, withSearch = true }: BarProps) {
  const { t, script } = useYashilT();
  const { cabinet } = useYashilAccess();
  const isMahalla = cabinet?.member_type === "mahalla";
  const { data: dict } = useGetYashilReportFiltersQuery();
  const { data: regions } = useGetYashilRegionsQuery(undefined, { skip: isMahalla });
  const region = f.get("region");
  const district = f.get("district");
  const { data: districts } = useGetYashilDistrictsQuery(region && !isMahalla ? { region } : skipToken);
  const { data: mahallas } = useGetYashilMahallasQuery(district && !isMahalla ? { district, per_page: 100 } : skipToken);
  const route = f.get("route");
  const items = (dict?.items ?? []).filter((i) => !route || i.supplier_type === route);
  const suppliers = (dict?.suppliers ?? []).filter((s) => !route || s.supplier_type === route);
  const lbl = "text-[11px] ym-muted block";

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 items-end">
      <label className="block">
        <span className={lbl}>{t("filter_period_basis")}</span>
        <select className="ym-select w-full" value={f.get("period_basis") || "submitted"} onChange={(e) => f.set({ period_basis: e.target.value === "submitted" ? undefined : e.target.value })}>
          {(dict?.period_bases ?? [{ value: "submitted" }, { value: "accepted" }, { value: "delivered" }]).map((b) => (
            <option key={b.value} value={b.value}>{t(PERIOD_KEY[b.value as PeriodBasis])}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={lbl}>{t("filter_from")}</span>
        <input type="date" className="ym-select w-full" value={f.get("date_from")} onChange={(e) => f.set({ date_from: e.target.value || undefined })} />
      </label>
      <label className="block">
        <span className={lbl}>{t("filter_to")}</span>
        <input type="date" className="ym-select w-full" value={f.get("date_to")} onChange={(e) => f.set({ date_to: e.target.value || undefined })} />
      </label>
      {!isMahalla && (
        <>
          <label className="block">
            <span className={lbl}>{t("filter_region")}</span>
            <select className="ym-select w-full" value={region} onChange={(e) => f.set({ region: e.target.value || undefined, district: undefined, mahalla: undefined })}>
              <option value="">{t("filter_all")}</option>
              {(regions ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>{t("filter_district")}</span>
            <select className="ym-select w-full" value={district} disabled={!region} onChange={(e) => f.set({ district: e.target.value || undefined, mahalla: undefined })}>
              <option value="">{t("filter_all")}</option>
              {(districts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>{t("filter_mahalla")}</span>
            <select className="ym-select w-full" value={f.get("mahalla")} disabled={!district} onChange={(e) => f.set({ mahalla: e.target.value || undefined })}>
              <option value="">{t("filter_all")}</option>
              {(mahallas?.results ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        </>
      )}
      {cabinet?.member_type !== "supplier" && (
        <label className="block">
          <span className={lbl}>{t("filter_supplier")}</span>
          <select className="ym-select w-full" value={f.get("supplier_org")} onChange={(e) => f.set({ supplier_org: e.target.value || undefined })}>
            <option value="">{t("filter_all")}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <label className="block">
        <span className={lbl}>{t("filter_item")}</span>
        <select className="ym-select w-full" value={f.get("catalog_item")} onChange={(e) => f.set({ catalog_item: e.target.value || undefined })}>
          <option value="">{t("filter_all")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{pickName(i, script)}</option>)}
        </select>
      </label>
      {withState && (
        <label className="block">
          <span className={lbl}>{t("filter_state")}</span>
          <select className="ym-select w-full" value={f.get("state")} onChange={(e) => f.set({ state: e.target.value || undefined })}>
            <option value="">{t("filter_all")}</option>
            {(dict?.states ?? []).map((s) => <option key={s.value} value={s.value}>{t(`state_${s.value}` as YashilKey)}</option>)}
          </select>
        </label>
      )}
      {withSearch && (
        <label className="block">
          <span className={lbl}>{t("search")}</span>
          <input className="ym-select w-full" value={f.get("q")} onChange={(e) => f.set({ q: e.target.value || undefined })} placeholder={t("search")} />
        </label>
      )}
      <div className="flex items-center gap-3 min-h-[40px]">
        {withOverdue && (
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.get("overdue") === "1"} onChange={(e) => f.set({ overdue: e.target.checked ? "1" : undefined })} />
            {t("filter_overdue")}
          </label>
        )}
        {f.activeCount > 0 && (
          <button type="button" className="ym-btn" onClick={f.reset}>{t("filter_reset")} ({f.activeCount})</button>
        )}
      </div>
    </div>
  );
}
