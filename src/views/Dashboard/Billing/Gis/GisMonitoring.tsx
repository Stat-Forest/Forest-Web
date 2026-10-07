import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./gis.css";
import { Filter, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BillingLayout from "../BillingLayout";
import XojalikPanel from "./XojalikPanel";
import GisFilterDialog from "./GisFilterDialog";
import {
  EMPTY_GIS_FILTERS,
  gisFiltersToApi,
  hasActiveGisFilters,
  type GisFilterState,
} from "@/features/billing/gisFilters";
import {
  useGetContractsGeoListQuery,
  useGetXojalikKontursQuery,
  useGetXojalikLocationsQuery,
  useGetXojaliklarQuery,
  useLazyGetXojalikKonturQuery,
  useLazyGetXojalikLocationQuery,
} from "@/services/billingApi";
import { setupBaseMap, type BaseLayerLabels } from "@/features/billing/mapLayers";
import {
  buildContractPopupHtml,
  createContractPinIcon,
  createKonturHighlightLayer,
  createXojalikBoundaryLayer,
  createXojalikMarkersLayer,
  findXojalikMarker,
  flyToKontur,
  flyToXojalik,
  statusColor,
  type ContractPopupLabels,
} from "@/features/billing/markers";
import { getPolygonLocations } from "@/features/billing/contractPolygons";
import { UZ_MAP_CENTER, UZ_MAP_ZOOM } from "@/features/billing/constants";
import type { ContractGeoItem, ViloyatOption, XojalikLocation } from "@/features/billing/types";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function GisMonitoring() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // ---- Leaflet obyektlari (imperativ, ref'larda) ----
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const xojalikMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const xojalikBoundaryRef = useRef<L.GeoJSON | null>(null);
  const konturHighlightRef = useRef<L.GeoJSON | null>(null);
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  const baseLayersRef = useRef<ReturnType<typeof setupBaseMap>["layers"] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ---- Filtrlar ----
  const [filters, setFilters] = useState<GisFilterState>(EMPTY_GIS_FILTERS);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const apiFilters = useMemo(() => gisFiltersToApi(filters), [filters]);
  const hasFilters = hasActiveGisFilters(filters);

  // ---- Ma'lumotlar ----
  const {
    data: geoData,
    isFetching: contractsFetching,
    isError: contractsError,
  } = useGetContractsGeoListQuery(apiFilters);
  const contracts = geoData?.results;
  const { data: xojaliklar = [] } = useGetXojaliklarQuery();
  const { data: xojalikLocations = [] } = useGetXojalikLocationsQuery();
  const [fetchXojalikLocation] = useLazyGetXojalikLocationQuery();
  const [fetchKonturDetail] = useLazyGetXojalikKonturQuery();

  // ---- "Xo'jalikka o'tish" paneli holati ----
  const [selectedViloyatId, setSelectedViloyatId] = useState("");
  const [selectedXojalikId, setSelectedXojalikId] = useState("");
  const [selectedKonturId, setSelectedKonturId] = useState("");
  const [konturSearch, setKonturSearch] = useState("");
  const { data: konturlar = [], isFetching: konturLoading } = useGetXojalikKontursQuery(
    selectedXojalikId || skipToken,
  );

  const viloyatlar = useMemo<ViloyatOption[]>(() => {
    const map = new Map<string, string>();
    xojalikLocations.forEach((x) => {
      if (!map.has(x.region)) map.set(x.region, x.region_name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "uz"));
  }, [xojalikLocations]);

  const xojaliklarByRegion = useMemo<XojalikLocation[]>(() => {
    if (!selectedViloyatId) return [];
    return xojalikLocations
      .filter((x) => String(x.region) === selectedViloyatId)
      .sort((a, b) => a.name.localeCompare(b.name, "uz"));
  }, [xojalikLocations, selectedViloyatId]);

  // ---- Tarjimalar (popup, qatlam nazorati) ----
  const popupLabels = useMemo<ContractPopupLabels>(
    () => ({
      renter: t("billing.popup_renter"),
      xojalik: t("billing.popup_xojalik"),
      purpose: t("billing.popup_purpose"),
      area: t("billing.popup_area"),
      debt: t("billing.popup_debt"),
      details: t("billing.popup_details"),
      currency: t("billing.currency"),
      polygon: t("billing.polygon"),
      byMap: t("billing.by_map"),
    }),
    [t],
  );
  const layerLabels = useMemo<BaseLayerLabels>(
    () => ({
      esri: t("billing.layer_esri"),
      yandex: t("billing.layer_yandex"),
      street: t("billing.layer_street"),
      xojaliklar: t("billing.layer_xojaliklar"),
    }),
    [t],
  );

  // =====================================================================
  // Xaritani yaratish (bir marta)
  // =====================================================================
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    const xojalikMarkersLayer = L.layerGroup();
    const { map, layers } = setupBaseMap(container, {
      center: UZ_MAP_CENTER,
      zoom: UZ_MAP_ZOOM,
      layerControl: false,
    });
    const markersLayer = L.layerGroup().addTo(map);
    xojalikMarkersLayer.addTo(map);

    mapRef.current = map;
    baseLayersRef.current = layers;
    markersLayerRef.current = markersLayer;
    xojalikMarkersLayerRef.current = xojalikMarkersLayer;

    // Popup ichidagi "Batafsil ko'rish" — SPA navigatsiya (to'liq reload'siz)
    const onContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.("a.gis-popup__link") as HTMLAnchorElement | null;
      if (!link) return;
      e.preventDefault();
      const href = link.getAttribute("href");
      if (href) navigateRef.current(href);
    };
    container.addEventListener("click", onContainerClick);

    const t1 = window.setTimeout(() => map.invalidateSize(), 250);
    const t2 = window.setTimeout(() => map.invalidateSize(), 600);
    setMapReady(true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      container.removeEventListener("click", onContainerClick);
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      xojalikMarkersLayerRef.current = null;
      xojalikBoundaryRef.current = null;
      konturHighlightRef.current = null;
      layerControlRef.current = null;
      baseLayersRef.current = null;
    };
  }, []);

  // Qatlam nazorati (top-right) — til o'zgarsa nomlari bilan qayta yasaladi
  useEffect(() => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    const xojalikMarkersLayer = xojalikMarkersLayerRef.current;
    if (!mapReady || !map || !layers || !xojalikMarkersLayer) return;

    if (layerControlRef.current) {
      map.removeControl(layerControlRef.current);
    }
    layerControlRef.current = L.control
      .layers(
        {
          [layerLabels.esri]: layers.satellite,
          [layerLabels.yandex]: layers.yandex,
          [layerLabels.street]: layers.street,
        },
        { [layerLabels.xojaliklar]: xojalikMarkersLayer },
        { position: "topright" },
      )
      .addTo(map);
  }, [mapReady, layerLabels]);

  // =====================================================================
  // Xo'jalik chegarasi / kontur
  // =====================================================================
  const clearKonturHighlight = useCallback(() => {
    const map = mapRef.current;
    if (konturHighlightRef.current && map) {
      map.removeLayer(konturHighlightRef.current);
    }
    konturHighlightRef.current = null;
  }, []);

  const showXojalikBoundary = useCallback(
    async (xojalik: XojalikLocation) => {
      const map = mapRef.current;
      if (!map) return;
      if (xojalikBoundaryRef.current) {
        map.removeLayer(xojalikBoundaryRef.current);
        xojalikBoundaryRef.current = null;
      }
      try {
        const detail = await fetchXojalikLocation(xojalik.id, true).unwrap();
        if (!mapRef.current || !detail?.boundary_geojson) return;
        const layer = createXojalikBoundaryLayer(detail.boundary_geojson);
        if (layer) {
          layer.addTo(mapRef.current);
          xojalikBoundaryRef.current = layer;
        }
      } catch {
        // chegara bo'lmasa — chizmaymiz
      }
    },
    [fetchXojalikLocation],
  );

  // Xo'jalik markerlari ("Xo'jaliklar" overlay)
  useEffect(() => {
    const layer = xojalikMarkersLayerRef.current;
    if (!mapReady || !layer) return;
    layer.clearLayers();
    createXojalikMarkersLayer(xojalikLocations, showXojalikBoundary).eachLayer((m) => {
      layer.addLayer(m);
    });
  }, [mapReady, xojalikLocations, showXojalikBoundary]);

  const handleViloyatChange = (id: string) => {
    setSelectedViloyatId(id);
    setSelectedXojalikId("");
    setSelectedKonturId("");
    setKonturSearch("");
    clearKonturHighlight();
  };

  const handleXojalikChange = (id: string) => {
    setSelectedXojalikId(id);
    setSelectedKonturId("");
    setKonturSearch("");
    clearKonturHighlight();
    const map = mapRef.current;
    const xojalik = xojalikLocations.find((x) => String(x.id) === String(id));
    if (!xojalik || !map) return;
    flyToXojalik(map, xojalik);
    void showXojalikBoundary(xojalik);
    const marker = findXojalikMarker(xojalikMarkersLayerRef.current, xojalik.id);
    if (marker) {
      window.setTimeout(() => marker.openPopup(), 900);
    }
  };

  const handleKonturChange = async (id: string) => {
    setSelectedKonturId(id);
    const map = mapRef.current;
    if (!id || !map) return;
    try {
      const detail = await fetchKonturDetail(id, true).unwrap();
      if (!detail || !mapRef.current) return;
      clearKonturHighlight();
      flyToKontur(mapRef.current, detail);
      const layer = createKonturHighlightLayer(detail, t("billing.kontur"));
      if (layer) {
        layer.addTo(mapRef.current);
        konturHighlightRef.current = layer;
        window.setTimeout(() => konturHighlightRef.current?.openPopup(), 900);
      }
    } catch {
      // kontur topilmadi
    }
  };

  // =====================================================================
  // Shartnomalarni xaritada chizish
  // =====================================================================
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!mapReady || !map || !markersLayer) return;
    markersLayer.clearLayers();
    if (!contracts) return;

    const allBounds: Array<L.LatLngBounds | L.LatLng> = [];
    const iconCache = new Map<string, L.DivIcon>();
    const iconFor = (color: string) => {
      let icon = iconCache.get(color);
      if (!icon) {
        icon = createContractPinIcon(color);
        iconCache.set(color, icon);
      }
      return icon;
    };

    contracts.forEach((c: ContractGeoItem) => {
      const color = statusColor(c.status);
      let boundaryLayer: L.GeoJSON | null = null;
      let markerLatLng: L.LatLng | null = null;

      // 1) Chegara (bo'lsa) — har doim ko'rinadi
      if (c.boundary_geojson) {
        try {
          boundaryLayer = L.geoJSON(c.boundary_geojson as GeoJSON.GeoJsonObject, {
            style: { color, weight: 2, fillColor: color, fillOpacity: 0.3, opacity: 1 },
          });
          boundaryLayer.addTo(markersLayer);
          const b = boundaryLayer.getBounds();
          if (b.isValid()) {
            allBounds.push(b);
            markerLatLng = b.getCenter();
          }
        } catch {
          boundaryLayer = null;
        }
      }

      // Bir nechta poligonli chegara: har bir poligonga o'z nuqtasida alohida pin
      const polygonLocations = getPolygonLocations(c.boundary_geojson);
      if (polygonLocations.length > 1) {
        polygonLocations.forEach((location) => {
          const polygonMarker = L.marker(L.latLng(location.lat, location.lng), {
            icon: iconFor(color),
          });
          polygonMarker.bindPopup(buildContractPopupHtml(c, location, popupLabels));
          polygonMarker.on("click", () => polygonMarker.openPopup());
          polygonMarker.on("dblclick", () => {
            const polygonBounds = L.geoJSON(location.polygon).getBounds();
            if (polygonBounds.isValid()) {
              map.fitBounds(polygonBounds, { maxZoom: 17, padding: [20, 20] });
            }
          });
          polygonMarker.addTo(markersLayer);
        });
        return;
      }

      // 2) Joylashuv nuqtasi (lat/lng bo'lsa shu, aks holda chegara markazi)
      const lat = num(c.latitude);
      const lng = num(c.longitude);
      if (lat !== null && lng !== null) {
        markerLatLng = L.latLng(lat, lng);
        allBounds.push(markerLatLng);
      }
      if (!markerLatLng) return;

      const point = markerLatLng;
      const marker = L.marker(point, { icon: iconFor(color) });
      marker.bindPopup(buildContractPopupHtml(c, null, popupLabels));
      marker.on("click", () => marker.openPopup());
      marker.on("dblclick", () => {
        const b = boundaryLayer?.getBounds();
        if (b && b.isValid()) {
          map.fitBounds(b, { maxZoom: 17, padding: [20, 20] });
        } else {
          map.setView(point, 16);
        }
      });
      marker.addTo(markersLayer);
    });

    if (allBounds.length > 0) {
      try {
        const bounds = L.latLngBounds([]);
        allBounds.forEach((b) => bounds.extend(b));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      } catch {
        // noto'g'ri koordinatalar — e'tiborsiz
      }
    }
  }, [mapReady, contracts, popupLabels]);

  // =====================================================================
  // Filtrlar
  // =====================================================================
  const applyFilters = (next: GisFilterState) => {
    setFilters(next);
    setFilterOpen(false);
  };
  const clearFilters = () => {
    setFilters(EMPTY_GIS_FILTERS);
    setFilterOpen(false);
  };

  const totalCount = geoData?.count ?? contracts?.length ?? 0;

  const headerActions = (
    <>
      <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
        {t("billing.total_prefix")}{" "}
        <strong className="text-slate-800 dark:text-slate-100 font-bold">{totalCount}</strong>{" "}
        {t("billing.total_suffix")}
      </span>
      <Button
        type="button"
        onClick={() => setFilterOpen(true)}
        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9"
      >
        <Filter size={16} />
        {t("billing.filter")}
      </Button>
      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={clearFilters}
          className="rounded-xl h-9 border-slate-200 dark:border-slate-700 hover:text-red-600 hover:border-red-400 dark:hover:text-red-400"
        >
          <X size={16} />
          {t("billing.clear")}
        </Button>
      )}
    </>
  );

  return (
    <BillingLayout title={t("billing.gis_title")} actions={headerActions}>
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs backdrop-blur-md p-2 sm:p-3">
        {contractsError && (
          <div className="mb-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            {t("billing.load_error")}
          </div>
        )}

        {/* Leaflet z-index'lari sidebar/dialoglarga chiqmasligi uchun: relative z-0 isolate */}
        <div
          className="relative z-0 isolate w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
          style={{ height: "calc(100vh - 190px)", minHeight: 500 }}
        >
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-800" />

          <XojalikPanel
            viloyatlar={viloyatlar}
            xojaliklar={xojaliklarByRegion}
            konturlar={konturlar}
            konturLoading={konturLoading}
            selectedViloyatId={selectedViloyatId}
            selectedXojalikId={selectedXojalikId}
            selectedKonturId={selectedKonturId}
            konturSearch={konturSearch}
            onViloyatChange={handleViloyatChange}
            onXojalikChange={handleXojalikChange}
            onKonturChange={(id) => void handleKonturChange(id)}
            onKonturSearchChange={setKonturSearch}
          />

          {contractsFetching && (
            <div className="absolute top-3 right-14 z-[1000] inline-flex items-center gap-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-lg backdrop-blur-md">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              {t("billing.map_loading")}
            </div>
          )}
        </div>
      </div>

      <GisFilterDialog
        key={i18n.language}
        open={isFilterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        xojaliklar={xojaliklar}
        onApply={applyFilters}
        onClear={clearFilters}
      />
    </BillingLayout>
  );
}

export default GisMonitoring;
