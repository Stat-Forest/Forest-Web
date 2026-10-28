import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import YashilLayout from "./YashilLayout";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import {
  useGetSuppliersForMahallaQuery,
  useGetYashilCalendarQuery,
  useGetYashilCatalogQuery,
  useGetYashilMahallasQuery,
} from "@/services/yashilApi";
import type { Cabinet } from "@/features/yashil/types";

const MEMBER_TYPE_KEY: Record<Cabinet["member_type"], YashilKey> = {
  mahalla: "member_type_mahalla",
  union: "member_type_union",
  supplier: "member_type_supplier",
  observer: "member_type_observer",
};

const UNIT_KEY: Record<string, YashilKey> = {
  tup: "unit_tup", dona: "unit_dona", komplekt: "unit_komplekt", daraxt: "unit_daraxt",
  kg: "unit_kg", metr: "unit_metr", ga: "unit_ga",
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

/** Kabinet ma'lumotlari: a'zolik, mahalla/yetkazib beruvchilar, katalog, kalendar. */
function Reference() {
  const { t, script } = useYashilT();
  const { me, cabinet } = useYashilAccess();
  const [search, setSearch] = useState("");

  const mahallaId = cabinet?.member_type === "mahalla" ? cabinet.mahalla?.id : undefined;
  const { data: suppliers } = useGetSuppliersForMahallaQuery(mahallaId ?? skipToken);
  const { data: mahallas } = useGetYashilMahallasQuery(
    cabinet?.member_type === "mahalla" ? skipToken : { q: search || undefined, per_page: 20 },
  );
  const { data: catalog } = useGetYashilCatalogQuery(
    cabinet?.supplier_type ? { supplier_type: cabinet.supplier_type } : undefined,
  );
  const year = new Date().getFullYear() + 1;
  const { data: calendar } = useGetYashilCalendarQuery({ year });

  const supplierTypeLabel = (type: "forest" | "dm" | null | undefined) =>
    type === "forest" ? t("supplier_forest") : type === "dm" ? t("supplier_dm") : "";

  return (
    <YashilLayout title={t("ref_title")}>
      <p className="ym-muted text-sm -mt-1">{t("ref_subtitle")}</p>

      {cabinet && (
        <section className="ym-card">
          <h3 className="font-semibold text-lg mb-3">{t("cabinet")}</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label={t("col_type")} value={t(MEMBER_TYPE_KEY[cabinet.member_type])} />
            <Row label={t("cabinet")} value={cabinet.name} />
            {cabinet.supplier_type && <Row label={t("supplier_forest")} value={supplierTypeLabel(cabinet.supplier_type)} />}
            {cabinet.mahalla && (
              <>
                <Row label={t("region")} value={cabinet.mahalla.region_name} />
                <Row label={t("district")} value={cabinet.mahalla.district.name} />
                <Row label={t("address")} value={cabinet.mahalla.address || "—"} />
                <Row label={t("source_code")} value={cabinet.mahalla.source_code || "—"} />
              </>
            )}
            <Row label={t("position")} value={cabinet.position_title || "—"} />
            <Row label={t("phone")} value={cabinet.phone || "—"} />
            <Row label={t("can_prepare")} value={cabinet.can_prepare ? "✓" : t("no_right")} />
            <Row label={t("can_sign")} value={cabinet.can_sign ? "✓" : t("no_right")} />
          </dl>
        </section>
      )}

      {!cabinet && me?.is_admin && (
        <section className="ym-card"><span className="ym-badge ym-badge--blue">{t("admin_badge")}</span></section>
      )}

      {suppliers && (
        <section className="ym-card space-y-3">
          <h3 className="font-semibold text-lg">{t("primary_forest")}</h3>
          {suppliers.forest.primary ? (
            <div className="ym-notice"><b>{suppliers.forest.primary.name}</b></div>
          ) : (
            <div className="ym-notice" style={{ borderLeftColor: "#d9a441" }}>{suppliers.forest.message}</div>
          )}
          <div className="text-sm">
            <span className="ym-muted">{t("alternatives")}: </span>
            {suppliers.forest.alternatives.length
              ? suppliers.forest.alternatives.map((s) => <span key={s.id} className="ym-badge mr-1 mb-1">{s.name}</span>)
              : t("none")}
          </div>
          <div className="text-sm">
            <span className="ym-muted">{t("dm_options")}: </span>
            {suppliers.dm.options.length
              ? suppliers.dm.options.map((s) => <span key={s.id} className="ym-badge ym-badge--blue mr-1 mb-1">{s.name}</span>)
              : t("none")}
          </div>
          <div className="text-sm">
            <span className="ym-muted">{t("union_unit")}: </span>
            {suppliers.union ? suppliers.union.name : <span className="ym-badge ym-badge--amber">{suppliers.union_message}</span>}
          </div>
        </section>
      )}

      {mahallas && (
        <section className="ym-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-lg">
              {t("visible_mahallas")} <span className="ym-muted text-sm font-normal">({mahallas.count})</span>
            </h3>
            <input
              className="ym-select"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("search")}
            />
          </div>
          {mahallas.results.length ? (
            <div className="overflow-auto">
              <table className="ym-table">
                <thead>
                  <tr><th>{t("col_name")}</th><th>{t("district")}</th><th>{t("region")}</th><th>{t("source_code")}</th></tr>
                </thead>
                <tbody>
                  {mahallas.results.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td><td>{m.district.name}</td><td>{m.region.name}</td><td className="ym-muted">{m.source_code || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ym-muted text-sm">{t("empty")}</p>
          )}
        </section>
      )}

      <section className="ym-card">
        <h3 className="font-semibold text-lg">{t("catalog_title")}</h3>
        <p className="ym-muted text-xs mb-3">{t("catalog_subtitle")}</p>
        {catalog?.length ? (
          <div className="overflow-auto">
            <table className="ym-table">
              <thead>
                <tr><th>{t("col_code")}</th><th>{t("col_name")}</th><th>{t("col_type")}</th><th>{t("col_unit")}</th></tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs">{item.code}</td>
                    <td>
                      {pickName(item, script)}
                      {Object.keys(item.attributes || {}).length > 0 && (
                        <div className="ym-muted text-xs">{Object.values(item.attributes).join(" · ")}</div>
                      )}
                    </td>
                    <td>
                      <span className={`ym-badge ${item.item_type === "service" ? "ym-badge--blue" : ""}`}>
                        {item.item_type === "service" ? t("item_service") : t("item_goods")}
                      </span>
                      <div className="ym-muted text-xs mt-1">{supplierTypeLabel(item.supplier_type)}</div>
                    </td>
                    <td>{t(UNIT_KEY[item.unit] ?? "unit_dona")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ym-muted text-sm">{t("empty")}</p>
        )}
      </section>

      <section className="ym-card">
        <h3 className="font-semibold text-lg mb-3">{t("holidays_title")} — {year}</h3>
        {calendar?.length ? (
          <div className="flex flex-wrap gap-2">
            {calendar.map((d) => (
              <span key={d.id} className={`ym-badge ${d.kind === "workday" ? "ym-badge--blue" : "ym-badge--amber"}`} title={d.source_ref}>
                {formatDate(d.date)} · {d.note || (d.kind === "workday" ? t("moved_workday") : t("holiday"))}
              </span>
            ))}
          </div>
        ) : (
          <p className="ym-muted text-sm">{t("empty")}</p>
        )}
      </section>
    </YashilLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="ym-muted min-w-[140px]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export default Reference;
