// Shartnoma yeri chegarasini chizish xaritasi (billing ContractBoundaryMap.vue porti):
// leaflet-draw (ko'pburchak / to'rtburchak / marker), KMZ/KML yuklash, Tozalash,
// to'liq ekran, "Xo'jalikka o'tish" paneli (viloyat → xo'jalik → kontur) va
// tanlangan hududga nisbatan maslahat tarzidagi (bloklamaydigan) moslik tekshiruvi,
// boshqa shartnomalar qizil punktir overlay sifatida.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "../../Gis/gis.css";
import turfArea from "@turf/area";
import turfIntersect from "@turf/intersect";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { ChevronDown, ChevronUp, Eraser, Loader2, Maximize2, Minimize2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetXojalikKontursQuery,
  useGetXojalikLocationsQuery,
  useLazyGetContractsGeoListQuery,
  useLazyGetXojalikKonturQuery,
  useLazyGetXojalikLocationQuery,
} from "@/services/billingApi";
import { setupBaseMap, type BaseLayerLabels } from "@/features/billing/mapLayers";
import {
  createKonturHighlightLayer,
  createXojalikBoundaryLayer,
  flyToKontur,
  flyToXojalik,
} from "@/features/billing/markers";
import {
  extractPolygons,
  formatAreaGa,
  getPolygonLocations,
  type PolygonCoords,
} from "@/features/billing/contractPolygons";
import { GEO_FILE_ACCEPT, GeoFileError, kmlFileToGeoJson } from "@/features/billing/geo";
import { escapeHtml } from "@/features/billing/escapeHtml";
import { formatCoord } from "@/features/billing/format";
import { UZ_MAP_CENTER, UZ_MAP_ZOOM } from "@/features/billing/constants";
import type { BoundaryGeoJson, GeoJsonFeatureCollection } from "@/features/billing/types";
import { cn } from "@/lib/utils";

export interface BoundaryMapProps {
  latitude: string;
  longitude: string;
  boundaryGeojson: BoundaryGeoJson | null;
  /** Tahrirlanayotgan shartnoma — overlay'dan chiqarib tashlanadi */
  contractId?: string | null;
  onLatLngChange: (lat: number | null, lng: number | null) => void;
  onBoundaryChange: (geojson: BoundaryGeoJson | null) => void;
  readOnly?: boolean;
}

const OTHER_CONTRACT_COLOR = "#ff3b30";
const OWN_COLOR = "#2563eb";
/** 90% dan kam qismi tanlangan hudud ichida bo'lsa — ogohlantirish (bloklamaydi). */
const BOUNDARY_OVERLAP_RATIO_THRESHOLD = 0.9;

const roundCoord = (val: number) => Math.round(val * 1e7) / 1e7;

const pinIcon = (color: string, size: [number, number] = [30, 39]) =>
  L.divIcon({
    className: "gis-contract-marker",
    html: `<svg width="${size[0]}" height="${size[1]}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.95 0 0 8.95 0 20c0 14.5 20 32 20 32s20-17.5 20-32C40 8.95 31.05 0 20 0z" fill="${color}"/><circle cx="20" cy="20" r="8" fill="#ffffff"/></svg>`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1] + 4],
  });

// ---------------------------------------------------------------------------
// leaflet-draw: global L, o'zbekcha matnlar va readableArea tuzatishi
// ---------------------------------------------------------------------------

type LeafletGlobal = typeof L & {
  drawLocal?: unknown;
  GeometryUtil?: {
    readableArea?: (area: number, isMetric?: unknown, precision?: Record<string, number>) => string;
    formattedNumber: (n: number, precision?: number) => string;
  };
};

let drawLoaded: Promise<LeafletGlobal> | null = null;

const UZ_DRAW_LOCAL = {
  draw: {
    toolbar: {
      actions: { title: "Chizishni bekor qilish", text: "Bekor qilish" },
      finish: { title: "Chizishni tugatish", text: "Tugatish" },
      undo: { title: "Oxirgi chizilgan nuqtani o'chirish", text: "Oxirgi nuqtani o'chirish" },
      buttons: {
        polyline: "Chiziq chizish",
        polygon: "Ko'pburchak chizish",
        rectangle: "To'rtburchak chizish",
        circle: "Doira chizish",
        marker: "Marker qo'yish",
        circlemarker: "Doira-marker qo'yish",
      },
    },
    handlers: {
      circle: { tooltip: { start: "Doira chizish uchun bosib torting." }, radius: "Radius" },
      circlemarker: { tooltip: { start: "Doira-marker qo'yish uchun xaritani bosing." } },
      marker: { tooltip: { start: "Marker qo'yish uchun xaritani bosing." } },
      polygon: {
        tooltip: {
          start: "Shaklni chizishni boshlash uchun bosing.",
          cont: "Chizishni davom ettirish uchun bosing.",
          end: "Shaklni yopish uchun birinchi nuqtani bosing.",
        },
      },
      polyline: {
        error: "<strong>Xato:</strong> shakl chetlari kesishmasligi kerak!",
        tooltip: {
          start: "Chiziq chizishni boshlash uchun bosing.",
          cont: "Chizishni davom ettirish uchun bosing.",
          end: "Chiziqni tugatish uchun oxirgi nuqtani bosing.",
        },
      },
      rectangle: { tooltip: { start: "To'rtburchak chizish uchun bosib torting." } },
      simpleshape: { tooltip: { end: "Chizishni tugatish uchun sichqonchani qo'yib yuboring." } },
    },
  },
  edit: {
    toolbar: {
      actions: {
        save: { title: "O'zgarishlarni saqlash", text: "Saqlash" },
        cancel: { title: "Tahrirlashni bekor qilish, barcha o'zgarishlar bekor qilinadi", text: "Bekor qilish" },
        clearAll: { title: "Barcha qatlamlarni tozalash", text: "Hammasini tozalash" },
      },
      buttons: {
        edit: "Qatlamlarni tahrirlash",
        editDisabled: "Tahrirlash uchun qatlam yo'q",
        remove: "Qatlamlarni o'chirish",
        removeDisabled: "O'chirish uchun qatlam yo'q",
      },
    },
    handlers: {
      edit: {
        tooltip: {
          text: "Xususiyatlarni tahrirlash uchun tutqichlarni suring.",
          subtext: "O'zgarishlarni bekor qilish uchun \"Bekor qilish\"ni bosing.",
        },
      },
      remove: { tooltip: { text: "O'chirish uchun shaklni bosing." } },
    },
  },
};

const loadLeafletDraw = (): Promise<LeafletGlobal> => {
  if (!drawLoaded) {
    drawLoaded = (async () => {
      const w = window as unknown as { L?: LeafletGlobal };
      // leaflet-draw (UMD) global `L`ni kengaytiradi — u Leaflet bilan bir obyekt bo'lsin
      if (!w.L) w.L = L as LeafletGlobal;
      await import("leaflet-draw");
      const LG = w.L as LeafletGlobal;
      // leaflet-draw'ning readableArea'sida e'lon qilinmagan `type` o'zgaruvchisi
      // strict-mode build'da ReferenceError beradi — tuzatilgan nusxa
      const GU = LG.GeometryUtil;
      if (GU) {
        GU.readableArea = (area, isMetric, precisionOptions) => {
          const precision = { km: 2, ha: 2, m: 0, mi: 2, ac: 2, yd: 0, ft: 0, nm: 2, ...(precisionOptions || {}) };
          if (isMetric) {
            let units: string[] = ["ha", "m"];
            if (typeof isMetric === "string") units = [isMetric];
            else if (typeof isMetric !== "boolean") units = isMetric as string[];
            if (area >= 1_000_000 && units.includes("km")) return `${GU.formattedNumber(area * 0.000001, precision.km)} km²`;
            if (area >= 10_000 && units.includes("ha")) return `${GU.formattedNumber(area * 0.0001, precision.ha)} ga`;
            return `${GU.formattedNumber(area, precision.m)} m²`;
          }
          const yd = area / 0.836127;
          if (yd >= 3_097_600) return `${GU.formattedNumber(yd / 3_097_600, precision.mi)} mi²`;
          if (yd >= 4840) return `${GU.formattedNumber(yd / 4840, precision.ac)} acres`;
          return `${GU.formattedNumber(yd, precision.yd)} yd²`;
        };
      }
      LG.drawLocal = UZ_DRAW_LOCAL;
      return LG;
    })();
  }
  return drawLoaded;
};

// ---------------------------------------------------------------------------
// Moslik tekshiruvi (turf)
// ---------------------------------------------------------------------------

type Bbox = [number, number, number, number];
const bboxOf = (coords: PolygonCoords): Bbox => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  coords[0].forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return [minX, minY, maxX, maxY];
};
const bboxOverlap = (a: Bbox, b: Bbox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const polyFeature = (coordinates: PolygonCoords): Feature<Polygon> => ({
  type: "Feature",
  properties: {},
  geometry: { type: "Polygon", coordinates },
});

/** true — mos (yoki tekshirib bo'lmadi), false — ogohlantirish kerak. */
const checkOverlap = (
  target: unknown,
  drawn: unknown,
  point: { lat: number; lng: number } | null,
): boolean => {
  const targetPolys = extractPolygons(target).map((coords) => ({ coords, bbox: bboxOf(coords) }));
  if (!targetPolys.length) return true;
  const drawnPolys = extractPolygons(drawn);
  if (drawnPolys.length) {
    let drawnArea = 0;
    let overlapArea = 0;
    drawnPolys.forEach((coords) => {
      const f = polyFeature(coords);
      drawnArea += turfArea(f);
      const bb = bboxOf(coords);
      targetPolys.forEach((tp) => {
        if (!bboxOverlap(bb, tp.bbox)) return;
        const inter = turfIntersect<Record<string, never>>({
          type: "FeatureCollection",
          features: [f, polyFeature(tp.coords)] as Array<Feature<Polygon | MultiPolygon>>,
        });
        if (inter) overlapArea += turfArea(inter);
      });
    });
    if (!drawnArea) return false;
    return overlapArea / drawnArea >= BOUNDARY_OVERLAP_RATIO_THRESHOLD;
  }
  if (point) {
    return targetPolys.some((tp) =>
      booleanPointInPolygon([point.lng, point.lat], polyFeature(tp.coords)),
    );
  }
  return true;
};

// ---------------------------------------------------------------------------

function BoundaryMap({
  latitude,
  longitude,
  boundaryGeojson,
  contractId,
  onLatLngChange,
  onBoundaryChange,
  readOnly,
}: BoundaryMapProps) {
  const { t } = useTranslation();

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonMarkersRef = useRef<L.LayerGroup | null>(null);
  const overlayRef = useRef<L.FeatureGroup | null>(null);
  const xojalikBoundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const konturLayerRef = useRef<L.GeoJSON | null>(null);
  const xojalikBoundaryRef = useRef<unknown>(null);
  const konturBoundaryRef = useRef<unknown>(null);

  // Mount paytidagi boshlang'ich qiymatlar (keyingi o'zgarishlar xaritaning o'zidan keladi)
  const initialRef = useRef({ latitude, longitude, boundaryGeojson });
  const callbacksRef = useRef({ onLatLngChange, onBoundaryChange });
  callbacksRef.current = { onLatLngChange, onBoundaryChange };

  const [mapReady, setMapReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [warningTarget, setWarningTarget] = useState<"" | "xojalik" | "kontur">("");
  const [fullscreen, setFullscreen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  // ---- "Xo'jalikka o'tish" paneli
  const [viloyatId, setViloyatId] = useState("");
  const [xojalikId, setXojalikId] = useState("");
  const [konturId, setKonturId] = useState("");
  const [konturSearch, setKonturSearch] = useState("");
  const { data: xojalikLocations = [] } = useGetXojalikLocationsQuery();
  const { data: konturlar = [], isFetching: konturLoading } = useGetXojalikKontursQuery(xojalikId || skipToken);
  const [fetchXojalikLocation] = useLazyGetXojalikLocationQuery();
  const [fetchKontur] = useLazyGetXojalikKonturQuery();
  const [fetchGeoList] = useLazyGetContractsGeoListQuery();

  const viloyatlar = useMemo(() => {
    const m = new Map<string, string>();
    xojalikLocations.forEach((x) => {
      if (!m.has(x.region)) m.set(x.region, x.region_name);
    });
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "uz"));
  }, [xojalikLocations]);
  const xojaliklarByRegion = useMemo(
    () =>
      viloyatId
        ? xojalikLocations.filter((x) => x.region === viloyatId).sort((a, b) => a.name.localeCompare(b.name, "uz"))
        : [],
    [xojalikLocations, viloyatId],
  );
  const filteredKonturlar = useMemo(() => {
    const q = konturSearch.trim();
    const list = q ? konturlar.filter((k) => String(k.kontur_raqami).includes(q)) : konturlar;
    return list.slice(0, 300);
  }, [konturlar, konturSearch]);

  const layerLabels = useMemo<BaseLayerLabels>(
    () => ({
      esri: t("billing.layer_esri"),
      yandex: t("billing.layer_yandex"),
      street: t("billing.layer_street"),
      xojaliklar: t("billing.form_map_other_contracts"),
    }),
    [t],
  );
  const layerLabelsRef = useRef(layerLabels);
  layerLabelsRef.current = layerLabels;

  // ---- Moslik tekshiruvi
  const validateDrawn = useCallback(() => {
    const target = konturBoundaryRef.current || xojalikBoundaryRef.current;
    const drawn = drawnItemsRef.current;
    const marker = markerRef.current;
    if (!target || (!drawn?.getLayers().length && !marker)) {
      setWarningTarget("");
      return;
    }
    try {
      const geo = drawn && drawn.getLayers().length ? drawn.toGeoJSON() : null;
      const ll = marker?.getLatLng();
      const ok = checkOverlap(target, geo, ll ? { lat: ll.lat, lng: ll.lng } : null);
      setWarningTarget(ok ? "" : konturBoundaryRef.current ? "kontur" : "xojalik");
    } catch {
      setWarningTarget("");
    }
  }, []);

  const emitLatLng = (lat: number | null, lng: number | null) =>
    callbacksRef.current.onLatLngChange(lat === null ? null : roundCoord(lat), lng === null ? null : roundCoord(lng));

  /** Poligon nuqtalari: 2+ poligon — har biriga belgi, lat/lng = 1-poligon. */
  const syncPolygonLocations = useCallback((updateSingle = true) => {
    const drawn = drawnItemsRef.current;
    const map = mapRef.current;
    const layer = polygonMarkersRef.current;
    if (!drawn || !map || !layer) return;
    const locations = getPolygonLocations(drawn.toGeoJSON());
    layer.clearLayers();
    if (locations.length > 1) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      locations.forEach((loc) => {
        L.marker([loc.lat, loc.lng], { icon: pinIcon(OWN_COLOR) })
          .bindTooltip(
            `${escapeHtml(t("billing.form_polygon"))} ${loc.index} / ${loc.total}: ${formatAreaGa(loc.areaGa)} ga<br>${formatCoord(loc.lat)}, ${formatCoord(loc.lng)}`,
          )
          .addTo(layer);
      });
      emitLatLng(locations[0].lat, locations[0].lng);
    } else if (locations.length === 1 && !markerRef.current && updateSingle) {
      emitLatLng(locations[0].lat, locations[0].lng);
    }
  }, [t]);

  const emitBoundary = () => {
    const drawn = drawnItemsRef.current;
    const geo = drawn?.toGeoJSON() as GeoJsonFeatureCollection | undefined;
    callbacksRef.current.onBoundaryChange(geo && geo.features?.length ? (geo as BoundaryGeoJson) : null);
  };

  const clearAll = () => {
    drawnItemsRef.current?.clearLayers();
    polygonMarkersRef.current?.clearLayers();
    if (markerRef.current && mapRef.current) mapRef.current.removeLayer(markerRef.current);
    markerRef.current = null;
    setImportError("");
    emitLatLng(null, null);
    callbacksRef.current.onBoundaryChange(null);
    validateDrawn();
  };

  // =====================================================================
  // Xaritani yaratish
  // =====================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let map: L.Map | null = null;
    const timers: number[] = [];

    (async () => {
      const LG = await loadLeafletDraw();
      if (cancelled || !containerRef.current) return;

      const setup = setupBaseMap(container, {
        center: UZ_MAP_CENTER,
        zoom: UZ_MAP_ZOOM,
        labels: layerLabelsRef.current,
      });
      map = setup.map;
      mapRef.current = map;

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;
      polygonMarkersRef.current = L.layerGroup().addTo(map);

      // Boshlang'ich chegara / nuqta
      const init = initialRef.current;
      if (init.boundaryGeojson) {
        try {
          const gj = L.geoJSON(init.boundaryGeojson as GeoJSON.GeoJsonObject, {
            style: { color: OWN_COLOR, weight: 3, fillOpacity: 0.25 },
          });
          gj.eachLayer((layer) => drawnItems.addLayer(layer));
          const b = gj.getBounds();
          if (b.isValid()) map.fitBounds(b, { maxZoom: 17 });
        } catch {
          // noto'g'ri geojson — e'tiborsiz
        }
      }
      const existingCount = init.boundaryGeojson ? extractPolygons(init.boundaryGeojson).length : 0;
      if (existingCount > 1) {
        syncPolygonLocations(false);
      } else {
        const lat = Number(init.latitude);
        const lng = Number(init.longitude);
        if (init.latitude && init.longitude && Number.isFinite(lat) && Number.isFinite(lng)) {
          markerRef.current = L.marker([lat, lng], { icon: pinIcon(OWN_COLOR, [34, 44]) }).addTo(map);
          if (!init.boundaryGeojson) map.setView([lat, lng], 14);
        }
      }

      if (!readOnly && LG.Control.Draw) {
        const drawControl = new LG.Control.Draw({
          position: "topright",
          draw: {
            polygon: { allowIntersection: false, showArea: true, metric: true, shapeOptions: { color: OWN_COLOR } },
            rectangle: { showArea: true, metric: true, shapeOptions: { color: OWN_COLOR } } as L.DrawOptions.RectangleOptions,
            polyline: false,
            circle: false,
            circlemarker: false,
            marker: { icon: pinIcon(OWN_COLOR, [34, 44]) },
          },
          edit: { featureGroup: drawnItems },
        });
        map.addControl(drawControl);

        map.on("draw:created", (e: L.LeafletEvent) => {
          const ev = e as L.DrawEvents.Created;
          const m = mapRef.current;
          if (!m) return;
          if (ev.layerType === "marker") {
            if (extractPolygons(drawnItems.toGeoJSON()).length > 1) {
              setImportError(t("billing.form_map_multi_marker"));
              return;
            }
            if (markerRef.current) m.removeLayer(markerRef.current);
            const marker = ev.layer as L.Marker;
            marker.setIcon(pinIcon(OWN_COLOR, [34, 44]));
            m.addLayer(marker);
            markerRef.current = marker;
            const ll = marker.getLatLng();
            emitLatLng(ll.lat, ll.lng);
          } else {
            drawnItems.clearLayers();
            drawnItems.addLayer(ev.layer);
            emitBoundary();
            syncPolygonLocations();
          }
          validateDrawn();
        });
        map.on("draw:edited", () => {
          emitBoundary();
          if (markerRef.current) {
            const ll = markerRef.current.getLatLng();
            emitLatLng(ll.lat, ll.lng);
          }
          syncPolygonLocations();
          validateDrawn();
        });
        map.on("draw:deleted", () => {
          emitBoundary();
          syncPolygonLocations();
          validateDrawn();
        });
      }

      timers.push(window.setTimeout(() => mapRef.current?.invalidateSize(), 250));
      timers.push(window.setTimeout(() => mapRef.current?.invalidateSize(), 600));
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      setMapReady(false);
      if (map) map.remove();
      mapRef.current = null;
      drawnItemsRef.current = null;
      markerRef.current = null;
      polygonMarkersRef.current = null;
      overlayRef.current = null;
      xojalikBoundaryLayerRef.current = null;
      konturLayerRef.current = null;
    };
    // Xarita faqat bir marta yaratiladi; keyingi o'zgarishlar ref'lar orqali
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Konteyner o'lchami o'zgarsa (dialog ochilishi, tab almashishi) — invalidateSize
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // =====================================================================
  // Boshqa shartnomalar overlay'i
  // =====================================================================
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchGeoList(undefined, true).unwrap();
        const map = mapRef.current;
        if (cancelled || !map) return;
        const overlay = L.featureGroup();
        const icon = pinIcon(OTHER_CONTRACT_COLOR, [24, 31]);
        (data?.results ?? []).forEach((c) => {
          if (contractId && String(c.id) === String(contractId)) return;
          const label = escapeHtml(
            [c.contract_number || c.number, c.renter_name].filter(Boolean).join(" — "),
          );
          if (c.boundary_geojson) {
            try {
              const layer = L.geoJSON(c.boundary_geojson as GeoJSON.GeoJsonObject, {
                style: {
                  color: OTHER_CONTRACT_COLOR,
                  weight: 3,
                  dashArray: "6, 4",
                  fillColor: OTHER_CONTRACT_COLOR,
                  fillOpacity: 0.25,
                },
                interactive: true,
              });
              if (label) layer.bindTooltip(label);
              overlay.addLayer(layer);
              const locs = getPolygonLocations(c.boundary_geojson);
              if (locs.length > 1) {
                locs.forEach((loc) => {
                  const pin = L.marker([loc.lat, loc.lng], { icon });
                  if (label) pin.bindTooltip(`${label} (${escapeHtml(t("billing.form_polygon"))} ${loc.index} / ${loc.total})`);
                  overlay.addLayer(pin);
                });
              } else {
                const b = layer.getBounds();
                if (b.isValid()) {
                  const pin = L.marker(b.getCenter(), { icon });
                  if (label) pin.bindTooltip(label);
                  overlay.addLayer(pin);
                }
              }
            } catch {
              // noto'g'ri geojson
            }
          } else if (c.latitude && c.longitude) {
            const lat = Number(c.latitude);
            const lng = Number(c.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const pin = L.marker([lat, lng], { icon });
              if (label) pin.bindTooltip(label);
              overlay.addLayer(pin);
            }
          }
        });
        overlay.addTo(map);
        overlay.bringToBack();
        overlayRef.current = overlay;
        const init = initialRef.current;
        const hasOwn = !!init.boundaryGeojson || !!(init.latitude && init.longitude);
        if (!hasOwn && overlay.getLayers().length) {
          const b = overlay.getBounds();
          if (b.isValid()) map.fitBounds(b, { padding: [60, 60], maxZoom: 16 });
        }
      } catch {
        // overlay ixtiyoriy
      }
    })();
    return () => {
      cancelled = true;
      if (overlayRef.current && mapRef.current) mapRef.current.removeLayer(overlayRef.current);
      overlayRef.current = null;
    };
  }, [mapReady, contractId, fetchGeoList, t]);

  // =====================================================================
  // Xo'jalik / kontur navigatsiyasi
  // =====================================================================
  const clearKonturLayer = () => {
    if (konturLayerRef.current && mapRef.current) mapRef.current.removeLayer(konturLayerRef.current);
    konturLayerRef.current = null;
    konturBoundaryRef.current = null;
  };

  const handleViloyatChange = (id: string) => {
    setViloyatId(id);
    handleXojalikChange("");
  };

  const handleXojalikChange = async (id: string) => {
    setXojalikId(id);
    setKonturId("");
    setKonturSearch("");
    clearKonturLayer();
    const map = mapRef.current;
    if (xojalikBoundaryLayerRef.current && map) map.removeLayer(xojalikBoundaryLayerRef.current);
    xojalikBoundaryLayerRef.current = null;
    xojalikBoundaryRef.current = null;
    if (!id || !map) {
      validateDrawn();
      return;
    }
    const loc = xojalikLocations.find((x) => x.id === id);
    if (loc) flyToXojalik(map, loc);
    try {
      const detail = await fetchXojalikLocation(id, true).unwrap();
      if (!mapRef.current || !detail?.boundary_geojson) return;
      xojalikBoundaryRef.current = detail.boundary_geojson;
      const layer = createXojalikBoundaryLayer(detail.boundary_geojson);
      if (layer) {
        layer.addTo(mapRef.current);
        layer.bringToBack();
        xojalikBoundaryLayerRef.current = layer;
      }
    } catch {
      // chegara yo'q
    } finally {
      validateDrawn();
    }
  };

  const handleKonturChange = async (id: string) => {
    setKonturId(id);
    clearKonturLayer();
    if (!id) {
      validateDrawn();
      return;
    }
    try {
      const detail = await fetchKontur(id, true).unwrap();
      const map = mapRef.current;
      if (!detail || !map) return;
      flyToKontur(map, detail);
      const layer = createKonturHighlightLayer(detail, t("billing.kontur"));
      if (layer) {
        layer.addTo(map);
        konturLayerRef.current = layer;
        window.setTimeout(() => konturLayerRef.current?.openPopup(), 900);
      }
      konturBoundaryRef.current = detail.geojson || null;
    } catch {
      // kontur topilmadi
    } finally {
      validateDrawn();
    }
  };

  // =====================================================================
  // KMZ / KML
  // =====================================================================
  const drawGeoJson = (geojson: GeoJsonFeatureCollection) => {
    const map = mapRef.current;
    const drawn = drawnItemsRef.current;
    if (!map || !drawn) return;
    drawn.clearLayers();
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    let hasPolygon = false;
    let firstPoint: L.LatLng | null = null;
    L.geoJSON(geojson as GeoJSON.GeoJsonObject, { style: { color: OWN_COLOR, weight: 3, fillOpacity: 0.25 } }).eachLayer(
      (layer) => {
        const feature = (layer as L.Layer & { feature?: GeoJSON.Feature }).feature;
        if (feature?.geometry?.type === "Point") {
          if (!firstPoint) firstPoint = (layer as L.Marker).getLatLng();
        } else {
          drawn.addLayer(layer);
          hasPolygon = true;
        }
      },
    );
    if (hasPolygon) {
      const b = drawn.getBounds();
      if (b.isValid()) map.fitBounds(b, { maxZoom: 17 });
      emitBoundary();
    }
    const polygonCount = hasPolygon ? extractPolygons(drawn.toGeoJSON()).length : 0;
    const point = firstPoint as L.LatLng | null;
    if (point && polygonCount <= 1) {
      markerRef.current = L.marker(point, { icon: pinIcon(OWN_COLOR, [34, 44]) }).addTo(map);
      emitLatLng(point.lat, point.lng);
      if (!hasPolygon) map.setView(point, 14);
    }
    if (hasPolygon) syncPolygonLocations();
    validateDrawn();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    setImporting(true);
    try {
      const geojson = await kmlFileToGeoJson(file);
      drawGeoJson(geojson);
    } catch (err) {
      setImportError(err instanceof GeoFileError ? err.message : t("billing.form_map_file_error"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // =====================================================================
  // To'liq ekran (Fullscreen API — dialog transform'idan qat'i nazar ishlaydi)
  // =====================================================================
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === wrapperRef.current;
      setFullscreen(active);
      window.setTimeout(() => mapRef.current?.invalidateSize(), 200);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else setFullscreen((v) => !v);
    } catch {
      setFullscreen((v) => !v);
    }
    window.setTimeout(() => mapRef.current?.invalidateSize(), 300);
  };

  const nativeSelect =
    "h-8 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-slate-100 disabled:opacity-50";

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-[200px] flex-1 text-xs text-slate-500 dark:text-slate-400">{t("billing.form_map_hint")}</p>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={GEO_FILE_ACCEPT}
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              disabled={importing || !mapReady}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importing ? <Loader2 className="animate-spin" /> : <Upload />}
              {importing ? t("billing.form_map_uploading") : t("billing.form_map_upload")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearAll}
              disabled={!mapReady}
              className="rounded-lg hover:text-red-600 hover:border-red-400"
            >
              <Eraser />
              {t("billing.form_map_clear")}
            </Button>
          </div>
        </div>
      )}
      {importError && <p className="text-xs font-medium text-red-600 dark:text-red-400">{importError}</p>}
      {warningTarget && (
        <p className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          {t("billing.form_map_overlap_warning", {
            target: t(warningTarget === "kontur" ? "billing.form_map_target_kontur" : "billing.form_map_target_xojalik"),
          })}
        </p>
      )}

      <div
        ref={wrapperRef}
        className={cn(
          "relative z-0 isolate w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800",
          fullscreen ? "fixed inset-0 z-[1000] h-screen w-screen rounded-none border-0" : "h-[420px]",
        )}
      >
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />

        {/* Xo'jalikka o'tish — native select'lar (to'liq ekranda ham ochiladi) */}
        <div
          className={cn(
            "absolute left-2.5 top-2.5 z-[1000] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-md",
            panelCollapsed ? "w-auto" : "w-[230px] max-w-[calc(100%-70px)]",
          )}
        >
          <button
            type="button"
            onClick={() => setPanelCollapsed((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:text-blue-600"
            aria-expanded={!panelCollapsed}
          >
            <span>{t("billing.goto_xojalik")}</span>
            {panelCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!panelCollapsed && (
            <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
              <select
                className={nativeSelect}
                value={viloyatId}
                onChange={(e) => handleViloyatChange(e.target.value)}
                aria-label={t("billing.select_region")}
              >
                <option value="">{t("billing.select_region")}</option>
                {viloyatlar.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                className={nativeSelect}
                value={xojalikId}
                disabled={!viloyatId}
                onChange={(e) => void handleXojalikChange(e.target.value)}
                aria-label={t("billing.select_xojalik")}
              >
                <option value="">{t("billing.select_xojalik")}</option>
                {xojaliklarByRegion.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <input
                className={nativeSelect}
                value={konturSearch}
                disabled={!xojalikId}
                onChange={(e) => setKonturSearch(e.target.value)}
                placeholder={t("billing.kontur_search_ph")}
              />
              <select
                className={nativeSelect}
                value={konturId}
                disabled={!xojalikId || konturLoading}
                onChange={(e) => void handleKonturChange(e.target.value)}
                aria-label={t("billing.select_kontur")}
              >
                <option value="">{konturLoading ? t("billing.loading") : t("billing.select_kontur")}</option>
                {filteredKonturlar.map((k) => (
                  <option key={k.id} value={k.id}>
                    №{k.kontur_raqami}
                    {k.area_ga ? ` — ${k.area_ga} ga` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2">
          {!readOnly && (
            <button
              type="button"
              title={t("billing.form_map_clear")}
              onClick={clearAll}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-md hover:text-red-600"
            >
              <Eraser size={17} />
            </button>
          )}
          <button
            type="button"
            title={fullscreen ? t("billing.form_map_exit_fullscreen") : t("billing.form_map_fullscreen")}
            onClick={() => void toggleFullscreen()}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-md hover:text-blue-600"
          >
            {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>

        {!mapReady && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}

export default BoundaryMap;
