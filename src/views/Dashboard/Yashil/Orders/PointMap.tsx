/**
 * Buyurtma joyi: Leaflet xaritada nuqta (bosish/sudrash), ixtiyoriy poligon (leaflet-draw),
 * poligon maydoni turf bilan (TZ §5.1). `readOnly` — tafsilot sahifasi uchun.
 */
import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import turfArea from "@turf/area";
import type { Feature, Polygon } from "geojson";
import { setupBaseMap } from "@/features/billing/mapLayers";
import { UZ_MAP_CENTER, UZ_MAP_ZOOM } from "@/features/billing/constants";
import { useYashilT } from "@/features/yashil/i18n";

export interface PointMapProps {
  lat: number | null;
  lon: number | null;
  polygon: Polygon | null;
  confirmed: boolean;
  readOnly?: boolean;
  onPoint?: (lat: number, lon: number) => void;
  onConfirm?: () => void;
  onPolygon?: (polygon: Polygon | null, areaHa: number | null) => void;
}

const PIN = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#15803d;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

function PointMap({ lat, lon, polygon, confirmed, readOnly, onPoint, onConfirm, onPolygon }: PointMapProps) {
  const { t } = useYashilT();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  const [drawing, setDrawing] = useState<L.Draw.Polygon | null>(null);

  // Xarita bir marta yaratiladi
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const center: L.LatLngExpression = lat != null && lon != null ? [lat, lon] : UZ_MAP_CENTER;
    const { map } = setupBaseMap(el.current, { center, zoom: lat != null ? 15 : UZ_MAP_ZOOM, layerControl: true });
    mapRef.current = map;
    const drawn = new L.FeatureGroup().addTo(map);
    drawnRef.current = drawn;
    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => onPoint?.(e.latlng.lat, e.latlng.lng));
      map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
        const layer = (e as L.DrawEvents.Created).layer as L.Polygon;
        drawn.clearLayers();
        drawn.addLayer(layer);
        const gj = layer.toGeoJSON() as Feature<Polygon>;
        onPolygon?.(gj.geometry, Math.round((turfArea(gj) / 10_000) * 10_000) / 10_000);
        setDrawing(null);
      });
    }
    setTimeout(() => map.invalidateSize(), 50);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marker sinxron
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat == null || lon == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lon], { icon: PIN, draggable: !readOnly }).addTo(map);
      if (!readOnly) markerRef.current.on("dragend", (e) => { const p = (e.target as L.Marker).getLatLng(); onPoint?.(p.lat, p.lng); });
      map.setView([lat, lon], Math.max(map.getZoom(), 15));
    } else {
      markerRef.current.setLatLng([lat, lon]);
    }
  }, [lat, lon, readOnly, onPoint]);

  // Tashqaridan kelgan poligon (tahrirlash / tafsilot)
  useEffect(() => {
    const drawn = drawnRef.current;
    if (!drawn || !polygon) return;
    if (drawn.getLayers().length) return;
    const layer = L.geoJSON(polygon as never, { style: { color: "#15803d", weight: 2, fillOpacity: 0.12 } });
    layer.eachLayer((l) => drawn.addLayer(l));
    const b = layer.getBounds();
    if (b.isValid()) mapRef.current?.fitBounds(b, { padding: [20, 20] });
  }, [polygon]);

  const startDraw = () => {
    const map = mapRef.current;
    if (!map) return;
    const d = new L.Draw.Polygon(map as L.DrawMap, { shapeOptions: { color: "#15803d", weight: 2 } });
    d.enable();
    setDrawing(d);
  };

  const clearPolygon = () => {
    drawing?.disable();
    setDrawing(null);
    drawnRef.current?.clearLayers();
    onPolygon?.(null, null);
  };

  return (
    <div className="space-y-2">
      <div ref={el} className="h-[340px] w-full rounded-xl overflow-hidden border border-[var(--ym-border)]" />
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="ym-muted">{t("map_hint")}</span>
          <span className={`ym-badge ${confirmed ? "" : "ym-badge--amber"}`}>
            {lat == null ? t("map_not_set") : `${lat.toFixed(6)}, ${lon!.toFixed(6)}`}{confirmed && lat != null ? ` · ${t("map_confirmed")}` : ""}
          </span>
          <button type="button" className="ym-btn ym-btn--primary" disabled={lat == null || confirmed} onClick={onConfirm}>{t("map_confirm")}</button>
          <span className="flex-1" />
          <button type="button" className="ym-btn" onClick={startDraw} disabled={!!drawing}>{t("draw_polygon")}</button>
          <button type="button" className="ym-btn" onClick={clearPolygon} disabled={!polygon && !drawing}>{t("clear_polygon")}</button>
        </div>
      )}
    </div>
  );
}

export default PointMap;
