/** Katalog (javob В1–В6): pozitsiyalar, faollik, nom/atribut tahriri (kod o'zgarmaydi), DM xizmat quvvati oy bo'yicha. */
import { useEffect, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import type { AdminCatalogItem, ItemType, SupplierType, Unit } from "@/features/yashil/types";
import { useGetYashilAdminCapacityQuery, useGetYashilAdminCatalogQuery, useGetYashilAdminSuppliersQuery, useSaveYashilAdminCatalogItemMutation } from "@/services/yashilApi";
import { todayIso } from "../Orders/orderUi";
import { ActiveBadge, FormDialog, inputCls, useSave } from "./adminUi";
import { CapacityEditor } from "./CapacityEditor";

const UNITS: Unit[] = ["tup", "dona", "komplekt", "daraxt", "kg", "metr", "ga"];
const CATEGORIES: Record<SupplierType, string[]> = {
  forest: ["seedling", "mulch"],
  dm: ["fertilizer", "equipment", "irrigation", "protection_service"],
};

function ItemDialog({ edit, onClose }: { edit: AdminCatalogItem | null; onClose: () => void }) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilAdminCatalogItemMutation();
  const { error, field, run } = useSave();
  const [form, setForm] = useState({
    code: edit?.code ?? "", name_cyr: edit?.name_cyr ?? "", name_lat: edit?.name_lat ?? "", supplier_type: (edit?.supplier_type ?? "forest") as SupplierType,
    item_type: (edit?.item_type ?? "goods") as ItemType, category: edit?.category ?? "seedling", unit: (edit?.unit ?? "tup") as Unit,
    is_active: edit?.is_active ?? true, order: edit?.order ?? 0, attributes: JSON.stringify(edit?.attributes ?? {}),
  });
  const [attrError, setAttrError] = useState(false);
  const submit = () => {
    let attributes: Record<string, string> = {};
    try { attributes = JSON.parse(form.attributes || "{}"); setAttrError(false); } catch { setAttrError(true); return; }
    const body = edit
      ? { name_cyr: form.name_cyr, name_lat: form.name_lat, category: form.category, is_active: form.is_active, order: Number(form.order) || 0, attributes }
      : { ...form, order: Number(form.order) || 0, attributes, effective_from: todayIso() };
    run(() => save({ id: edit?.id, body: body as Partial<AdminCatalogItem> }).unwrap(), onClose);
  };
  return (
    <FormDialog title={edit ? `${edit.code} · v${edit.version}` : t("catalog_new")} description={edit ? t("catalog_code_fixed") : undefined} open onClose={onClose}
      onSave={submit} saving={isLoading} disabled={!form.code || !form.name_cyr} error={error || (attrError ? "attributes: JSON" : null)} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm block">{t("col_code")} *<input className={inputCls(field === "code")} value={form.code} disabled={!!edit} maxLength={40} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
        <label className="text-sm block">{t("col_type")}
          <select className={inputCls(field === "supplier_type")} value={form.supplier_type} disabled={!!edit} onChange={(e) => { const st = e.target.value as SupplierType; setForm({ ...form, supplier_type: st, category: CATEGORIES[st][0], item_type: "goods" }); }}>
            <option value="forest">{t("tab_route_forest")}</option>
            <option value="dm">{t("tab_route_dm")}</option>
          </select>
        </label>
        <label className="text-sm block">{t("col_name")} (кирилл) *<input className={inputCls(field === "name_cyr")} value={form.name_cyr} maxLength={300} onChange={(e) => setForm({ ...form, name_cyr: e.target.value })} /></label>
        <label className="text-sm block">{t("col_name")} (lotin)<input className={inputCls(field === "name_lat")} value={form.name_lat} maxLength={300} onChange={(e) => setForm({ ...form, name_lat: e.target.value })} /></label>
        <label className="text-sm block">{t("col_category")}
          <select className={inputCls(field === "category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, item_type: e.target.value === "protection_service" ? "service" : "goods" })}>
            {CATEGORIES[form.supplier_type].map((c) => <option key={c} value={c}>{t(`cat_${c}` as YashilKey)}</option>)}
          </select>
        </label>
        <label className="text-sm block">{t("col_unit")}
          <select className={inputCls(field === "unit")} value={form.unit} disabled={!!edit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
            {UNITS.map((u) => <option key={u} value={u}>{t(`unit_${u}` as YashilKey)}</option>)}
          </select>
        </label>
        <label className="text-sm block">Тартиб<input type="number" className={inputCls(field === "order")} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></label>
        <label className="inline-flex items-center gap-2 text-sm min-h-[40px] self-end"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />{t("status_active")}</label>
      </div>
      <label className="text-sm block">attributes (JSON)<textarea className={inputCls(field === "attributes" || attrError)} value={form.attributes} onChange={(e) => setForm({ ...form, attributes: e.target.value })} /></label>
    </FormDialog>
  );
}

function Capacity() {
  const { t } = useYashilT();
  const { data: dms } = useGetYashilAdminSuppliersQuery({ supplier_type: "dm" });
  const [org, setOrg] = useState("");
  const [period, setPeriod] = useState(todayIso().slice(0, 7));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!org && dms?.results[0]) setOrg(dms.results[0].organization); }, [dms, org]);
  const { data } = useGetYashilAdminCapacityQuery(org ? { organization: org, period } : skipToken);
  const { script } = useYashilT();
  return (
    <section className="ym-card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-lg">{t("capacity_title")}</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="ym-select" value={org} onChange={(e) => setOrg(e.target.value)} aria-label={t("capacity_dm")}>
            {(dms?.results ?? []).map((d) => <option key={d.id} value={d.organization}>{d.organization_name}</option>)}
          </select>
          <input type="month" className="ym-select" value={period} onChange={(e) => setPeriod(e.target.value || todayIso().slice(0, 7))} aria-label={t("period")} />
          <button type="button" className="ym-btn ym-btn--primary" disabled={!data} onClick={() => setEditing(true)}>{t("capacity_edit")}</button>
        </div>
      </div>
      <table className="ym-table text-[13px]">
        <thead><tr><th>{t("col_code")}</th><th>{t("col_name")}</th><th>{t("col_capacity")}</th><th>{t("col_used")}</th><th>{t("col_available")}</th></tr></thead>
        <tbody>
          {(data?.rows ?? []).map((r) => (
            <tr key={r.catalog_item_id}><td className="font-mono text-xs">{r.code}</td><td>{pickName(r, script)}</td><td>{r.capacity}</td><td>{r.used}</td><td>{r.available}</td></tr>
          ))}
          {data && data.rows.length === 0 && <tr><td colSpan={5} className="ym-muted text-center">{t("empty")}</td></tr>}
        </tbody>
      </table>
      {editing && data && <CapacityEditor admin organization={org} period={period} rows={data.rows} onClose={() => setEditing(false)} />}
    </section>
  );
}

export function CatalogTab() {
  const { t, script } = useYashilT();
  const { data } = useGetYashilAdminCatalogQuery();
  const [dialog, setDialog] = useState<{ edit: AdminCatalogItem | null } | null>(null);
  return (
    <>
      <div className="ym-card space-y-3">
        <div className="flex justify-end"><button type="button" className="ym-btn ym-btn--primary" onClick={() => setDialog({ edit: null })}>{t("catalog_new")}</button></div>
        <div className="overflow-auto">
          <table className="ym-table text-[13px]">
            <thead><tr><th>{t("col_code")}</th><th>{t("col_name")}</th><th>{t("col_type")}</th><th>{t("col_category")}</th><th>{t("col_unit")}</th><th>{t("col_version")}</th><th>{t("col_status")}</th><th></th></tr></thead>
            <tbody>
              {(data?.results ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs">{i.code}</td>
                  <td>{pickName(i, script)}</td>
                  <td>{t(i.supplier_type === "dm" ? "tab_route_dm" : "tab_route_forest")}</td>
                  <td>{t(`cat_${i.category}` as YashilKey)}</td>
                  <td>{t(`unit_${i.unit}` as YashilKey)}</td>
                  <td>v{i.version}</td>
                  <td><ActiveBadge active={i.is_active} /></td>
                  <td><button type="button" className="ym-btn" onClick={() => setDialog({ edit: i })}>{t("edit")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dialog && <ItemDialog edit={dialog.edit} onClose={() => setDialog(null)} />}
      </div>
      <Capacity />
    </>
  );
}
