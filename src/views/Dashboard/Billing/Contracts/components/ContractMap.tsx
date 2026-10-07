import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../Gis/gis.css";
import { setupBaseMap, type BaseLayerLabels } from "@/features/billing/mapLayers";
import { createContractPinIcon } from "@/features/billing/markers";
import { formatAreaGa, getContractMarkerPoints } from "@/features/billing/contractPolygons";
import { formatCoord } from "@/features/billing/format";
import type { BoundaryGeoJson } from "@/features/billing/types";

const CONTRACT_PIN_COLOR = "#e11d1d";
const BOUNDARY_STYLE: L.PathOptions = { color: "#2563eb", weight: 3, fillColor: "#2563eb", fillOpacity: 0.25 };
/** Chegara bo'lmasa — Toshkent markazi (billing bilan bir xil). */
const BOUNDARY_FALLBACK_CENTER: [number, number] = [41.311081, 69.240562];

export interface ContractMapSource {
  latitude?: number | string | null;
  longitude?: number | string | null;
  boundary_geojson?: BoundaryGeoJson | null;
}

interface ContractMapProps {
  contract: ContractMapSource | null | undefined;
  /** location — faqat pinlar (zoom 14 / pinlarga mos); boundary — faqat chegara; both — ikkalasi. */
  mode: "location" | "boundary" | "both";
  height?: number;
  className?: string;
}

/**
 * Leaflet xarita (Esri + OSM `setupBaseMap` orqali). Dialog ichida ishlatilganda
 * kontent ochilgandan keyin mount bo'ladi — shuning uchun invalidateSize
 * setTimeout bilan chaqiriladi; unmount'da xarita olib tashlanadi.
 */
function ContractMap({ contract, mode, height = 500, className = "" }: ContractMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelsRef = useRef<BaseLayerLabels & { polygon: string }>({
    esri: t("billing.layer_esri"),
    yandex: t("billing.layer_yandex"),
    street: t("billing.layer_street"),
    xojaliklar: t("billing.layer_xojaliklar"),
    polygon: t("billing.polygon"),
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const labels = labelsRef.current;
    const showBoundary = mode !== "location";
    const showPins = mode !== "boundary";

    const { map } = setupBaseMap(container, {
      center: BOUNDARY_FALLBACK_CENTER,
      zoom: 6,
      labels,
    });

    let boundaryBounds: L.LatLngBounds | null = null;
    if (showBoundary && contract?.boundary_geojson) {
      try {
        const layer = L.geoJSON(contract.boundary_geojson as GeoJSON.GeoJsonObject, { style: BOUNDARY_STYLE });
        layer.addTo(map);
        const b = layer.getBounds();
        if (b.isValid()) boundaryBounds = b;
      } catch {
        boundaryBounds = null;
      }
    }

    const pins = showPins && contract ? getContractMarkerPoints(contract) : [];
    const icon = createContractPinIcon(CONTRACT_PIN_COLOR);
    const pinBounds = L.latLngBounds([]);
    pins.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      const coords = `${formatCoord(p.lat)}, ${formatCoord(p.lng)}`;
      const text = p.location
        ? `${labels.polygon} ${p.location.index} / ${p.location.total}: ${formatAreaGa(p.location.areaGa)} ga<br>${coords}`
        : coords;
      marker.bindTooltip(text, { direction: "top", offset: [0, -52] });
      pinBounds.extend([p.lat, p.lng]);
    });

    // Ko'rinish: location rejimida pinlar asosiy, aks holda chegara
    if (mode === "location") {
      if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 14);
      else if (pins.length > 1 && pinBounds.isValid()) map.fitBounds(pinBounds, { padding: [60, 60], maxZoom: 16 });
      else if (boundaryBounds) map.fitBounds(boundaryBounds, { padding: [40, 40] });
    } else if (boundaryBounds) {
      map.fitBounds(boundaryBounds, { padding: [40, 40], maxZoom: 17 });
    } else if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14);
    } else if (pins.length > 1 && pinBounds.isValid()) {
      map.fitBounds(pinBounds, { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView(BOUNDARY_FALLBACK_CENTER, 6);
    }

    const t1 = window.setTimeout(() => map.invalidateSize(), 150);
    const t2 = window.setTimeout(() => map.invalidateSize(), 500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
    };
  }, [contract, mode]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0 isolate ${className}`}
    />
  );
}

export default ContractMap;
