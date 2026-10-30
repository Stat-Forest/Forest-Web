/**
 * Қабул қилинган буюртмалар харитаси (TZ §15.4; javob З4 — faqat kabinet ichida).
 * Leaflet + markercluster (klaster brauzerda, bir manzildagi buyurtmalar «spiderfy» bilan ro'yxat).
 * Popup: mahalla, yetkazib beruvchi, maydon, pozitsiyalar (buyurtma/qabul), holat, muddat, karta havolasi.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import YashilLayout from "../YashilLayout";
import { useYashilT } from "@/features/yashil/i18n";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { MapPoint } from "@/features/yashil/types";
import { useGetYashilMapPointsQuery } from "@/services/yashilApi";
import { setupBaseMap } from "@/features/billing/mapLayers";
import { UZ_MAP_CENTER, UZ_MAP_ZOOM } from "@/features/billing/constants";
import { apiErrorText, fmtDate } from "../Orders/orderUi";
import { ReportFilterBar, RouteTabs, useReportFilters } from "../Reports/ReportFilters";

const COLOR: Record<string, string> = { execution: "#3c648a", partial: "#b7791f", closed: "#15803d" };

const pin = (state: string, late: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${late ? "#9b3232" : COLOR[state] ?? "#15803d"};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const esc = (s: string | null | undefined) => String(s ?? "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function popupHtml(p: MapPoint, c: (text: string) => string, labels: Record<string, string>): string {
  const lines = p.lines.map((l) => `<li>${esc(l.item)} — ${esc(l.qty)} ${esc(c(l.unit_cyr))} <span style="color:#63796e">(${labels.accepted}: ${esc(l.accepted)})</span></li>`).join("");
  return `
    <div style="font-size:13px;line-height:1.4;min-width:220px;max-width:300px">
      <div style="font-weight:700">${esc(p.number)} · ${esc(c(p.state_cyr))}</div>
      <div style="color:#63796e">${esc(p.title)}</div>
      <div><b>${labels.mahalla}:</b> ${esc(p.mahalla)}</div>
      <div><b>${labels.supplier}:</b> ${esc(p.supplier)}</div>
      <div><b>${labels.area}:</b> ${esc(p.area_ha)} ${labels.ha}</div>
      <ul style="margin:4px 0 4px 14px;padding:0">${lines}</ul>
      <div><b>${labels.due}:</b> ${esc(fmtDate(p.delivery_due))}${p.late_workdays ? ` <span style="color:#9b3232;font-weight:700">${p.late_workdays} ${labels.late}</span>` : ""}</div>
      <a href="${YASHIL_ROUTES.order(p.id)}" data-order="${p.id}" style="display:inline-block;margin-top:6px;color:#15803d;font-weight:700">${labels.open} →</a>
    </div>`;
}

function MapPage() {
  const { t, c } = useYashilT();
  const navigate = useNavigate();
  const f = useReportFilters();
  const [bbox, setBbox] = useState<string | undefined>(undefined);
  const [inView, setInView] = useState(false);
  const params = useMemo(() => ({ ...f.params, bbox: inView ? bbox : undefined }), [f.params, bbox, inView]);
  const { data, error, isFetching } = useGetYashilMapPointsQuery(params);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const fitted = useRef(false);

  const labels = useMemo(() => ({
    mahalla: t("col_mahalla"), supplier: t("col_supplier"), area: t("area_ha"), accepted: t("col_accepted"),
    due: t("delivery_due"), late: t("workdays_short"), open: t("map_open_card"), ha: t("unit_ga"),
  }), [t]);

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const { map } = setupBaseMap(el.current, { center: UZ_MAP_CENTER, zoom: UZ_MAP_ZOOM, layerControl: true });
    mapRef.current = map;
    const cluster = L.markerClusterGroup({ spiderfyOnMaxZoom: true, showCoverageOnHover: false, maxClusterRadius: 50 });
    map.addLayer(cluster);
    clusterRef.current = cluster;
    const onMove = () => {
      const b = map.getBounds();
      setBbox(`${b.getSouth().toFixed(5)},${b.getWest().toFixed(5)},${b.getNorth().toFixed(5)},${b.getEast().toFixed(5)}`);
    };
    map.on("moveend", onMove);
    onMove();
    map.on("popupopen", (e: L.PopupEvent) => {
      const a = e.popup.getElement()?.querySelector("a[data-order]");
      a?.addEventListener("click", (ev) => { ev.preventDefault(); navigate(YASHIL_ROUTES.order((a as HTMLAnchorElement).dataset.order!)); });
    });
    setTimeout(() => map.invalidateSize(), 50);
    return () => { map.remove(); mapRef.current = null; clusterRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map || !data) return;
    cluster.clearLayers();
    const markers = data.points.map((p) => {
      const m = L.marker([Number(p.lat), Number(p.lon)], { icon: pin(p.state, p.late_workdays > 0), title: p.number ?? "" });
      m.bindPopup(popupHtml(p, c, labels), { maxWidth: 320 });
      return m;
    });
    cluster.addLayers(markers);
    if (!fitted.current && markers.length && !inView) {
      fitted.current = true;
      map.fitBounds(cluster.getBounds(), { padding: [30, 30], maxZoom: 13 });
    }
  }, [data, labels, t, inView]);

  return (
    <YashilLayout title={t("map_title")}>
      <div className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RouteTabs f={f} />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={inView} onChange={(e) => setInView(e.target.checked)} />{t("map_in_view")}</label>
            <span className="ym-badge">{data ? `${data.count} ${t("map_points_count")}` : isFetching ? t("loading") : "—"}</span>
          </div>
        </div>
        <ReportFilterBar f={f} withOverdue withSearch={false} />
        {error && <p className="ym-badge ym-badge--red">{apiErrorText(error, t("map_too_many"))}</p>}
        <p className="text-xs ym-muted">{t("map_note")}</p>
        <div className="flex flex-wrap gap-3 text-xs">
          {(["execution", "partial", "closed"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 5, background: COLOR[s], display: "inline-block" }} />{t(`state_${s}`)}</span>
          ))}
          <span className="inline-flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 5, background: "#9b3232", display: "inline-block" }} />{t("stat_overdue")}</span>
        </div>
      </div>
      <div className="ym-card !p-2">
        <div ref={el} className="isolate h-[70vh] min-h-[420px] w-full rounded-xl overflow-hidden" />
      </div>
    </YashilLayout>
  );
}

export default MapPage;
