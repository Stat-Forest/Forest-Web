import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/views/Dashboard/Billing/Gis/gis.css";
import "./publicGisMap.css";
import { AlertTriangle, Filter, Loader2, MapPinned, RefreshCw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import XojalikPanel from "@/views/Dashboard/Billing/Gis/XojalikPanel";
import { createBaseLayers, type BaseLayers } from "@/features/billing/mapLayers";
import {
  buildPublicContractPopupHtml,
  createKonturHighlightLayer,
  createXojalikBoundaryLayer,
  createXojalikMarkersLayer,
  drawContractsOnLayer,
  findXojalikMarker,
  fitMapToContracts,
  flyToKontur,
  flyToXojalik,
  type PublicContractPopupLabels,
} from "@/features/billing/markers";
import { CONTRACT_STATUS_COLOR, UZ_MAP_CENTER, UZ_MAP_ZOOM } from "@/features/billing/constants";
import { formatNumber } from "@/features/billing/format";
import {
  useGetPublicGeoListQuery,
  useGetPublicXojaliklarQuery,
  useGetPublicXojalikKontursQuery,
  useGetPublicXojalikLocationsQuery,
  useLazyGetPublicXojalikKonturQuery,
  useLazyGetPublicXojalikLocationQuery,
} from "@/services/billingApi";
import type {
  PublicGeoItem,
  PublicGeoListParams,
  ViloyatOption,
  XojalikLocation,
} from "@/features/billing/types";

/**
 * Landing (login'dan oldingi) sahifadagi ochiq GIS xaritasi — billing-urmon.uz
 * `LoginGisMap.vue` analogi: "kosmosdan uchib kelish" intro'si, faol ijara
 * shartnomalari (pin + poligon), xo'jalik bayroqchalari, "Xaritani filterlash"
 * (viloyat → xo'jalik → kontur) va "Shartnomalarni filterlash" (xo'jalik +
 * shartnoma raqami) panellari.
 *
 * Maxfiylik: popup'da faqat № / xo'jalik / ijara maqsadi / yer maydoni —
 * ijarachi nomi va pul ma'lumotlari yo'q (backend ham qaytarmaydi).
 *
 * Leaflet og'ir — `lazy()` bilan yuklanadi (default export, CSS'lari shu yerda).
 * Konteyner o'lchamini chaqiruvchi beradi (komponent `h-full w-full`).
 */

const INTRO_START: [number, number] = [30, 15];
const INTRO_ZOOM = 2;
const INTRO_DURATION_S = 3.4;
/** Intro flight boshlanganidan keyin "kosmos" qatlami shu vaqtda ochila boshlaydi. */
const INTRO_REVEAL_MS = 1600;
const WHEEL_HINT_MS = 1600;
const CTRL_WHEEL_THROTTLE_MS = 220;
const ALL = "all";
const PIN_COLOR = CONTRACT_STATUS_COLOR.active;

type IntroPhase = "space" | "landing" | "done";
type OpenPanel = "map" | "contracts" | null;

/**
 * Intro (kosmos -> globus -> O'zbekistonga 3.4 s uchish) o'chirilgan: xarita
 * darhol O'zbekiston ustida ochiladi va ishlatishga tayyor bo'ladi.
 */
const shouldSkipIntro = (): boolean => true;

const sameParams = (a: PublicGeoListParams, b: PublicGeoListParams) =>
  (a.xojalik || "") === (b.xojalik || "") && (a.number || "") === (b.number || "");

function PublicGisMap() {
  const { t } = useTranslation();
  const [skipIntro] = useState(shouldSkipIntro);
  const [phase, setPhase] = useState<IntroPhase>(skipIntro ? "done" : "space");
  const revealed = phase !== "space";

  // ---- Leaflet obyektlari (imperativ, ref'larda) ----
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayersRef = useRef<BaseLayers | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const xojalikMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const xojalikBoundaryRef = useRef<L.GeoJSON | null>(null);
  const konturHighlightRef = useRef<L.GeoJSON | null>(null);
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  /** Foydalanuvchi filtr qo'llaganda — keyingi natijaga xaritani moslash. */
  const fitRequestRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [wheelHint, setWheelHint] = useState(false);

  // ---- Panellar / filtrlar ----
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [applied, setApplied] = useState<PublicGeoListParams>({});
  const [draftXojalik, setDraftXojalik] = useState<string>(ALL);
  const [draftNumber, setDraftNumber] = useState("");
  const hasAppliedFilters = !!(applied.xojalik || applied.number);

  // ---- Ma'lumotlar ----
  const { data: geo, isLoading, isFetching, isError, refetch } = useGetPublicGeoListQuery(applied);
  const { data: publicXojaliklar = [] } = useGetPublicXojaliklarQuery();
  const { data: xojalikLocations = [] } = useGetPublicXojalikLocationsQuery();
  const [fetchXojalikLocation] = useLazyGetPublicXojalikLocationQuery();
  const [fetchKonturDetail] = useLazyGetPublicXojalikKonturQuery();

  // ---- "Xaritani filterlash" (viloyat → xo'jalik → kontur) ----
  const [selectedViloyatId, setSelectedViloyatId] = useState("");
  const [selectedXojalikId, setSelectedXojalikId] = useState("");
  const [selectedKonturId, setSelectedKonturId] = useState("");
  const [konturSearch, setKonturSearch] = useState("");
  const { data: konturlar = [], isFetching: konturLoading } = useGetPublicXojalikKontursQuery(
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

  const xojalikOptions = useMemo(
    () =>
      publicXojaliklar
        .map((x) => ({ id: String(x.id), name: x.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "uz")),
    [publicXojaliklar],
  );

  // ---- Tarjimalar ----
  const popupLabels = useMemo<PublicContractPopupLabels>(
    () => ({
      xojalik: t("billing.popup_xojalik"),
      purpose: t("billing.popup_purpose"),
      area: t("billing.popup_area"),
      polygon: t("billing.polygon"),
      byMap: t("billing.by_map"),
    }),
    [t],
  );
  const layerLabels = useMemo(
    () => ({
      esri: t("billing.layer_esri"),
      yandex: t("billing.layer_yandex"),
      xojaliklar: t("billing.layer_xojaliklar"),
    }),
    [t],
  );

  // =====================================================================
  // Xaritani yaratish (bir marta) + sahifa scroll'ini o'g'irlamaslik
  // =====================================================================
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      // G'ildirak bilan zoom faqat xarita bosilgandan/fokusdan keyin yoki Ctrl+g'ildirak
      scrollWheelZoom: false,
    }).setView(skipIntro ? UZ_MAP_CENTER : INTRO_START, skipIntro ? UZ_MAP_ZOOM : INTRO_ZOOM);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    const layers = createBaseLayers();
    layers.satellite.addTo(map);
    layers.boundaries.addTo(map);
    const markersLayer = L.layerGroup().addTo(map);
    const xojalikMarkersLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    baseLayersRef.current = layers;
    markersLayerRef.current = markersLayer;
    xojalikMarkersLayerRef.current = xojalikMarkersLayer;

    const enableWheel = () => map.scrollWheelZoom.enable();
    const disableWheel = () => map.scrollWheelZoom.disable();
    map.on("click focus", enableWheel);
    map.on("blur", disableWheel);
    container.addEventListener("mouseleave", disableWheel);

    let hintTimer: number | undefined;
    let lastCtrlZoom = 0;
    const onWheel = (e: WheelEvent) => {
      if (map.scrollWheelZoom.enabled()) return; // Leaflet o'zi boshqaradi
      if (e.ctrlKey || e.metaKey) {
        // Brauzer sahifa zoom'i o'rniga xarita zoom'i (trackpad pinch ham shu)
        e.preventDefault();
        const now = Date.now();
        if (now - lastCtrlZoom < CTRL_WHEEL_THROTTLE_MS) return;
        lastCtrlZoom = now;
        map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + (e.deltaY < 0 ? 1 : -1));
        return;
      }
      // Oddiy g'ildirak — sahifa scroll bo'ladi, faqat maslahat ko'rsatamiz
      setWheelHint(true);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => setWheelHint(false), WHEEL_HINT_MS);
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => map.invalidateSize()) : null;
    resizeObserver?.observe(container);
    const t1 = window.setTimeout(() => map.invalidateSize(), 250);

    setMapReady(true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(hintTimer);
      resizeObserver?.disconnect();
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("mouseleave", disableWheel);
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      baseLayersRef.current = null;
      markersLayerRef.current = null;
      xojalikMarkersLayerRef.current = null;
      xojalikBoundaryRef.current = null;
      konturHighlightRef.current = null;
      layerControlRef.current = null;
    };
  }, [skipIntro]);

  // =====================================================================
  // Intro: bo'lim ko'rinishga kelganda dunyodan O'zbekistonga uchish
  // =====================================================================
  useEffect(() => {
    const map = mapRef.current;
    const root = rootRef.current;
    if (!mapReady || !map || !root || skipIntro) return;

    const timers: number[] = [];
    let started = false;
    const reveal = () => setPhase((p) => (p === "space" ? "landing" : p));

    const start = () => {
      if (started) return;
      started = true;
      timers.push(
        window.setTimeout(() => {
          if (mapRef.current !== map) return;
          map.invalidateSize();
          map.flyTo(UZ_MAP_CENTER, UZ_MAP_ZOOM, { duration: INTRO_DURATION_S, easeLinearity: 0.2 });
          // Parvoz tugashidan biroz oldin ochila boshlaydi; moveend — zaxira
          // (sekin qurilma / fon tab'da vaqt surilsa ham qoplama qolib ketmaydi)
          timers.push(window.setTimeout(reveal, INTRO_REVEAL_MS));
          map.once("moveend", reveal);
        }, 300),
      );
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer?.disconnect();
            start();
          }
        },
        { threshold: 0.35 },
      );
      observer.observe(root);
    } else {
      start();
    }

    return () => {
      observer?.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      map.off("moveend", reveal);
    };
  }, [mapReady, skipIntro]);

  // Ochilish animatsiyasi tugagach clip-path/filter olib tashlanadi (tezlik uchun)
  useEffect(() => {
    if (phase !== "landing") return;
    const id = window.setTimeout(() => setPhase("done"), INTRO_DURATION_S * 1000 + 200);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Qatlam nazorati — til o'zgarsa nomlari bilan qayta yasaladi
  useEffect(() => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    const xojalikMarkersLayer = xojalikMarkersLayerRef.current;
    if (!mapReady || !map || !layers || !xojalikMarkersLayer) return;
    if (layerControlRef.current) map.removeControl(layerControlRef.current);
    layerControlRef.current = L.control
      .layers(
        { [layerLabels.esri]: layers.satellite, [layerLabels.yandex]: layers.yandex },
        { [layerLabels.xojaliklar]: xojalikMarkersLayer },
        { position: "bottomright" },
      )
      .addTo(map);
  }, [mapReady, layerLabels]);

  // =====================================================================
  // Xo'jalik chegarasi / kontur
  // =====================================================================
  const clearKonturHighlight = useCallback(() => {
    const map = mapRef.current;
    if (konturHighlightRef.current && map) map.removeLayer(konturHighlightRef.current);
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

  // Xo'jalik bayroqchalari
  useEffect(() => {
    const layer = xojalikMarkersLayerRef.current;
    if (!mapReady || !layer) return;
    layer.clearLayers();
    createXojalikMarkersLayer(xojalikLocations, showXojalikBoundary).eachLayer((m) => {
      layer.addLayer(m);
    });
  }, [mapReady, xojalikLocations, showXojalikBoundary]);

  const focusXojalik = useCallback(
    (xojalik: XojalikLocation) => {
      const map = mapRef.current;
      if (!map) return;
      flyToXojalik(map, xojalik);
      void showXojalikBoundary(xojalik);
      const marker = findXojalikMarker(xojalikMarkersLayerRef.current, xojalik.id);
      if (marker) marker.openPopup();
    },
    [showXojalikBoundary],
  );

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
    const xojalik = xojalikLocations.find((x) => String(x.id) === String(id));
    if (xojalik) {
      focusXojalik(xojalik);
      setOpenPanel(null);
    }
  };

  const handleKonturChange = async (id: string) => {
    setSelectedKonturId(id);
    if (!id || !mapRef.current) return;
    try {
      const detail = await fetchKonturDetail(id, true).unwrap();
      if (!detail || !mapRef.current) return;
      clearKonturHighlight();
      flyToKontur(mapRef.current, detail);
      setOpenPanel(null);
      const layer = createKonturHighlightLayer(detail, t("billing.kontur"));
      if (layer) {
        layer.addTo(mapRef.current);
        konturHighlightRef.current = layer;
        konturHighlightRef.current?.openPopup();
      }
    } catch {
      // kontur topilmadi
    }
  };

  // =====================================================================
  // Shartnomalarni chizish
  // =====================================================================
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!mapReady || !map || !markersLayer) return;
    markersLayer.clearLayers();
    const results = geo?.results;
    if (!results) return;

    const bounds = drawContractsOnLayer<PublicGeoItem>(map, markersLayer, results, {
      color: () => PIN_COLOR,
      popupHtml: (c, location) => buildPublicContractPopupHtml(c, location, popupLabels),
    });

    // Birinchi yuklanishda moslamaymiz — intro allaqachon O'zbekistonga uchadi
    // (fitBounds parvozni uzib qo'yardi). Faqat foydalanuvchi filtridan keyin.
    if (fitRequestRef.current) {
      fitRequestRef.current = false;
      if (!fitMapToContracts(map, bounds, { padding: [40, 40], maxZoom: 15 })) {
        map.setView(UZ_MAP_CENTER, UZ_MAP_ZOOM, { animate: false });
      }
    }
  }, [mapReady, geo, popupLabels]);

  // =====================================================================
  // Shartnoma filtrlari
  // =====================================================================
  const applyContractFilters = (next: PublicGeoListParams) => {
    setOpenPanel(null);
    if (sameParams(next, applied)) return;
    fitRequestRef.current = true;
    setApplied(next);
  };

  const handleContractFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const number = draftNumber.trim();
    applyContractFilters({
      ...(draftXojalik !== ALL ? { xojalik: draftXojalik } : {}),
      ...(number ? { number } : {}),
    });
  };

  const clearContractFilters = () => {
    setDraftXojalik(ALL);
    setDraftNumber("");
    applyContractFilters({});
  };

  const togglePanel = (panel: Exclude<OpenPanel, null>) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  // Esc — ochiq panelni yopadi
  useEffect(() => {
    if (!openPanel) return;
    const onKey = (e: KeyboardEvent) => {
      // Radix Select ochiq bo'lsa Esc avval uni yopadi (defaultPrevented)
      if (e.key === "Escape" && !e.defaultPrevented) setOpenPanel(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openPanel]);

  // =====================================================================
  // Render
  // =====================================================================
  const shownCount = geo?.results?.length ?? 0;
  const totalCount = geo?.count ?? 0;
  const overlayIn = revealed
    ? "opacity-100 translate-y-0"
    : "pointer-events-none opacity-0 translate-y-2.5";
  const overlayTransition =
    "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

  return (
    <div
      ref={rootRef}
      className={`pgm-root relative isolate z-0 h-full w-full overflow-hidden ${skipIntro ? "pgm-root--static" : ""}`}
    >
      {!skipIntro && (
        <div className={`pgm-space ${revealed ? "pgm-space--hide" : ""}`} aria-hidden="true">
          <div className="pgm-nebula" />
          <div className="pgm-stars" />
          <div className="pgm-stars pgm-stars--2" />
          <div className="pgm-stars pgm-stars--bright" />
        </div>
      )}

      <div
        className={`pgm-globe ${revealed ? "pgm-globe--in" : ""} ${
          phase === "done" && !skipIntro ? "pgm-globe--done" : ""
        }`}
      >
        <div
          ref={mapContainerRef}
          className="absolute inset-0 h-full w-full"
          style={{ background: "transparent" }}
          aria-label={t("public_gis.map_aria")}
        />
        <div className="pgm-globe-shade" aria-hidden="true" />
      </div>

      {/* ---- Stat chiplari (yuqori-chap) ---- */}
      <div
        className={`absolute left-3 right-3 top-3 z-[1000] flex flex-wrap items-start gap-2 sm:left-5 sm:right-auto sm:top-5 sm:gap-3 pointer-events-none ${overlayTransition} ${overlayIn}`}
      >
        <StatChip
          value={isLoading ? null : formatNumber(totalCount)}
          label={t("public_gis.stat_contracts")}
        />
        <StatChip
          value={isLoading ? null : formatNumber(geo?.total_area)}
          label={t("public_gis.stat_area")}
        />
        {isFetching && !isLoading && (
          <span className="pointer-events-auto inline-flex items-center gap-2 self-center rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-md">
            <Loader2 size={14} className="animate-spin text-emerald-300" />
            {t("public_gis.loading")}
          </span>
        )}
        {isError && !isFetching && (
          <button
            type="button"
            onClick={() => refetch()}
            className="pointer-events-auto inline-flex items-center gap-2 self-center rounded-full border border-red-400/30 bg-red-950/80 px-3 py-1.5 text-xs font-semibold text-red-200 shadow-lg backdrop-blur-md hover:bg-red-900/80 cursor-pointer"
          >
            <AlertTriangle size={14} />
            {t("public_gis.error")}
            <RefreshCw size={13} className="opacity-80" />
          </button>
        )}
        {!isFetching && !isError && geo && hasAppliedFilters && shownCount === 0 && (
          <span className="pointer-events-auto self-center rounded-full border border-amber-300/30 bg-amber-950/80 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-lg backdrop-blur-md">
            {t("public_gis.empty")}
          </span>
        )}
        {!isFetching && geo && shownCount > 0 && shownCount < totalCount && (
          <span className="pointer-events-auto self-center rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-lg backdrop-blur-md">
            {t("public_gis.shown_limit", {
              shown: formatNumber(shownCount),
              total: formatNumber(totalCount),
            })}
          </span>
        )}
      </div>

      {/* ---- Brend yorlig'i (pastki-chap, faqat sm+) ---- */}
      <div
        className={`absolute bottom-5 left-5 z-[1000] hidden max-w-[calc(100%-40px)] rounded-xl border border-emerald-300/20 bg-emerald-700/90 px-4 py-3 text-white shadow-xl backdrop-blur-md sm:block delay-100 ${overlayTransition} ${overlayIn}`}
      >
        <p className="flex items-center gap-2 text-base font-bold leading-tight">
          <MapPinned size={18} className="text-emerald-200" />
          {t("public_gis.brand_title")}
        </p>
        <span className="mt-0.5 block truncate text-xs text-emerald-50/90">{t("public_gis.brand_subtitle")}</span>
      </div>

      {/* ---- Filtr tugmalari + panellar (sm+: yuqori-o'ng, mobil: pastki-chap) ---- */}
      <div
        className={`pointer-events-none absolute bottom-7 left-3 z-[1001] flex w-[min(300px,calc(100%-24px))] flex-col-reverse items-start gap-2 sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:flex-col sm:items-end delay-150 ${overlayTransition} ${overlayIn}`}
      >
        {/* Konteyner bo'sh joyi xaritani bosishni to'smasin — faqat tugma/panel'lar faol */}
        <div className={`flex flex-col items-start gap-2 sm:items-end ${revealed ? "pointer-events-auto" : ""}`}>
          <FilterButton
            icon={<MapPinned size={16} />}
            label={t("public_gis.map_filter")}
            active={openPanel === "map"}
            onClick={() => togglePanel("map")}
          />
          <FilterButton
            icon={<Filter size={16} />}
            label={t("public_gis.contract_filter")}
            active={openPanel === "contracts"}
            badge={hasAppliedFilters}
            onClick={() => togglePanel("contracts")}
          />
        </div>

        {openPanel === "map" && (
          <FilterPanel title={t("public_gis.map_filter")} onClose={() => setOpenPanel(null)} closeLabel={t("public_gis.close")}>
            <XojalikPanel
              embedded
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
          </FilterPanel>
        )}

        {openPanel === "contracts" && (
          <FilterPanel
            title={t("public_gis.contract_filter")}
            onClose={() => setOpenPanel(null)}
            closeLabel={t("public_gis.close")}
          >
            <form onSubmit={handleContractFilterSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("public_gis.filter_xojalik")}
                </span>
                <Select value={draftXojalik} onValueChange={setDraftXojalik}>
                  <SelectTrigger
                    className="h-9 w-full rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs"
                    aria-label={t("public_gis.filter_xojalik")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[1100] max-h-72">
                    <SelectItem value={ALL}>{t("public_gis.all")}</SelectItem>
                    {xojalikOptions.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("public_gis.filter_number")}
                </span>
                <Input
                  type="text"
                  value={draftNumber}
                  onChange={(e) => setDraftNumber(e.target.value)}
                  placeholder={t("public_gis.filter_number_ph")}
                  maxLength={100}
                  className="h-9 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:text-sm shadow-xs"
                />
              </label>
              <div className="mt-1 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 cursor-pointer"
                >
                  {t("public_gis.apply")}
                </button>
                <button
                  type="button"
                  onClick={clearContractFilters}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-red-400 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-red-400 cursor-pointer"
                >
                  {t("public_gis.clear")}
                </button>
              </div>
            </form>
          </FilterPanel>
        )}
      </div>

      {/* ---- "Ctrl + g'ildirak" maslahati ---- */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[999] flex items-center justify-center bg-slate-950/45 p-6 transition-opacity duration-300 ${
          wheelHint && revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="max-w-sm rounded-xl bg-slate-950/80 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {t("public_gis.wheel_hint")}
        </p>
      </div>
    </div>
  );
}

function StatChip({ value, label }: { value: string | null; label: string }) {
  return (
    <div className="pointer-events-auto flex min-w-[104px] max-w-[190px] flex-col rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 shadow-lg backdrop-blur-md sm:min-w-[124px] sm:max-w-[210px] sm:px-4 sm:py-2.5">
      {value === null ? (
        <span className="my-1 h-5 w-16 animate-pulse rounded bg-white/15" />
      ) : (
        <span className="whitespace-nowrap text-base font-black leading-tight text-emerald-300 tabular-nums sm:text-xl">
          {value}
        </span>
      )}
      <span className="mt-0.5 truncate text-[11px] leading-snug text-slate-300">{label}</span>
    </div>
  );
}

function FilterButton({
  icon,
  label,
  active,
  badge = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  badge?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition-colors sm:px-4 sm:py-2.5 sm:text-[13px] cursor-pointer ${
        active ? "bg-emerald-500" : "bg-emerald-700/90 hover:bg-emerald-600 backdrop-blur-md"
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400" />
      )}
    </button>
  );
}

function FilterPanel({
  title,
  onClose,
  closeLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="pointer-events-auto w-full rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-800 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

export default PublicGisMap;
