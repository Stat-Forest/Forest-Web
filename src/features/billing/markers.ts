import * as L from "leaflet";
import { escapeHtml } from "./escapeHtml";
import { formatArea, formatNumber, toNumber } from "./format";
import {
  buildPolygonPopupRowHtml,
  getPolygonLocations,
  type PolygonLocation,
  type PolygonPopupLabels,
} from "./contractPolygons";
import {
  BILLING_ROUTES,
  CONTRACT_DEFAULT_COLOR,
  CONTRACT_STATUS_COLOR,
  KONTUR_HIGHLIGHT_COLOR,
  XOJALIK_COLOR,
} from "./constants";
import type {
  ContractGeoItem,
  ContractStatus,
  PublicGeoItem,
  XojalikKonturDetail,
  XojalikLocation,
} from "./types";

export const statusColor = (status: ContractStatus | string | null | undefined): string =>
  (status && CONTRACT_STATUS_COLOR[status as ContractStatus]) || CONTRACT_DEFAULT_COLOR;

/** Shartnoma joylashuv pini (tomchi) — rang holatga bog'liq. */
export const createContractPinIcon = (color: string): L.DivIcon =>
  L.divIcon({
    className: "gis-contract-marker",
    html: `
      <svg width="44" height="56" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C8.95 0 0 8.95 0 20c0 14.5 20 32 20 32s20-17.5 20-32C40 8.95 31.05 0 20 0z" fill="${color}"/>
        <circle cx="20" cy="20" r="8" fill="#ffffff"/>
      </svg>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    popupAnchor: [0, -50],
  });

// Xo'jalik (davlat o'rmon xo'jaligi) markeri — shartnoma markerlaridan
// (yashil/qizil tomchi) farqlanishi uchun amber rangli bayroqcha.
export const createXojalikIcon = (): L.DivIcon =>
  L.divIcon({
    className: "xojalik-marker",
    html: `
      <svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="17" r="15" fill="${XOJALIK_COLOR}" stroke="#fff" stroke-width="2.5" />
        <path d="M17 8v18M17 8l8 3.5-8 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 27],
    popupAnchor: [0, -22],
  });

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildXojalikPopupHtml = (x: XojalikLocation) => `
  <div class="xojalik-popup">
    <div class="xojalik-popup__title">${escapeHtml(x.name)}</div>
    <div class="xojalik-popup__row">${escapeHtml(x.region_name)}</div>
  </div>
`;

export type XojalikMarker = L.Marker & { xojalikId?: string };

/**
 * Har bir xo'jalik uchun bitta marker bo'lgan layerGroup. Marker bosilganda
 * popup ochiladi va `onMarkerClick` chaqiriladi (masalan chegarani chizish).
 */
export const createXojalikMarkersLayer = (
  xojaliklar: XojalikLocation[],
  onMarkerClick?: (x: XojalikLocation) => void,
): L.LayerGroup => {
  const layer = L.layerGroup();
  const icon = createXojalikIcon();

  xojaliklar.forEach((x) => {
    const lat = num(x.latitude);
    const lng = num(x.longitude);
    if (lat === null || lng === null) return;
    const marker = L.marker([lat, lng], { icon }) as XojalikMarker;
    marker.bindPopup(buildXojalikPopupHtml(x));
    marker.on("click", () => {
      marker.openPopup();
      onMarkerClick?.(x);
    });
    marker.xojalikId = x.id;
    marker.addTo(layer);
  });

  return layer;
};

export const findXojalikMarker = (
  layer: L.LayerGroup | null | undefined,
  xojalikId: string,
): XojalikMarker | undefined =>
  layer?.getLayers().find((m) => (m as XojalikMarker).xojalikId === xojalikId) as
    | XojalikMarker
    | undefined;

// flyToXojalik/flyToKontur uchun umumiy: bounds bo'lsa fitBounds (tarqoq
// hududni butunligicha ko'rsatadi), bo'lmasa markaz atrofiga setView.
// Animatsiyasiz — darhol o'tadi (avvalgi 1.2 s "uchish" o'rniga).
const flyToTarget = (
  map: L.Map,
  target: {
    bounds?: [[number, number], [number, number]] | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  },
  maxZoom: number,
) => {
  if (target.bounds && target.bounds.length === 2) {
    try {
      const bounds = L.latLngBounds(target.bounds);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { maxZoom, padding: [40, 40], animate: false });
        return;
      }
    } catch {
      // markaz bo'yicha setView'ga o'tamiz
    }
  }

  const lat = num(target.latitude);
  const lng = num(target.longitude);
  if (lat !== null && lng !== null) {
    map.setView([lat, lng], maxZoom, { animate: false });
  }
};

export const flyToXojalik = (map: L.Map, xojalik: XojalikLocation) =>
  flyToTarget(map, xojalik, 12);

/** Kontur xo'jalikdan ancha kichik — zoom yaqinroq. */
export const flyToKontur = (map: L.Map, kontur: XojalikKonturDetail) =>
  flyToTarget(map, kontur, 16);

// Xo'jalikning real kontur chegaralari (detail endpoint'dan). Canvas renderer —
// bir necha ming poligonda ham tez ishlaydi (standart SVG renderer'dan farqli).
export const createXojalikBoundaryLayer = (boundaryGeojson: unknown): L.GeoJSON | null => {
  if (!boundaryGeojson) return null;
  // `renderer` GeoJSONOptions tipida yo'q, lekin Leaflet uni ichki Path'larga uzatadi
  const options = {
    renderer: L.canvas(),
    style: {
      color: XOJALIK_COLOR,
      weight: 1.5,
      opacity: 0.9,
      fillColor: XOJALIK_COLOR,
      fillOpacity: 0.15,
    },
  } as L.GeoJSONOptions;
  return L.geoJSON(boundaryGeojson as GeoJSON.GeoJsonObject, options);
};

const buildKonturPopupHtml = (k: XojalikKonturDetail, konturLabel: string) => `
  <div class="xojalik-popup">
    <div class="xojalik-popup__title">${escapeHtml(konturLabel)} №${escapeHtml(k.kontur_raqami || String(k.id))}</div>
    <div class="xojalik-popup__row">${escapeHtml(k.xojalik_name)} (${escapeHtml(k.region_name)})</div>
    ${Object.entries(k.attributes || {})
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(
        ([key, value]) =>
          `<div class="xojalik-popup__row">${escapeHtml(key)}: <b>${escapeHtml(String(value))} ga</b></div>`,
      )
      .join("")}
  </div>
`;

// Tanlangan konturning geometriyasi — xo'jalik chegarasidan (amber) farqli
// ko'k rangda, popup'da KMZ'dagi barcha atributlar.
export const createKonturHighlightLayer = (
  kontur: XojalikKonturDetail,
  konturLabel = "Kontur",
): L.GeoJSON | null => {
  if (!kontur?.geojson) return null;
  const options = {
    renderer: L.canvas(),
    style: {
      color: KONTUR_HIGHLIGHT_COLOR,
      weight: 3,
      opacity: 1,
      fillColor: KONTUR_HIGHLIGHT_COLOR,
      fillOpacity: 0.35,
    },
  } as L.GeoJSONOptions;
  const layer = L.geoJSON(kontur.geojson as GeoJSON.GeoJsonObject, options);
  layer.bindPopup(buildKonturPopupHtml(kontur, konturLabel));
  return layer;
};

export interface ContractPopupLabels extends PolygonPopupLabels {
  renter: string;
  xojalik: string;
  purpose: string;
  area: string;
  debt: string;
  details: string;
  currency: string; // "so'm"
}

export const DEFAULT_CONTRACT_POPUP_LABELS: ContractPopupLabels = {
  renter: "Ijarachi",
  xojalik: "Xo'jalik",
  purpose: "Ijara maqsadi",
  area: "Yer maydoni",
  debt: "Qarzdorlik",
  details: "Batafsil ko'rish →",
  currency: "so'm",
  polygon: "Poligon",
  byMap: "xarita bo'yicha",
};

/** GIS popup HTML (barcha API matnlari escape qilinadi). */
export const buildContractPopupHtml = (
  c: ContractGeoItem,
  location: PolygonLocation | null = null,
  labels: ContractPopupLabels = DEFAULT_CONTRACT_POPUP_LABELS,
): string => {
  const debt = toNumber(c.debt);
  const cur = escapeHtml(labels.currency);
  const debtLine =
    debt > 0
      ? `<span class="gis-popup__debt gis-popup__debt--negative">- ${formatNumber(debt)} ${cur}</span>`
      : debt < 0
        ? `<span class="gis-popup__debt gis-popup__debt--positive">+ ${formatNumber(Math.abs(debt))} ${cur}</span>`
        : `<span class="gis-popup__debt">0 ${cur}</span>`;

  return `
    <div class="gis-popup">
      <div class="gis-popup__header">
        <span class="gis-popup__badge">№ ${escapeHtml(c.contract_number || c.number)}</span>
      </div>
      <div class="gis-popup__row">
        <span class="gis-popup__icon">👤</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(labels.renter)}</div>
          <div class="gis-popup__value">${escapeHtml(c.renter_name) || "-"}</div>
        </div>
      </div>
      <div class="gis-popup__row">
        <span class="gis-popup__icon">🏢</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(labels.xojalik)}</div>
          <div class="gis-popup__value">${escapeHtml(c.xojalik_name) || "-"}</div>
        </div>
      </div>
      <div class="gis-popup__row">
        <span class="gis-popup__icon">🎯</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(labels.purpose)}</div>
          <div class="gis-popup__value">${escapeHtml(c.activity_name) || "-"}</div>
        </div>
      </div>
      <div class="gis-popup__row">
        <span class="gis-popup__icon">📐</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(labels.area)}</div>
          <div class="gis-popup__value">${escapeHtml(c.rent_area)} ga</div>
        </div>
      </div>${buildPolygonPopupRowHtml(location, labels)}
      <div class="gis-popup__row">
        <span class="gis-popup__icon">💰</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(labels.debt)}</div>
          <div class="gis-popup__value">${debtLine}</div>
        </div>
      </div>
      <a href="${BILLING_ROUTES.detail(escapeHtml(c.id))}" class="gis-popup__link" data-contract-id="${escapeHtml(c.id)}">
        ${escapeHtml(labels.details)}
      </a>
    </div>
  `;
};

// ---------------------------------------------------------------------------
// Ochiq (landing) xarita popup'i — maxfiylik: ijarachi va pul ma'lumotlari YO'Q
// ---------------------------------------------------------------------------

export interface PublicContractPopupLabels extends PolygonPopupLabels {
  xojalik: string;
  purpose: string;
  area: string;
}

const popupRowHtml = (icon: string, label: string, value: string) => `
      <div class="gis-popup__row">
        <span class="gis-popup__icon">${icon}</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(label)}</div>
          <div class="gis-popup__value">${value}</div>
        </div>
      </div>`;

/** Faqat: № / xo'jalik / ijara maqsadi / yer maydoni (+ poligon qatori). Havola yo'q. */
export const buildPublicContractPopupHtml = (
  c: PublicGeoItem,
  location: PolygonLocation | null,
  labels: PublicContractPopupLabels,
): string => `
    <div class="gis-popup">
      <div class="gis-popup__header">
        <span class="gis-popup__badge">№ ${escapeHtml(c.contract_number || c.number)}</span>
      </div>${popupRowHtml("🏢", labels.xojalik, escapeHtml(c.xojalik_name) || "-")}${popupRowHtml(
        "🎯",
        labels.purpose,
        escapeHtml(c.activity_name) || "-",
      )}${popupRowHtml(
        "📐",
        labels.area,
        c.rent_area === null || c.rent_area === undefined ? "-" : escapeHtml(formatArea(c.rent_area)),
      )}${buildPolygonPopupRowHtml(location, labels)}
    </div>
  `;

// ---------------------------------------------------------------------------
// Shartnomalarni xaritaga chizish (GIS monitoring va landing'dagi ochiq xarita)
// ---------------------------------------------------------------------------

interface ContractGeometry {
  latitude?: number | string | null;
  longitude?: number | string | null;
  boundary_geojson?: unknown;
}

export interface DrawContractsOptions<T> {
  color: (contract: T) => string;
  popupHtml: (contract: T, location: PolygonLocation | null) => string;
}

export type ContractBoundsItem = L.LatLngBounds | L.LatLng;

/**
 * Shartnomalarni `layer`ga chizadi:
 * - chegara (bo'lsa) — har doim ko'rinadi;
 * - bir nechta poligonli chegara — har bir poligonga o'z nuqtasida alohida pin
 *   (popup'da shu poligon raqami/maydoni), dblclick — o'sha poligonga;
 * - aks holda bitta pin (lat/lng, bo'lmasa chegara markazi), dblclick — chegaraga.
 * Qaytaradi: `fitMapToContracts` uchun chegaralar/nuqtalar.
 */
export const drawContractsOnLayer = <T extends ContractGeometry>(
  map: L.Map,
  layer: L.LayerGroup,
  contracts: T[],
  { color: colorFor, popupHtml }: DrawContractsOptions<T>,
): ContractBoundsItem[] => {
  const allBounds: ContractBoundsItem[] = [];
  const iconCache = new Map<string, L.DivIcon>();
  const iconFor = (color: string) => {
    let icon = iconCache.get(color);
    if (!icon) {
      icon = createContractPinIcon(color);
      iconCache.set(color, icon);
    }
    return icon;
  };

  contracts.forEach((c) => {
    const color = colorFor(c);
    let boundaryLayer: L.GeoJSON | null = null;
    let markerLatLng: L.LatLng | null = null;

    if (c.boundary_geojson) {
      try {
        boundaryLayer = L.geoJSON(c.boundary_geojson as GeoJSON.GeoJsonObject, {
          style: { color, weight: 2, fillColor: color, fillOpacity: 0.3, opacity: 1 },
        });
        boundaryLayer.addTo(layer);
        const b = boundaryLayer.getBounds();
        if (b.isValid()) {
          allBounds.push(b);
          markerLatLng = b.getCenter();
        }
      } catch {
        boundaryLayer = null;
      }
    }

    const polygonLocations = getPolygonLocations(c.boundary_geojson);
    if (polygonLocations.length > 1) {
      polygonLocations.forEach((location) => {
        const polygonMarker = L.marker(L.latLng(location.lat, location.lng), {
          icon: iconFor(color),
        });
        polygonMarker.bindPopup(popupHtml(c, location));
        polygonMarker.on("click", () => polygonMarker.openPopup());
        polygonMarker.on("dblclick", () => {
          const polygonBounds = L.geoJSON(location.polygon).getBounds();
          if (polygonBounds.isValid()) {
            map.fitBounds(polygonBounds, { maxZoom: 17, padding: [20, 20] });
          }
        });
        polygonMarker.addTo(layer);
      });
      return;
    }

    const lat = num(c.latitude);
    const lng = num(c.longitude);
    if (lat !== null && lng !== null) {
      markerLatLng = L.latLng(lat, lng);
      allBounds.push(markerLatLng);
    }
    if (!markerLatLng) return;

    const point = markerLatLng;
    const marker = L.marker(point, { icon: iconFor(color) });
    marker.bindPopup(popupHtml(c, null));
    marker.on("click", () => marker.openPopup());
    marker.on("dblclick", () => {
      const b = boundaryLayer?.getBounds();
      if (b && b.isValid()) {
        map.fitBounds(b, { maxZoom: 17, padding: [20, 20] });
      } else {
        map.setView(point, 16);
      }
    });
    marker.addTo(layer);
  });

  return allBounds;
};

/** `drawContractsOnLayer` natijasiga xaritani moslaydi (bo'sh bo'lsa — hech narsa). */
export const fitMapToContracts = (
  map: L.Map,
  items: ContractBoundsItem[],
  options: L.FitBoundsOptions = { padding: [30, 30] },
): boolean => {
  if (items.length === 0) return false;
  try {
    const bounds = L.latLngBounds([]);
    items.forEach((b) => bounds.extend(b));
    if (!bounds.isValid()) return false;
    map.fitBounds(bounds, options);
    return true;
  } catch {
    // noto'g'ri koordinatalar — e'tiborsiz
    return false;
  }
};
