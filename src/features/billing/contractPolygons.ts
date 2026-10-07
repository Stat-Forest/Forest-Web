import turfArea from "@turf/area";
import { escapeHtml } from "./escapeHtml";
import { formatCoord } from "./format";

// Shartnoma chegarasi (boundary_geojson) bir nechta alohida poligondan iborat
// bo'lishi mumkin (masalan KMZ fayldagi MultiGeometry). Har bir poligon o'z
// joylashuv nuqtasiga ega bo'lishi kerak — butun to'plamning umumiy markazi
// odatda poligonlar orasidagi bo'sh joyga tushib qoladi.

export type Position = number[]; // [lng, lat, (alt)]
export type PolygonCoords = Position[][]; // [outerRing, ...holes]

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: PolygonCoords;
}

export interface PolygonLocation {
  /** 1 dan boshlanadi */
  index: number;
  total: number;
  lat: number;
  lng: number;
  areaGa: number;
  polygon: PolygonGeometry;
}

interface GeoLike {
  type?: string;
  features?: GeoLike[];
  geometry?: GeoLike | null;
  geometries?: GeoLike[];
  coordinates?: unknown;
}

const collectPolygons = (geo: GeoLike | null | undefined, out: PolygonCoords[]) => {
  if (!geo || typeof geo !== "object") return;
  switch (geo.type) {
    case "FeatureCollection":
      (geo.features || []).forEach((f) => collectPolygons(f, out));
      break;
    case "Feature":
      collectPolygons(geo.geometry, out);
      break;
    case "GeometryCollection":
      (geo.geometries || []).forEach((g) => collectPolygons(g, out));
      break;
    case "Polygon": {
      const coords = geo.coordinates as PolygonCoords | undefined;
      if (coords?.[0]?.length) out.push(coords);
      break;
    }
    case "MultiPolygon":
      ((geo.coordinates as PolygonCoords[] | undefined) || []).forEach((p) => {
        if (p?.[0]?.length) out.push(p);
      });
      break;
  }
};

export const extractPolygons = (geojson: unknown): PolygonCoords[] => {
  const out: PolygonCoords[] = [];
  let geo = geojson;
  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return out;
    }
  }
  collectPolygons(geo as GeoLike, out);
  return out;
};

const isPointInRing = (x: number, y: number, ring: Position[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

const isPointInPolygon = (x: number, y: number, polygon: PolygonCoords) =>
  isPointInRing(x, y, polygon[0]) &&
  !polygon.slice(1).some((hole) => isPointInRing(x, y, hole));

// Poligon joylashuv nuqtasi. Avval chegaralovchi to'rtburchak markazi olinadi
// (Leaflet getBounds().getCenter() bilan bir xil). Faqat u poligon ichiga
// tushmasa ("U"/"L" shaklli yer), o'sha kenglik bo'yicha poligonni kesib
// o'tuvchi eng keng ichki kesma o'rtasi olinadi — nuqta har doim yerning o'zida.
export const polygonLabelPoint = (polygon: PolygonCoords): { lat: number; lng: number } => {
  const outer = polygon[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  outer.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  if (isPointInPolygon(cx, cy, polygon)) return { lat: cy, lng: cx };

  const crossings: number[] = [];
  polygon.forEach((ring) => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > cy !== yj > cy) {
        crossings.push(((xj - xi) * (cy - yi)) / (yj - yi) + xi);
      }
    }
  });
  crossings.sort((a, b) => a - b);
  let best: number | null = null;
  let bestWidth = -1;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const width = crossings[i + 1] - crossings[i];
    if (width > bestWidth) {
      bestWidth = width;
      best = (crossings[i] + crossings[i + 1]) / 2;
    }
  }
  return best === null ? { lat: cy, lng: cx } : { lat: cy, lng: best };
};

/** Har bir poligon uchun alohida joylashuv (nuqta + maydon). */
export const getPolygonLocations = (geojson: unknown): PolygonLocation[] => {
  const polygons = extractPolygons(geojson);
  return polygons.map((coordinates, i) => {
    const polygon: PolygonGeometry = { type: "Polygon", coordinates };
    const { lat, lng } = polygonLabelPoint(coordinates);
    let areaGa = 0;
    try {
      areaGa = turfArea(polygon) / 10000;
    } catch {
      areaGa = 0;
    }
    return { index: i + 1, total: polygons.length, lat, lng, areaGa, polygon };
  });
};

export interface ContractMarkerPoint {
  lat: number;
  lng: number;
  /** Bir nechta poligonli shartnomada — shu nuqtaga tegishli poligon */
  location: PolygonLocation | null;
}

// Xaritada shartnoma uchun qo'yiladigan joylashuv belgilari:
// - 2 va undan ortiq poligon: har bir poligonga bittadan, o'z nuqtasida
// - bitta poligon yoki poligonsiz: bitta belgi — saqlangan latitude/longitude,
//   u bo'lmasa poligon nuqtasi
export const getContractMarkerPoints = (contract: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  boundary_geojson?: unknown;
}): ContractMarkerPoint[] => {
  const locations = getPolygonLocations(contract.boundary_geojson);
  if (locations.length > 1) {
    return locations.map((location) => ({ lat: location.lat, lng: location.lng, location }));
  }
  const lat = Number(contract.latitude);
  const lng = Number(contract.longitude);
  if (contract.latitude && contract.longitude && !isNaN(lat) && !isNaN(lng)) {
    return [{ lat, lng, location: null }];
  }
  if (locations.length === 1) {
    return [{ lat: locations[0].lat, lng: locations[0].lng, location: null }];
  }
  return [];
};

export const formatAreaGa = (value: number) =>
  (Math.round(value * 100) / 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export interface PolygonPopupLabels {
  polygon: string; // "Poligon"
  byMap: string; // "xarita bo'yicha"
}

// Bir nechta poligonli shartnoma belgisi bosilganda popup'da ko'rsatiladigan
// qator: qaysi poligon ekani, uning o'z maydoni va o'z koordinatasi.
// Bitta poligonli shartnomada bo'sh.
export const buildPolygonPopupRowHtml = (
  location: PolygonLocation | null,
  labels: PolygonPopupLabels = { polygon: "Poligon", byMap: "xarita bo'yicha" },
) => {
  if (!location) return "";
  return `
      <div class="gis-popup__row">
        <span class="gis-popup__icon">📍</span>
        <div>
          <div class="gis-popup__label">${escapeHtml(labels.polygon)} ${location.index} / ${location.total}</div>
          <div class="gis-popup__value">${formatAreaGa(location.areaGa)} ga (${escapeHtml(labels.byMap)})</div>
          <div class="gis-popup__value">${formatCoord(location.lat)}, ${formatCoord(location.lng)}</div>
        </div>
      </div>`;
};
