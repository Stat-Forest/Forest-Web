import * as L from "leaflet";

// Yandex sun'iy yo'ldosh plitkalari elliptik (WGS84) Merkator proyeksiyasida
// indekslangan, Leaflet'ning standart CRS'i (va Esri/OSM) esa sferik Merkator.
// Leaflet'ning x/y'sini to'g'ridan-to'g'ri Yandex'ga bersak, boshqa joyning
// plitkasi keladi — marker/poligon qatlamga qarab boshqa yerga "siljiydi".
// Shuning uchun Leaflet so'ragan plitka markazining real lat/lng'ini topib,
// uni Yandex'ning o'z plitka to'riga qayta proyeksiyalaymiz.
const WGS84_ECCENTRICITY = 0.0818191908426;

const isometricLatitude = (latRad: number, eccentricity: number) => {
  const sinLat = Math.sin(latRad);
  return (
    Math.log(Math.tan(Math.PI / 4 + latRad / 2)) +
    (eccentricity / 2) *
      Math.log((1 - eccentricity * sinLat) / (1 + eccentricity * sinLat))
  );
};

const tileCenterToLatLng = (x: number, y: number, z: number) => {
  const n = Math.pow(2, z);
  const lng = ((x + 0.5) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
};

const latLngToYandexTile = (lat: number, lng: number, z: number) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lng * Math.PI) / 180;
  const worldSize = 256 * Math.pow(2, z);
  const xp = ((lonRad + Math.PI) / (2 * Math.PI)) * worldSize;
  const iso = isometricLatitude(latRad, WGS84_ECCENTRICITY);
  const yp = ((Math.PI - iso) / (2 * Math.PI)) * worldSize;
  return { x: Math.floor(xp / 256), y: Math.floor(yp / 256) };
};

interface YandexTileLayerInternals extends L.TileLayer {
  _url: string;
  _getSubdomain(coords: L.Coords): string;
}

const YandexTileLayer = L.TileLayer.extend({
  getTileUrl(this: YandexTileLayerInternals, coords: L.Coords) {
    const { lat, lng } = tileCenterToLatLng(coords.x, coords.y, coords.z);
    const { x, y } = latLngToYandexTile(lat, lng, coords.z);
    const data = L.Util.extend({}, this.options, {
      s: this._getSubdomain(coords),
      x,
      y,
      z: coords.z,
    });
    return L.Util.template(this._url, data);
  },
}) as unknown as new (urlTemplate: string, options?: L.TileLayerOptions) => L.TileLayer;

export const createYandexSatelliteLayer = (
  urlTemplate: string,
  options: L.TileLayerOptions,
): L.TileLayer => new YandexTileLayer(urlTemplate, options);

export const ESRI_SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ESRI_BOUNDARIES_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const YANDEX_SATELLITE_URL =
  "https://sat0{s}.maps.yandex.net/tiles?l=sat&v=3.1268.0&x={x}&y={y}&z={z}&scale=1&lang=uz_UZ";

export interface BaseLayers {
  /** Esri World Imagery — standart tanlangan qatlam. */
  satellite: L.TileLayer;
  yandex: L.TileLayer;
  street: L.TileLayer;
  /** Esri chegaralar va joy nomlari — har doim yoqilgan overlay. */
  boundaries: L.TileLayer;
}

export const createBaseLayers = (): BaseLayers => {
  const street = L.tileLayer(OSM_URL, {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  });
  // Esri'ning bepul tasvirlari qishloq/o'rmon hududlarida ~17-zoomda tugaydi;
  // undan keyin "Map data not yet available" plitkasini qaytaradi. maxNativeZoom
  // Leaflet'ni so'ramaslikka va oxirgi real plitkani kattalashtirishga majburlaydi.
  const satellite = L.tileLayer(ESRI_SATELLITE_URL, {
    attribution: "Tiles © Esri",
    maxZoom: 19,
    maxNativeZoom: 17,
  });
  const yandex = createYandexSatelliteLayer(YANDEX_SATELLITE_URL, {
    attribution: "Tiles © Yandex",
    maxZoom: 19,
    maxNativeZoom: 18,
    subdomains: "1234",
  });
  const boundaries = L.tileLayer(ESRI_BOUNDARIES_URL, {
    attribution: "Boundaries © Esri",
    maxZoom: 19,
  });
  return { satellite, yandex, street, boundaries };
};

export interface BaseLayerLabels {
  esri: string;
  yandex: string;
  street: string;
  xojaliklar: string;
}

export const DEFAULT_BASE_LAYER_LABELS: BaseLayerLabels = {
  esri: "Sun'iy yo'ldosh (Esri)",
  yandex: "Sun'iy yo'ldosh (Yandex)",
  street: "Yo'l xaritasi",
  xojaliklar: "Xo'jaliklar",
};

/**
 * Xaritani stat'dagi standart ko'rinishda sozlaydi: Esri satellite + Esri
 * chegaralar, zoom boshqaruvi pastki-chapda (yuqori-chapda "Xo'jalikka
 * o'tish" paneli turadi), qatlam nazorati yuqori-o'ngda.
 * Qaytaradi: qatlamlar va overlay'lar (chaqiruvchi o'z guruhlarini qo'shadi).
 */
export const setupBaseMap = (
  container: HTMLElement,
  options: {
    center: L.LatLngExpression;
    zoom: number;
    overlays?: Record<string, L.Layer>;
    labels?: BaseLayerLabels;
    layerControl?: boolean;
  },
): { map: L.Map; layers: BaseLayers; layerControl: L.Control.Layers | null } => {
  const labels = options.labels ?? DEFAULT_BASE_LAYER_LABELS;
  const map = L.map(container, { zoomControl: false }).setView(options.center, options.zoom);
  L.control.zoom({ position: "bottomleft" }).addTo(map);

  const layers = createBaseLayers();
  layers.satellite.addTo(map);
  layers.boundaries.addTo(map);

  let layerControl: L.Control.Layers | null = null;
  if (options.layerControl !== false) {
    layerControl = L.control
      .layers(
        {
          [labels.esri]: layers.satellite,
          [labels.yandex]: layers.yandex,
          [labels.street]: layers.street,
        },
        options.overlays ?? {},
        { position: "topright" },
      )
      .addTo(map);
  }

  return { map, layers, layerControl };
};
