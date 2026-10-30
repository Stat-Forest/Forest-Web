/**
 * Biriktirishlar (javoblar A2–A4): mahalla → o'rmon xo'jaligi, mahalla → uyushma bo'linmasi (amal davri bilan),
 * uyushma bo'linmalari, yetkazib beruvchi profillari (tashkilotni yetkazib beruvchi qilish, DM xizmat hududi).
 * Eski biriktirish o'chirilmaydi — «Муддатни ёпиш» bilan yopiladi, yangisi keyingi kundan ochiladi.
 */
import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import type { AdminAssignment, AdminOrgHit, AdminRoute, AdminSupplier, AdminUnionUnit, SupplierType } from "@/features/yashil/types";
import {
  useGetYashilAdminAssignmentsQuery,
  useGetYashilAdminMahallasQuery,
  useGetYashilAdminRoutesQuery,
  useGetYashilAdminSuppliersQuery,
  useGetYashilAdminUnionUnitsQuery,
  useGetYashilDistrictsQuery,
  useGetYashilRegionsQuery,
  useLazySearchYashilAdminOrgsQuery,
  useSaveYashilAdminAssignmentMutation,
  useSaveYashilAdminRouteMutation,
  useSaveYashilAdminSupplierMutation,
  useSaveYashilAdminUnionUnitMutation,
} from "@/services/yashilApi";
import { todayIso } from "../Orders/orderUi";
import { ActiveBadge, FormDialog, Pager, inputCls, periodText, useSave } from "./adminUi";
import { ImportDialog } from "./ImportDialog";

type Sub = "forest" | "routes" | "units" | "suppliers";
const SUBS: { key: Sub; label: YashilKey }[] = [
  { key: "forest", label: "links_forest" }, { key: "routes", label: "links_routes" },
  { key: "units", label: "links_units" }, { key: "suppliers", label: "links_suppliers" },
];
const PER_PAGE = 25;

function MahallaPicker({ value, onChange, bad }: { value: string; onChange: (id: string) => void; bad?: boolean }) {
  const { t } = useYashilT();
  const [q, setQ] = useState("");
  const { data } = useGetYashilAdminMahallasQuery({ q: q || undefined, per_page: 20 });
  return (
    <label className="text-sm block">{t("col_mahalla")} *
      <input className="ym-select w-full mt-1" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <select className={inputCls(!!bad)} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {(data?.results ?? []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.source_code || m.district.name})</option>)}
      </select>
    </label>
  );
}

/** Biriktirish / marshrut: yangi — mahalla + tashkilot/bo'linma + boshlanish; tahrir — faqat tugash sanasi va asos. */
function PeriodLinkDialog({ kind, edit, onClose }: { kind: "forest" | "routes"; edit: AdminAssignment | AdminRoute | null; onClose: () => void }) {
  const { t } = useYashilT();
  const [saveA, { isLoading: a }] = useSaveYashilAdminAssignmentMutation();
  const [saveR, { isLoading: r }] = useSaveYashilAdminRouteMutation();
  const { error, field, run } = useSave();
  const { data: suppliers } = useGetYashilAdminSuppliersQuery({ supplier_type: "forest" }, { skip: !!edit || kind !== "forest" });
  const { data: units } = useGetYashilAdminUnionUnitsQuery(undefined, { skip: !!edit || kind !== "routes" });
  const [mahalla, setMahalla] = useState("");
  const [target, setTarget] = useState("");
  const [validFrom, setValidFrom] = useState(todayIso());
  const [validTo, setValidTo] = useState(edit?.valid_to ?? "");
  const [sourceDoc, setSourceDoc] = useState(edit?.source_doc ?? "");
  const submit = () => {
    const common = { valid_to: validTo || null, source_doc: sourceDoc };
    if (kind === "forest") {
      const body = edit ? common : { ...common, mahalla, organization: target, valid_from: validFrom };
      return run(() => saveA({ id: edit?.id, body }).unwrap(), onClose);
    }
    const body = edit ? common : { ...common, mahalla, union_unit: target, valid_from: validFrom };
    return run(() => saveR({ id: edit?.id, body }).unwrap(), onClose);
  };
  const title = `${t(kind === "forest" ? "links_forest" : "links_routes")}${edit ? ` — ${edit.mahalla_name}` : ""}`;
  return (
    <FormDialog title={title} open onClose={onClose} onSave={submit} saving={a || r} disabled={!edit && (!mahalla || !target || !validFrom)} error={error}>
      {!edit && (
        <>
          <MahallaPicker value={mahalla} onChange={setMahalla} bad={field === "mahalla"} />
          <label className="text-sm block">{kind === "forest" ? t("member_type_supplier") : t("member_type_union")} *
            <select className={inputCls(field === "organization" || field === "union_unit")} value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">—</option>
              {kind === "forest"
                ? (suppliers?.results ?? []).filter((s) => s.is_active_supplier).map((s) => <option key={s.id} value={s.organization}>{s.organization_name}</option>)
                : (units?.results ?? []).filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        </>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {!edit && <label className="text-sm block">{t("valid_from")} *<input type="date" className={inputCls(field === "valid_from")} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>}
        <label className="text-sm block">{t("valid_to")}<input type="date" className={inputCls(field === "valid_to" || field === "__all__")} value={validTo ?? ""} onChange={(e) => setValidTo(e.target.value)} /></label>
      </div>
      <label className="text-sm block">{t("import_source")}<input className={inputCls(field === "source_doc")} value={sourceDoc} maxLength={200} onChange={(e) => setSourceDoc(e.target.value)} /></label>
    </FormDialog>
  );
}

function PeriodLinks({ kind }: { kind: "forest" | "routes" }) {
  const { t } = useYashilT();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ edit: AdminAssignment | AdminRoute | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const params = useMemo(() => ({ q: q || undefined, page, per_page: PER_PAGE }), [q, page]);
  const forest = useGetYashilAdminAssignmentsQuery(params, { skip: kind !== "forest" });
  const routes = useGetYashilAdminRoutesQuery(params, { skip: kind !== "routes" });
  const data = kind === "forest" ? forest.data : routes.data;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input className="ym-select" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t("search")} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ym-btn" onClick={() => setImporting(true)}>{t("import_excel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={() => setDialog({ edit: null })}>{t("add_new")}</button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="ym-table text-[13px]">
          <thead><tr><th>{t("col_mahalla")}</th><th>{kind === "forest" ? t("member_type_supplier") : t("member_type_union")}</th><th>{t("col_period")}</th><th>{t("col_source")}</th><th>{t("col_status")}</th><th></th></tr></thead>
          <tbody>
            {(data?.results ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.mahalla_name}</td>
                <td>{"organization_name" in row ? row.organization_name : (row as AdminRoute).union_unit_name}</td>
                <td className="whitespace-nowrap">{periodText(row.valid_from, row.valid_to)}</td>
                <td>{row.source_doc || "—"}</td>
                <td><ActiveBadge active current={row.is_current} /></td>
                <td><button type="button" className="ym-btn" onClick={() => setDialog({ edit: row })}>{t("close_period")}</button></td>
              </tr>
            ))}
            {data && data.results.length === 0 && <tr><td colSpan={6} className="ym-muted text-center">{t("empty")}</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} count={data?.count ?? 0} perPage={PER_PAGE} onPage={setPage} />
      {dialog && <PeriodLinkDialog kind={kind} edit={dialog.edit} onClose={() => setDialog(null)} />}
      {importing && <ImportDialog kind={kind === "forest" ? "assignments" : "routes"} withSource title={`${t(kind === "forest" ? "links_forest" : "links_routes")} — ${t("import_excel")}`} onClose={() => setImporting(false)} />}
    </>
  );
}

const LEVELS: AdminUnionUnit["level"][] = ["district", "region", "republic"];

function UnitDialog({ edit, onClose }: { edit: AdminUnionUnit | null; onClose: () => void }) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilAdminUnionUnitMutation();
  const { error, field, run } = useSave();
  const { data: regions } = useGetYashilRegionsQuery();
  const { data: units } = useGetYashilAdminUnionUnitsQuery();
  const [form, setForm] = useState({ name: edit?.name ?? "", level: edit?.level ?? "district", region: edit?.region ?? "", district: edit?.district ?? "",
    parent: edit?.parent ?? "", stir: edit?.stir ?? "", is_active: edit?.is_active ?? true });
  const { data: districts } = useGetYashilDistrictsQuery(form.region ? { region: form.region } : skipToken);
  const submit = () => run(() => save({ id: edit?.id, body: { ...form, region: form.region || null, district: form.district || null, parent: form.parent || null } }).unwrap(), onClose);
  return (
    <FormDialog title={edit ? `${t("edit")}: ${edit.name}` : `${t("links_units")} — ${t("add_new")}`} open onClose={onClose} onSave={submit} saving={isLoading} disabled={!form.name} error={error}>
      <label className="text-sm block">{t("col_name")} *<input className={inputCls(field === "name")} value={form.name} maxLength={300} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm block">{t("col_level")}
          <select className={inputCls(field === "level")} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as AdminUnionUnit["level"] })}>
            {LEVELS.map((l) => <option key={l} value={l}>{t(`level_${l}` as YashilKey)}</option>)}
          </select>
        </label>
        <label className="text-sm block">{t("stir")}<input className={inputCls(field === "stir")} value={form.stir} maxLength={9} onChange={(e) => setForm({ ...form, stir: e.target.value })} /></label>
        <label className="text-sm block">{t("filter_region")}
          <select className={inputCls(field === "region")} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value, district: "" })}>
            <option value="">—</option>
            {(regions ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="text-sm block">{t("filter_district")}
          <select className={inputCls(field === "district")} value={form.district} disabled={!form.region} onChange={(e) => setForm({ ...form, district: e.target.value })}>
            <option value="">—</option>
            {(districts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="text-sm block">{t("col_parent")}
          <select className={inputCls(field === "parent")} value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
            <option value="">—</option>
            {(units?.results ?? []).filter((u) => u.id !== edit?.id && u.level !== "district").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-sm min-h-[40px] self-end"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />{t("status_active")}</label>
      </div>
    </FormDialog>
  );
}

function Units() {
  const { t } = useYashilT();
  const { data } = useGetYashilAdminUnionUnitsQuery();
  const [dialog, setDialog] = useState<{ edit: AdminUnionUnit | null } | null>(null);
  return (
    <>
      <div className="flex justify-end"><button type="button" className="ym-btn ym-btn--primary" onClick={() => setDialog({ edit: null })}>{t("add_new")}</button></div>
      <div className="overflow-auto">
        <table className="ym-table text-[13px]">
          <thead><tr><th>{t("col_name")}</th><th>{t("col_level")}</th><th>{t("col_region")}</th><th>{t("admin_tab_mahallas")}</th><th>{t("col_status")}</th><th></th></tr></thead>
          <tbody>
            {(data?.results ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.stir && <div className="ym-muted text-[11px]">{t("stir")} {u.stir}</div>}</td>
                <td>{t(`level_${u.level}` as YashilKey)}</td>
                <td>{u.region_name || "—"}<div className="ym-muted text-[11px]">{u.district_name}</div></td>
                <td>{u.mahallas}</td>
                <td><ActiveBadge active={u.is_active} /></td>
                <td><button type="button" className="ym-btn" onClick={() => setDialog({ edit: u })}>{t("edit")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog && <UnitDialog edit={dialog.edit} onClose={() => setDialog(null)} />}
    </>
  );
}

function SupplierDialog({ edit, onClose }: { edit: AdminSupplier | null; onClose: () => void }) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilAdminSupplierMutation();
  const { error, field, run } = useSave();
  const { data: regions } = useGetYashilRegionsQuery();
  const { data: dms } = useGetYashilAdminSuppliersQuery({ supplier_type: "dm" });
  const [q, setQ] = useState("");
  const [org, setOrg] = useState<AdminOrgHit | null>(null);
  const [search, { data: hits }] = useLazySearchYashilAdminOrgsQuery();
  const [form, setForm] = useState({ supplier_type: (edit?.supplier_type ?? "forest") as SupplierType, parent: edit?.parent ?? "", official_name: edit?.official_name ?? "",
    stir: edit?.stir ?? "", is_active_supplier: edit?.is_active_supplier ?? true, service_regions: edit?.service_regions ?? [] as string[] });
  useEffect(() => {
    if (q.trim().length >= 2) {
      const h = setTimeout(() => search(q.trim()), 300);
      return () => clearTimeout(h);
    }
  }, [q, search]);
  const submit = () => {
    const body = { parent: form.parent || null, official_name: form.official_name, stir: form.stir, is_active_supplier: form.is_active_supplier,
      service_regions: form.service_regions, ...(edit ? {} : { organization: org?.id, supplier_type: form.supplier_type }) };
    run(() => save({ id: edit?.id, body }).unwrap(), onClose);
  };
  const toggleRegion = (id: string) => setForm({ ...form, service_regions: form.service_regions.includes(id) ? form.service_regions.filter((x) => x !== id) : [...form.service_regions, id] });
  const isDm = form.supplier_type === "dm";
  return (
    <FormDialog title={edit ? edit.organization_name : t("supplier_new")} open onClose={onClose} onSave={submit} saving={isLoading} disabled={!edit && !org} error={error} wide>
      {!edit && (
        <>
          <label className="text-sm block">{t("find_org")} *
            <input className={inputCls(field === "organization")} value={org ? org.name : q} onChange={(e) => { setOrg(null); setQ(e.target.value); }} placeholder={t("min_two_chars")} />
          </label>
          {!org && q.trim().length >= 2 && (hits?.results ?? []).length > 0 && (
            <ul className="ym-card !p-2 max-h-40 overflow-auto text-sm">
              {hits!.results.map((o) => (
                <li key={o.id}><button type="button" disabled={o.is_supplier} className="w-full text-left px-2 py-1 rounded hover:bg-[var(--ym-green-soft)] disabled:opacity-50" onClick={() => setOrg(o)}>
                  {o.name} <span className="ym-muted">({o.region}{o.is_supplier ? ` · ${t("member_type_supplier")}` : ""})</span>
                </button></li>
              ))}
            </ul>
          )}
          <label className="text-sm block">{t("col_type")}
            <select className={inputCls(field === "supplier_type")} value={form.supplier_type} onChange={(e) => setForm({ ...form, supplier_type: e.target.value as SupplierType })}>
              <option value="forest">{t("tab_route_forest")}</option>
              <option value="dm">{t("tab_route_dm")}</option>
            </select>
          </label>
        </>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm block">{t("col_name")} {t("name_official_suffix")}<input className={inputCls(field === "official_name")} value={form.official_name} maxLength={300} onChange={(e) => setForm({ ...form, official_name: e.target.value })} /></label>
        <label className="text-sm block">{t("stir")}<input className={inputCls(field === "stir")} value={form.stir} maxLength={9} onChange={(e) => setForm({ ...form, stir: e.target.value })} /></label>
        {isDm && (
          <label className="text-sm block">{t("col_parent")}
            <select className={inputCls(field === "parent")} value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
              <option value="">—</option>
              {(dms?.results ?? []).filter((d) => d.id !== edit?.id && !d.parent).map((d) => <option key={d.id} value={d.id}>{d.organization_name}</option>)}
            </select>
          </label>
        )}
        <label className="inline-flex items-center gap-2 text-sm min-h-[40px] self-end"><input type="checkbox" checked={form.is_active_supplier} onChange={(e) => setForm({ ...form, is_active_supplier: e.target.checked })} />{t("status_active")}</label>
      </div>
      {isDm && (
        <fieldset className="text-sm">
          <legend className="mb-1">{t("col_regions")}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(regions ?? []).map((r) => <label key={r.id} className="inline-flex items-center gap-1"><input type="checkbox" checked={form.service_regions.includes(r.id)} onChange={() => toggleRegion(r.id)} />{r.name}</label>)}
          </div>
        </fieldset>
      )}
    </FormDialog>
  );
}

function Suppliers() {
  const { t } = useYashilT();
  const { data: regions } = useGetYashilRegionsQuery();
  const { data } = useGetYashilAdminSuppliersQuery();
  const [dialog, setDialog] = useState<{ edit: AdminSupplier | null } | null>(null);
  const regionName = (id: string) => regions?.find((r) => r.id === id)?.name ?? "";
  return (
    <>
      <div className="flex justify-end"><button type="button" className="ym-btn ym-btn--primary" onClick={() => setDialog({ edit: null })}>{t("supplier_new")}</button></div>
      <div className="overflow-auto">
        <table className="ym-table text-[13px]">
          <thead><tr><th>{t("col_org")}</th><th>{t("col_type")}</th><th>{t("col_regions")}</th><th>{t("col_members")}</th><th>{t("col_status")}</th><th></th></tr></thead>
          <tbody>
            {(data?.results ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.organization_name}{s.stir && <div className="ym-muted text-[11px]">{t("stir")} {s.stir}</div>}</td>
                <td>{t(s.supplier_type === "dm" ? "tab_route_dm" : "tab_route_forest")}</td>
                <td className="max-w-[260px]">{s.supplier_type === "dm" ? (s.service_regions.map(regionName).join(", ") || t("republic_short")) : "—"}</td>
                <td>{s.members}</td>
                <td><ActiveBadge active={s.is_active_supplier} /></td>
                <td><button type="button" className="ym-btn" onClick={() => setDialog({ edit: s })}>{t("edit")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog && <SupplierDialog edit={dialog.edit} onClose={() => setDialog(null)} />}
    </>
  );
}

export function LinksTab() {
  const { t } = useYashilT();
  const [sub, setSub] = useState<Sub>("forest");
  return (
    <div className="ym-card space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist">
        {SUBS.map((s) => (
          <button key={s.key} type="button" role="tab" aria-selected={sub === s.key} className={`ym-btn ${sub === s.key ? "ym-btn--active" : ""}`} onClick={() => setSub(s.key)}>{t(s.label)}</button>
        ))}
      </div>
      {sub === "forest" && <PeriodLinks kind="forest" />}
      {sub === "routes" && <PeriodLinks kind="routes" />}
      {sub === "units" && <Units />}
      {sub === "suppliers" && <Suppliers />}
    </div>
  );
}
