// KML/KMZ ↔ GeoJSON (billing ContractBoundaryMap.handleKmzSelected va
// ContractBoundaryViewModal.geoJsonToKml'dan ko'chirilgan).
import type { BoundaryGeoJson, GeoJsonFeature, GeoJsonFeatureCollection } from "./types";
import { extractPolygons, type PolygonCoords } from "./contractPolygons";

export class GeoFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoFileError";
  }
}

export const GEO_FILE_ACCEPT = ".kml,.kmz";

/** KMZ (zip) yoki KML faylidan KML matnini o'qiydi. */
export const readKmlText = async (file: File): Promise<string> => {
  const isKmz = file.name.toLowerCase().endsWith(".kmz");
  if (!isKmz) return file.text();

  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  let kmlEntryName: string | null = null;
  zip.forEach((relativePath) => {
    if (relativePath.toLowerCase().endsWith(".kml") && !kmlEntryName) {
      kmlEntryName = relativePath;
    }
  });
  if (!kmlEntryName) {
    throw new GeoFileError("KMZ fayl ichida .kml topilmadi");
  }
  const entry = zip.file(kmlEntryName);
  if (!entry) {
    throw new GeoFileError("KMZ fayl ichida .kml topilmadi");
  }
  return entry.async("text");
};

/**
 * KML matn → GeoJSON FeatureCollection (@tmcw/togeojson). Bo'sh bo'lsa xato.
 */
export const kmlTextToGeoJson = async (kmlText: string): Promise<GeoJsonFeatureCollection> => {
  const togeojson = await import("@tmcw/togeojson");
  const kmlDoc = new DOMParser().parseFromString(kmlText, "text/xml");
  const parserError = kmlDoc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new GeoFileError("KML fayl formati noto'g'ri");
  }
  const geojson = togeojson.kml(kmlDoc) as unknown as GeoJsonFeatureCollection;
  if (!geojson.features || geojson.features.length === 0) {
    throw new GeoFileError("Fayl ichida chegara yoki nuqta ma'lumoti topilmadi");
  }
  return geojson;
};

/** KML/KMZ fayl → GeoJSON FeatureCollection. */
export const kmlFileToGeoJson = async (file: File): Promise<GeoJsonFeatureCollection> =>
  kmlTextToGeoJson(await readKmlText(file));

export interface SplitGeoJson {
  /** Faqat poligon/chiziq geometriyali feature'lar (chegara). */
  boundary: GeoJsonFeatureCollection | null;
  /** Fayldagi birinchi Point (joylashuv) — [lat, lng]. */
  firstPoint: { lat: number; lng: number } | null;
  polygonCount: number;
}

/**
 * Yuklangan GeoJSON'ni chegara va joylashuv nuqtasiga ajratadi
 * (billing drawGeoJsonOnMap mantig'i): Point'lar chegaraga kirmaydi.
 */
export const splitGeoJson = (geojson: GeoJsonFeatureCollection): SplitGeoJson => {
  const boundaryFeatures: GeoJsonFeature[] = [];
  let firstPoint: { lat: number; lng: number } | null = null;

  for (const feature of geojson.features || []) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "Point") {
      const coords = (geometry as { coordinates?: number[] }).coordinates;
      if (!firstPoint && coords && coords.length >= 2) {
        firstPoint = { lat: coords[1], lng: coords[0] };
      }
      continue;
    }
    boundaryFeatures.push(feature);
  }

  const boundary: GeoJsonFeatureCollection | null = boundaryFeatures.length
    ? { type: "FeatureCollection", features: boundaryFeatures }
    : null;

  return {
    boundary,
    firstPoint,
    polygonCount: boundary ? extractPolygons(boundary).length : 0,
  };
};

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ringToKml = (ring: number[][]) => ring.map((c) => `${c[0]},${c[1]},0`).join(" ");

const polygonPlacemark = (coords: PolygonCoords, name: string) => {
  const holes = coords
    .slice(1)
    .map(
      (hole) => `
            <innerBoundaryIs>
              <LinearRing>
                <coordinates>${ringToKml(hole)}</coordinates>
              </LinearRing>
            </innerBoundaryIs>`,
    )
    .join("");
  return `
        <Placemark>
          <name>${xmlEscape(name)}</name>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing>
                <coordinates>${ringToKml(coords[0])}</coordinates>
              </LinearRing>
            </outerBoundaryIs>${holes}
          </Polygon>
        </Placemark>`;
};

export interface GeoJsonToKmlOptions {
  documentName?: string;
  polygonName?: string;
  pointName?: string;
  /** Qo'shimcha joylashuv nuqtasi (shartnoma latitude/longitude). */
  point?: { lat: number; lng: number } | null;
}

/** GeoJSON (Feature/FeatureCollection/geometriya) → KML matni. */
export const geoJsonToKml = (
  geojson: BoundaryGeoJson | null | undefined,
  options: GeoJsonToKmlOptions = {},
): string => {
  const {
    documentName = "Shartnoma - yer chegarasi",
    polygonName = "Shartnoma yeri chegarasi",
    pointName = "Joylashuv",
    point = null,
  } = options;

  const placemarks: string[] = [];

  // Barcha poligonlar (Polygon, MultiPolygon, GeometryCollection, FeatureCollection)
  extractPolygons(geojson).forEach((coords) => {
    placemarks.push(polygonPlacemark(coords, polygonName));
  });

  // Point feature'lar
  const features: Array<GeoJsonFeature | BoundaryGeoJson> =
    geojson && (geojson as GeoJsonFeatureCollection).type === "FeatureCollection"
      ? (geojson as GeoJsonFeatureCollection).features
      : geojson
        ? [geojson]
        : [];
  for (const feature of features) {
    const geometry =
      (feature as GeoJsonFeature).type === "Feature"
        ? (feature as GeoJsonFeature).geometry
        : (feature as { type: string; coordinates?: unknown });
    if (geometry && geometry.type === "Point") {
      const c = (geometry as { coordinates?: number[] }).coordinates;
      if (c && c.length >= 2) {
        placemarks.push(`
        <Placemark>
          <name>${xmlEscape(pointName)}</name>
          <Point>
            <coordinates>${c[0]},${c[1]},0</coordinates>
          </Point>
        </Placemark>`);
      }
    }
  }

  if (point) {
    placemarks.push(`
        <Placemark>
          <name>${xmlEscape(pointName)}</name>
          <Point>
            <coordinates>${point.lng},${point.lat},0</coordinates>
          </Point>
        </Placemark>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEscape(documentName)}</name>
    ${placemarks.join("\n")}
  </Document>
</kml>`;
};

/** GeoJSON → KMZ (zip ichida doc.kml) Blob. */
export const geoJsonToKmzBlob = async (
  geojson: BoundaryGeoJson,
  options: GeoJsonToKmlOptions = {},
): Promise<Blob> => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("doc.kml", geoJsonToKml(geojson, options));
  return zip.generateAsync({ type: "blob" });
};

/** Shartnoma chegarasini `shartnoma-<raqam>-chegara.kmz` sifatida yuklab beradi. */
export const downloadBoundaryKmz = async (
  geojson: BoundaryGeoJson,
  contractNumber?: string | null,
  options: GeoJsonToKmlOptions = {},
): Promise<void> => {
  const blob = await geoJsonToKmzBlob(geojson, {
    documentName: `${contractNumber || "Shartnoma"} - yer chegarasi`,
    ...options,
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shartnoma-${contractNumber || "yer"}-chegara.kmz`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
