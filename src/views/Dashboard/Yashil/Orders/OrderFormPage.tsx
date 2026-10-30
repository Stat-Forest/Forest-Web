/**
 * Yangi buyurtma / tahrirlash (TZ §4): 4 qism bitta sahifada —
 * yetkazib beruvchi, joy va maydon (xarita), mahsulot/xizmat qatorlari, qo'shimcha va yuborish.
 * Xato maydon yonida kirillda (backend `field`), yuborish → imzo oynasi.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import type { Polygon } from "geojson";
import YashilLayout from "../YashilLayout";
import PointMap from "./PointMap";
import SignSubmitDialog from "./SignSubmitDialog";
import { pickName, useYashilT } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { CatalogItem, OrderDetail, OrderLineIn, OrderWrite, SupplierType } from "@/features/yashil/types";
import {
  useCreateYashilOrderMutation,
  useDeleteYashilAttachmentMutation,
  useGetSuppliersForMahallaQuery,
  useGetYashilCatalogQuery,
  useGetYashilObjectTypesQuery,
  useGetYashilOrderQuery,
  useGetYashilSeasonsQuery,
  useUpdateYashilOrderMutation,
  useUploadYashilAttachmentMutation,
} from "@/services/yashilApi";
import { apiErrorField, apiErrorText, fmtBytes } from "./orderUi";

interface LineDraft {
  catalog_item: string;
  qty: string;
  attrs_note: string;
}

interface FormState {
  route: SupplierType;
  supplier_org: string;
  title: string;
  object_type: string;
  object_note: string;
  season: string;
  address: string;
  lat: number | null;
  lon: number | null;
  pointConfirmed: boolean;
  polygon: Polygon | null;
  area_ha: string;
  area_calc_ha: string;
  area_note: string;
  water_source: string;
  contact_person: string;
  extra_info: string;
  base_seedlings: string;
  problem_note: string;
  repeat_reason: string;
  lines: LineDraft[];
}

const empty = (route: SupplierType, supplier: string): FormState => ({
  route, supplier_org: supplier, title: "", object_type: "", object_note: "", season: "", address: "",
  lat: null, lon: null, pointConfirmed: false, polygon: null, area_ha: "", area_calc_ha: "", area_note: "",
  water_source: "", contact_person: "", extra_info: "", base_seedlings: "", problem_note: "", repeat_reason: "", lines: [],
});

const fromOrder = (o: OrderDetail): FormState => ({
  route: o.route, supplier_org: o.supplier.id, title: o.title, object_type: o.object_type?.id ?? "", object_note: o.object_note,
  season: o.season?.id ?? "", address: o.address, lat: o.lat ? Number(o.lat) : null, lon: o.lon ? Number(o.lon) : null,
  pointConfirmed: !!o.lat, polygon: (o.polygon as Polygon | null) ?? null, area_ha: o.area_ha ?? "", area_calc_ha: o.area_calc_ha ?? "",
  area_note: o.area_note, water_source: o.water_source, contact_person: o.contact_person, extra_info: o.extra_info,
  base_seedlings: o.base_seedlings?.toString() ?? "", problem_note: o.problem_note, repeat_reason: o.repeat_reason,
  lines: o.lines.map((l) => ({ catalog_item: l.catalog_item.id, qty: l.qty, attrs_note: l.attrs_note })),
});

const toPayload = (f: FormState): OrderWrite => ({
  route: f.route, supplier_org: f.supplier_org, title: f.title, object_type: f.object_type || null, object_note: f.object_note,
  season: f.season || null, address: f.address, lat: f.pointConfirmed && f.lat != null ? f.lat.toFixed(6) : null,
  lon: f.pointConfirmed && f.lon != null ? f.lon.toFixed(6) : null, polygon: f.polygon, area_ha: f.area_ha || null,
  area_calc_ha: f.area_calc_ha || null, area_note: f.area_note, water_source: f.water_source, contact_person: f.contact_person,
  extra_info: f.extra_info, base_seedlings: f.base_seedlings ? Number(f.base_seedlings) : null, problem_note: f.problem_note,
  repeat_reason: f.repeat_reason,
  lines: f.lines.filter((l) => l.catalog_item && l.qty).map<OrderLineIn>((l) => ({ catalog_item: l.catalog_item, qty: l.qty, attrs_note: l.attrs_note })),
});

const needsSeedlings = (items: CatalogItem[], lines: LineDraft[]) =>
  lines.some((l) => ["fertilizer", "mulch"].includes(items.find((i) => i.id === l.catalog_item)?.category ?? ""));
const hasService = (items: CatalogItem[], lines: LineDraft[]) =>
  lines.some((l) => items.find((i) => i.id === l.catalog_item)?.item_type === "service");

function OrderFormPage() {
  const { t, c } = useYashilT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cabinet } = useYashilAccess();
  const mahallaId = cabinet?.member_type === "mahalla" ? cabinet.mahalla?.id : undefined;
  const { data: suppliers } = useGetSuppliersForMahallaQuery(mahallaId ?? skipToken);
  const { data: existing } = useGetYashilOrderQuery(id ?? skipToken);
  const { data: objectTypes = [] } = useGetYashilObjectTypesQuery();
  const { data: seasons = [] } = useGetYashilSeasonsQuery();
  const [createOrder, { isLoading: creating }] = useCreateYashilOrderMutation();
  const [updateOrder, { isLoading: updating }] = useUpdateYashilOrderMutation();
  const [upload] = useUploadYashilAttachmentMutation();
  const [removeAttachment] = useDeleteYashilAttachmentMutation();

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signOrderId, setSignOrderId] = useState<string | null>(null);
  const [signVersion, setSignVersion] = useState(1);
  const [pickSupplier, setPickSupplier] = useState(false);

  // Boshlang'ich holat: tahrirlashda buyurtmadan; yangi — asosiy xo'jalik avtomatik (TZ §3.1)
  useEffect(() => {
    if (form) return;
    if (id) {
      if (existing) setForm(fromOrder(existing));
      return;
    }
    if (suppliers) setForm(empty("forest", suppliers.forest.primary?.id ?? ""));
  }, [form, id, existing, suppliers]);

  const supplierType = form?.route;
  const { data: catalog = [] } = useGetYashilCatalogQuery(supplierType ? { supplier_type: supplierType } : skipToken);
  const items = useMemo(() => catalog.filter((c) => c.supplier_type === supplierType), [catalog, supplierType]);

  if (!cabinet || cabinet.member_type !== "mahalla") {
    return <YashilLayout title={t("form_new_title")}><div className="ym-card">{t("mahalla_cabinet_only")}</div></YashilLayout>;
  }
  if (!form || !suppliers) {
    return <YashilLayout title={t("form_new_title")}><div className="ym-card ym-muted">{t("loading")}</div></YashilLayout>;
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const supplierName = (orgId: string) =>
    [suppliers.forest.primary, ...suppliers.forest.alternatives, ...suppliers.dm.options].find((s) => s?.id === orgId)?.name ?? "—";

  const chooseRoute = (route: SupplierType) => {
    const supplier = route === "forest" ? suppliers.forest.primary?.id ?? "" : suppliers.dm.options[0]?.id ?? "";
    setForm((f) => (f ? { ...f, route, supplier_org: supplier, lines: [] } : f));
    setPickSupplier(false);
  };

  const areaMismatch = (() => {
    const a = Number(form.area_ha), c = Number(form.area_calc_ha);
    return a > 0 && c > 0 && Math.abs(a - c) / c * 100 > 5;
  })();

  const save = async (): Promise<OrderDetail | null> => {
    setErrors({});
    try {
      const payload = toPayload(form);
      const res = id
        ? await updateOrder({ id, body: { ...payload, version_no: existing?.version_no ?? 1 } }).unwrap()
        : await createOrder(payload).unwrap();
      if (!id) navigate(YASHIL_ROUTES.orderEdit(res.id), { replace: true });
      return res;
    } catch (e) {
      const field = apiErrorField(e);
      const msg = apiErrorText(e, t("error_generic"));
      if (field) setErrors({ [field]: msg });
      toast.error(msg);
      return null;
    }
  };

  const onSaveDraft = async () => {
    const res = await save();
    if (res) toast.success(t("saved"));
  };

  const onSubmit = async () => {
    const res = await save();
    if (!res) return;
    setSignVersion(res.version_no);
    setSignOrderId(res.id);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let orderId = id;
    if (!orderId) {
      const res = await save();
      if (!res) return;
      orderId = res.id;
    }
    for (const file of Array.from(files)) {
      try {
        await upload({ id: orderId, file, kind: file.type === "application/pdf" ? "pdf" : "photo" }).unwrap();
      } catch (e) {
        toast.error(apiErrorText(e, t("error_generic")));
      }
    }
  };

  const err = (k: string) => errors[k] ? <div className="text-xs text-[var(--ym-red)] mt-1">{errors[k]}</div> : null;
  const busy = creating || updating;

  return (
    <YashilLayout title={id ? t("form_edit_title") : t("form_new_title")}>
      {existing?.last_return && (
        <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>
          <b>{existing.last_return.by === "union" ? t("returned_by_union") : t("returned_by_supplier")}:</b> {existing.last_return.comment}
        </div>
      )}

      {/* 1. Yetkazib beruvchi */}
      <section className="ym-card space-y-3">
        <h3 className="font-semibold text-lg">{t("step_supplier")}</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {(["forest", "dm"] as SupplierType[]).map((r) => (
            <button key={r} type="button" className={`ym-btn !justify-start !h-auto !py-3 text-left ${form.route === r ? "ym-btn--active" : ""}`} onClick={() => chooseRoute(r)}>
              {r === "forest" ? t("route_forest_desc") : t("route_dm_desc")}
            </button>
          ))}
        </div>
        <div className="ym-notice flex flex-wrap items-center gap-2">
          <b>{form.supplier_org ? supplierName(form.supplier_org) : t("supplier_missing")}</b>
          {form.route === "forest" && suppliers.forest.alternatives.length > 0 && (
            <button type="button" className="ym-btn" onClick={() => setPickSupplier((v) => !v)}>{t("change_supplier")}</button>
          )}
          {form.route === "dm" && suppliers.dm.options.length > 1 && (
            <select className="ym-select" value={form.supplier_org} onChange={(e) => set("supplier_org", e.target.value)}>
              {suppliers.dm.options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        {pickSupplier && (
          <select className="ym-select w-full" value={form.supplier_org} onChange={(e) => { set("supplier_org", e.target.value); setPickSupplier(false); }}>
            {[suppliers.forest.primary, ...suppliers.forest.alternatives].filter(Boolean).map((s) => <option key={s!.id} value={s!.id}>{s!.name}</option>)}
          </select>
        )}
        {err("supplier_org")}
      </section>

      {/* 2. Joy va maydon */}
      <section className="ym-card space-y-3">
        <h3 className="font-semibold text-lg">{t("step_place")}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">{t("title_label")} *<input className="ym-select w-full mt-1" value={form.title} placeholder={t("title_placeholder")} onChange={(e) => set("title", e.target.value)} />{err("title")}</label>
          <label className="text-sm">{t("address")} *<input className="ym-select w-full mt-1" value={form.address} placeholder={t("address_placeholder")} onChange={(e) => set("address", e.target.value)} />{err("address")}</label>
          <label className="text-sm">{t("object_type")}
            <select className="ym-select w-full mt-1" value={form.object_type} onChange={(e) => set("object_type", e.target.value)}>
              <option value="">—</option>
              {objectTypes.map((o) => <option key={o.id} value={o.id}>{pickName(o)}</option>)}
            </select>{err("object_type")}
          </label>
          <label className="text-sm">{t("season")}
            <select className="ym-select w-full mt-1" value={form.season} onChange={(e) => set("season", e.target.value)}>
              <option value="">—</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{c(s.label_cyr)}</option>)}
            </select>
          </label>
          {objectTypes.find((o) => o.id === form.object_type)?.requires_note && (
            <label className="text-sm sm:col-span-2">{t("object_type")} — {t("extra_info")} *<input className="ym-select w-full mt-1" value={form.object_note} onChange={(e) => set("object_note", e.target.value)} />{err("object_note")}</label>
          )}
        </div>
        <PointMap
          lat={form.lat} lon={form.lon} polygon={form.polygon} confirmed={form.pointConfirmed}
          onPoint={(lat, lon) => setForm((f) => (f ? { ...f, lat, lon, pointConfirmed: false } : f))}
          onConfirm={() => set("pointConfirmed", true)}
          onPolygon={(polygon, areaHa) => setForm((f) => (f ? { ...f, polygon, area_calc_ha: areaHa != null ? String(areaHa) : "" } : f))}
        />
        {err("lat")}
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">{t("area_ha")} *<input className="ym-select w-full mt-1" inputMode="decimal" value={form.area_ha} onChange={(e) => set("area_ha", e.target.value)} />{err("area_ha")}</label>
          <label className="text-sm">{t("area_calc")}<input className="ym-select w-full mt-1 ym-muted" value={form.area_calc_ha} readOnly /></label>
          <label className="text-sm">{t("area_note")}{areaMismatch ? " *" : ""}<input className="ym-select w-full mt-1" value={form.area_note} onChange={(e) => set("area_note", e.target.value)} />{err("area_note")}</label>
        </div>
        {areaMismatch && <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>{t("area_mismatch_warn")}</div>}
        <p className="ym-muted text-xs">{t("polygon_hint")}</p>
      </section>

      {/* 3. Qatorlar */}
      <section className="ym-card space-y-3">
        <h3 className="font-semibold text-lg">{t("step_lines")}</h3>
        <p className="ym-muted text-xs">{form.route === "forest" ? t("lines_hint_forest") : t("lines_hint_dm")} · {t("norm_hint")}</p>
        {form.lines.map((line, i) => {
          const item = items.find((c) => c.id === line.catalog_item);
          return (
            <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2 items-start">
              <select className="ym-select" value={line.catalog_item} onChange={(e) => set("lines", form.lines.map((l, j) => (j === i ? { ...l, catalog_item: e.target.value } : l)))}>
                <option value="">{t("choose_item")}</option>
                {items.map((c) => <option key={c.id} value={c.id}>{pickName(c)}{Object.values(c.attributes || {}).length ? ` (${Object.values(c.attributes).join(", ")})` : ""}</option>)}
              </select>
              <input className="ym-select" inputMode="decimal" placeholder={`${t("qty_placeholder")}${item ? `, ${t(`unit_${item.unit}` as "unit_tup")}` : ""}`} value={line.qty} onChange={(e) => set("lines", form.lines.map((l, j) => (j === i ? { ...l, qty: e.target.value } : l)))} />
              <button type="button" className="ym-btn" onClick={() => set("lines", form.lines.filter((_, j) => j !== i))} aria-label={t("delete")}>✕</button>
              {errors.lines && (errors.lines_index === undefined || Number(errors.lines_index) === i) && i === 0 && <div className="col-span-3 text-xs text-[var(--ym-red)]">{errors.lines}</div>}
            </div>
          );
        })}
        <button type="button" className="ym-btn" onClick={() => set("lines", [...form.lines, { catalog_item: "", qty: "", attrs_note: "" }])}>{t("add_line")}</button>
        <div className="grid sm:grid-cols-2 gap-3">
          {needsSeedlings(items, form.lines) && (
            <label className="text-sm">{t("base_seedlings")} *<input className="ym-select w-full mt-1" inputMode="numeric" value={form.base_seedlings} onChange={(e) => set("base_seedlings", e.target.value)} />{err("base_seedlings")}</label>
          )}
          {hasService(items, form.lines) && (
            <label className="text-sm sm:col-span-2">{t("problem_note")} *<textarea className="ym-select w-full mt-1 min-h-[80px]" value={form.problem_note} onChange={(e) => set("problem_note", e.target.value)} />{err("problem_note")}</label>
          )}
        </div>
      </section>

      {/* 4. Qo'shimcha */}
      <section className="ym-card space-y-3">
        <h3 className="font-semibold text-lg">{t("step_extra")}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">{t("water_source")}<input className="ym-select w-full mt-1" value={form.water_source} onChange={(e) => set("water_source", e.target.value)} /></label>
          <label className="text-sm">{t("contact_person")}<input className="ym-select w-full mt-1" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} /></label>
          <label className="text-sm sm:col-span-2">{t("extra_info")}<textarea className="ym-select w-full mt-1 min-h-[80px]" value={form.extra_info} onChange={(e) => set("extra_info", e.target.value)} /></label>
          {existing?.linked_order && (
            <label className="text-sm sm:col-span-2">{t("repeat_reason")} *<input className="ym-select w-full mt-1" value={form.repeat_reason} onChange={(e) => set("repeat_reason", e.target.value)} />{err("repeat_reason")}</label>
          )}
        </div>
        <div>
          <div className="text-sm font-medium">{t("attachments_title")}</div>
          <p className="ym-muted text-xs mb-2">{t("file_hint")}</p>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} className="text-sm" />
          <ul className="mt-2 space-y-1 text-sm">
            {existing?.attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <a href={a.url ?? "#"} target="_blank" rel="noreferrer" className="text-[var(--ym-green-dark)] underline">{a.original_name}</a>
                <span className="ym-muted text-xs">{fmtBytes(a.size)}</span>
                <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => removeAttachment({ id: existing.id, attachmentId: a.id })}>{t("delete")}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <button type="button" className="ym-btn" onClick={() => navigate(id ? YASHIL_ROUTES.order(id) : YASHIL_ROUTES.orders)}>{t("cancel")}</button>
          <button type="button" className="ym-btn" disabled={busy} onClick={onSaveDraft}>{t("save_draft")}</button>
          {cabinet.can_sign && <button type="button" className="ym-btn ym-btn--primary" disabled={busy} onClick={onSubmit}>{t("submit_order")}</button>}
        </div>
      </section>

      {signOrderId && (
        <SignSubmitDialog
          orderId={signOrderId}
          versionNo={signVersion}
          onClose={() => setSignOrderId(null)}
          onDone={() => navigate(YASHIL_ROUTES.order(signOrderId))}
        />
      )}
    </YashilLayout>
  );
}

export default OrderFormPage;
