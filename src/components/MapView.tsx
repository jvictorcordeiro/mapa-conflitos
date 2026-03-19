import { useEffect, useEffectEvent, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import type { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import type { Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapInitialView, mapStyle } from "../map/config";
import { buildConflictsGeoJSON, fitMapToFeatureCollection } from "../map/geojson";
import {
  addConflictLayers,
  addMunicipalityLayers,
  addOptionalLayers,
  addStateLayers,
  MAP_ICON_IDS,
  MAP_LAYER_IDS,
  MAP_SOURCE_IDS,
  setSelectedConflict,
  setLayerVisibility,
} from "../map/layers";
import type { Conflict } from "../map/types";
import { formatDate, getStatusColor } from "../services/conflictService";
import {
  getTerritorialGeoData,
  type TerritorialGeoData,
} from "../services/geoDataService";
import "../styles/map.css";

type MapViewProps = {
  conflicts: Conflict[];
  selectedConflict: Conflict | null;
  onSelectConflict: (conflict: Conflict | null) => void;
};

type LayerVisibilityState = {
  relief: boolean;
  state: boolean;
  municipalities: boolean;
  points: boolean;
  labels: boolean;
};

const initialLayerVisibility: LayerVisibilityState = {
  relief: false,
  state: true,
  municipalities: true,
  points: true,
  labels: true,
};

const RELIEF_TILES = [
  "https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
];

const LAYER_PANEL_GROUPS = [
  {
    title: "Base",
    items: [{ label: "Mapa-base escuro", staticValue: "Ativo" }],
  },
  {
    title: "Limites",
    items: [
      { key: "state", label: "Limite estadual" },
      { key: "municipalities", label: "Limites municipais" },
    ],
  },
  {
    title: "Analise territorial",
    items: [{ key: "relief", label: "Relevo" }],
  },
  {
    title: "Conflitos",
    items: [
      { key: "points", label: "Ocorrencias" },
      { key: "labels", label: "Rotulos" },
    ],
  },
] as const;

const ICON_CANVAS_SIZE = 48;
const ICON_CENTER = ICON_CANVAS_SIZE / 2;

function createIconCanvas(): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_CANVAS_SIZE;
  canvas.height = ICON_CANVAS_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.strokeStyle = "#f8fafc";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  return context;
}

function drawConflictIcon(context: CanvasRenderingContext2D, imageId: string): void {
  context.clearRect(0, 0, ICON_CANVAS_SIZE, ICON_CANVAS_SIZE);
  context.beginPath();

  switch (imageId) {
    case MAP_ICON_IDS.land:
      context.moveTo(ICON_CENTER, 12);
      context.lineTo(36, 28);
      context.lineTo(ICON_CENTER, 38);
      context.lineTo(12, 28);
      context.closePath();
      break;
    case MAP_ICON_IDS.water:
      context.moveTo(ICON_CENTER, 10);
      context.bezierCurveTo(31, 16, 34, 22, 34, 28);
      context.bezierCurveTo(34, 34, 29.5, 38, ICON_CENTER, 38);
      context.bezierCurveTo(18.5, 38, 14, 34, 14, 28);
      context.bezierCurveTo(14, 22, 17, 16, ICON_CENTER, 10);
      break;
    case MAP_ICON_IDS.environmental:
      context.moveTo(34, 14);
      context.bezierCurveTo(25, 14, 18, 19, 15, 28);
      context.bezierCurveTo(14, 31, 14, 34, 14, 37);
      context.moveTo(18, 33);
      context.lineTo(30, 21);
      context.moveTo(34, 14);
      context.bezierCurveTo(33, 23, 28, 30, 19, 33);
      break;
    case MAP_ICON_IDS.infrastructure:
      context.moveTo(18, 12);
      context.lineTo(18, 20);
      context.moveTo(30, 12);
      context.lineTo(30, 20);
      context.moveTo(20, 20);
      context.lineTo(18, 36);
      context.moveTo(28, 20);
      context.lineTo(30, 36);
      context.moveTo(21, 26);
      context.lineTo(27, 26);
      context.moveTo(20, 31);
      context.lineTo(28, 31);
      break;
    case MAP_ICON_IDS.traditional:
      context.moveTo(ICON_CENTER, 10);
      context.lineTo(27, 18);
      context.lineTo(36, 19.5);
      context.lineTo(29.5, 26);
      context.lineTo(31, 35);
      context.lineTo(ICON_CENTER, 30.5);
      context.lineTo(17, 35);
      context.lineTo(18.5, 26);
      context.lineTo(12, 19.5);
      context.lineTo(21, 18);
      context.closePath();
      break;
    default:
      context.arc(ICON_CENTER, ICON_CENTER, 8, 0, Math.PI * 2);
      context.moveTo(ICON_CENTER, 11);
      context.lineTo(ICON_CENTER, 16);
      context.moveTo(ICON_CENTER, 32);
      context.lineTo(ICON_CENTER, 37);
      context.moveTo(11, ICON_CENTER);
      context.lineTo(16, ICON_CENTER);
      context.moveTo(32, ICON_CENTER);
      context.lineTo(37, ICON_CENTER);
      break;
  }

  context.stroke();
}

function createIconImageData(imageId: string): ImageData {
  const context = createIconCanvas();
  if (!context) {
    throw new Error("Canvas 2D indisponivel para gerar icones do mapa.");
  }

  drawConflictIcon(context, imageId);
  return context.getImageData(0, 0, ICON_CANVAS_SIZE, ICON_CANVAS_SIZE);
}

async function ensureConflictIcons(map: maplibregl.Map): Promise<void> {
  Object.values(MAP_ICON_IDS).forEach((imageId) => {
    if (!map.hasImage(imageId)) {
      map.addImage(imageId, createIconImageData(imageId), { pixelRatio: 2 });
    }
  });
}

function initMap(container: HTMLDivElement): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: mapStyle,
    center: mapInitialView.center,
    zoom: mapInitialView.zoom,
    minZoom: mapInitialView.minZoom,
    maxZoom: mapInitialView.maxZoom,
    attributionControl: false,
  });
}

function addTerritorialSources(
  map: maplibregl.Map,
  territorialData: TerritorialGeoData | null,
): void {
  if (!territorialData) {
    return;
  }

  const stateSource = map.getSource(MAP_SOURCE_IDS.state) as GeoJSONSource | undefined;
  if (!stateSource) {
    map.addSource(MAP_SOURCE_IDS.state, {
      type: "geojson",
      data: territorialData.state,
    });
  } else {
    stateSource.setData(territorialData.state);
  }

  const municipalitiesSource = map.getSource(MAP_SOURCE_IDS.municipalities) as
    | GeoJSONSource
    | undefined;
  if (!municipalitiesSource) {
    map.addSource(MAP_SOURCE_IDS.municipalities, {
      type: "geojson",
      data: territorialData.municipalities,
    });
  } else {
    municipalitiesSource.setData(territorialData.municipalities);
  }
}

function addSources(
  map: maplibregl.Map,
  conflicts: Conflict[],
  territorialData: TerritorialGeoData | null,
): void {
  addTerritorialSources(map, territorialData);

  if (!map.getSource(MAP_SOURCE_IDS.relief)) {
    map.addSource(MAP_SOURCE_IDS.relief, {
      type: "raster",
      tiles: RELIEF_TILES,
      tileSize: 256,
      attribution: "Tiles © Esri",
      maxzoom: 13,
    });
  }

  const conflictsData = buildConflictsGeoJSON(conflicts);
  const conflictsSource = map.getSource(MAP_SOURCE_IDS.conflicts) as
    | GeoJSONSource
    | undefined;

  if (!conflictsSource) {
    map.addSource(MAP_SOURCE_IDS.conflicts, {
      type: "geojson",
      data: conflictsData,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 42,
    });
    return;
  }

  conflictsSource.setData(conflictsData);
}

function addLayers(map: maplibregl.Map, territorialData: TerritorialGeoData | null): void {
  addOptionalLayers(map);
  if (territorialData) {
    addStateLayers(map);
    addMunicipalityLayers(map);
  }
  addConflictLayers(map);
}

function syncLayerVisibility(
  map: maplibregl.Map,
  layerVisibility: LayerVisibilityState,
): void {
  setLayerVisibility(map, MAP_LAYER_IDS.relief, layerVisibility.relief);
  setLayerVisibility(map, MAP_LAYER_IDS.stateFill, layerVisibility.state);
  setLayerVisibility(map, MAP_LAYER_IDS.stateOutline, layerVisibility.state);
  setLayerVisibility(
    map,
    MAP_LAYER_IDS.municipalityOutline,
    layerVisibility.municipalities,
  );
  setLayerVisibility(map, MAP_LAYER_IDS.clusterHitArea, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.clusters, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.clusterCount, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.conflictHitArea, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.conflicts, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.selectedConflict, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.conflictIcons, layerVisibility.points);
  setLayerVisibility(map, MAP_LAYER_IDS.conflictLabels, layerVisibility.labels);
}

function clearPopup(popupRef: React.RefObject<maplibregl.Popup | null>): void {
  popupRef.current?.remove();
  popupRef.current = null;
}

function clearHoverPopup(popupRef: React.RefObject<maplibregl.Popup | null>): void {
  popupRef.current?.remove();
  popupRef.current = null;
}

function showConflictPopup(
  map: maplibregl.Map,
  popupRef: React.RefObject<maplibregl.Popup | null>,
  conflict: Conflict,
): void {
  clearPopup(popupRef);
  popupRef.current = new maplibregl.Popup({
    closeButton: false,
    offset: 18,
    className: "custom-popup",
  })
    .setLngLat(conflict.coordinates)
    .setHTML(buildPopupHtml(conflict))
    .addTo(map);
}

function showHoverPopup(
  map: maplibregl.Map,
  popupRef: React.RefObject<maplibregl.Popup | null>,
  coordinates: [number, number],
  html: string,
): void {
  if (!popupRef.current) {
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      offset: 12,
      className: "hover-popup",
    });
  }

  popupRef.current.setLngLat(coordinates).setHTML(html).addTo(map);
}

function buildPopupHtml(conflict: Conflict): string {
  return `
    <div style="min-width:240px;background:#07111f;color:#e7eef7;padding:0;">
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">${conflict.nome}</div>
      <div style="font-size:12px;color:#8da0b7;margin-bottom:10px;">${conflict.municipio} • ${formatDate(conflict.data)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <span style="font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(148,163,184,.10);border:1px solid rgba(148,163,184,.14);">${conflict.tipo}</span>
        <span style="font-size:11px;padding:4px 8px;border-radius:999px;background:${getStatusColor(conflict.status)}18;border:1px solid ${getStatusColor(conflict.status)}44;color:${getStatusColor(conflict.status)};">${conflict.status}</span>
      </div>
      <div style="font-size:12px;line-height:1.55;color:#c7d2df;">${conflict.descricao}</div>
    </div>
  `;
}

function buildConflictHoverHtml(conflict: Conflict): string {
  return `
    <div style="min-width:180px;">
      <div style="font-size:12px;font-weight:600;color:#f8fafc;">${conflict.nome}</div>
      <div style="margin-top:4px;font-size:11px;color:#94a3b8;">${conflict.municipio} • ${conflict.tipo}</div>
    </div>
  `;
}

function buildClusterHoverHtml(pointCount: number): string {
  return `
    <div style="min-width:140px;">
      <div style="font-size:12px;font-weight:600;color:#f8fafc;">${pointCount} ocorrencias</div>
      <div style="margin-top:4px;font-size:11px;color:#94a3b8;">Clique para expandir o agrupamento</div>
    </div>
  `;
}

type SetupEventsArgs = {
  map: maplibregl.Map;
  hoverPopupRef: React.RefObject<maplibregl.Popup | null>;
  conflictsRef: React.RefObject<Conflict[]>;
  onSelectConflict: (conflict: Conflict | null) => void;
  onMapError: (message: string) => void;
};

function setupEvents({
  map,
  hoverPopupRef,
  conflictsRef,
  onSelectConflict,
  onMapError,
}: SetupEventsArgs): () => void {
  let handledLayerClick = false;

  const getConflictFromFeature = (
    feature?: MapGeoJSONFeature,
  ): Conflict | null => {
    const conflictId = Number(feature?.properties?.id);
    if (!Number.isFinite(conflictId)) {
      return null;
    }

    return conflictsRef.current.find((item) => item.id === conflictId) ?? null;
  };

  const handleClusterClick = (
    event: MapMouseEvent & { features?: MapGeoJSONFeature[] },
  ) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") {
      return;
    }

    handledLayerClick = true;

    const clusterId = feature.properties?.cluster_id;
    if (typeof clusterId !== "number") {
      return;
    }

    const conflictsSource = map.getSource(MAP_SOURCE_IDS.conflicts) as
      | GeoJSONSource
      | undefined;
    if (!conflictsSource) {
      return;
    }

    conflictsSource.getClusterExpansionZoom(clusterId).then((zoom) => {
      const clusterPoint = feature.geometry as Point;

      map.easeTo({
        center: clusterPoint.coordinates as [number, number],
        zoom,
        duration: 500,
      });
    });
  };

  const handlePointClick = (
    event: MapMouseEvent & { features?: MapGeoJSONFeature[] },
  ) => {
    const conflict = getConflictFromFeature(event.features?.[0]);
    if (!conflict) {
      return;
    }

    handledLayerClick = true;
    clearHoverPopup(hoverPopupRef);
    onSelectConflict(conflict);
  };

  const handleConflictHover = (
    event: MapMouseEvent & { features?: MapGeoJSONFeature[] },
  ) => {
    const conflict = getConflictFromFeature(event.features?.[0]);
    if (!conflict) {
      return;
    }

    showHoverPopup(
      map,
      hoverPopupRef,
      conflict.coordinates,
      buildConflictHoverHtml(conflict),
    );
  };

  const handleClusterHover = (
    event: MapMouseEvent & { features?: MapGeoJSONFeature[] },
  ) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") {
      return;
    }

    const pointCount = Number(feature.properties?.point_count);
    if (!Number.isFinite(pointCount)) {
      return;
    }

    showHoverPopup(
      map,
      hoverPopupRef,
      feature.geometry.coordinates as [number, number],
      buildClusterHoverHtml(pointCount),
    );
  };

  const handleMapClick = (event: MapMouseEvent) => {
    if (handledLayerClick) {
      handledLayerClick = false;
      return;
    }

    const interactiveFeatures = map.queryRenderedFeatures(event.point, {
      layers: [
        MAP_LAYER_IDS.clusterHitArea,
        MAP_LAYER_IDS.clusterCount,
        MAP_LAYER_IDS.conflictHitArea,
        MAP_LAYER_IDS.conflicts,
        MAP_LAYER_IDS.selectedConflict,
        MAP_LAYER_IDS.conflictIcons,
        MAP_LAYER_IDS.conflictLabels,
      ],
    });

    if (interactiveFeatures.length === 0) {
      clearHoverPopup(hoverPopupRef);
      onSelectConflict(null);
    }
  };

  const handleInteractiveEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const handleInteractiveLeave = () => {
    map.getCanvas().style.cursor = "";
    clearHoverPopup(hoverPopupRef);
  };

  const handleError = (event: maplibregl.ErrorEvent) => {
    const message =
      event.error instanceof Error ? event.error.message : "Falha ao carregar o mapa.";
    if (message.includes("source image could not be decoded")) {
      console.warn(event.error);
      return;
    }
    onMapError(message);
    console.error(event.error);
  };

  map.on("click", MAP_LAYER_IDS.clusterHitArea, handleClusterClick);
  map.on("click", MAP_LAYER_IDS.clusterCount, handleClusterClick);
  map.on("click", MAP_LAYER_IDS.conflictHitArea, handlePointClick);
  map.on("click", handleMapClick);
  map.on("mousemove", MAP_LAYER_IDS.clusterHitArea, handleClusterHover);
  map.on("mousemove", MAP_LAYER_IDS.conflictHitArea, handleConflictHover);
  map.on("mouseenter", MAP_LAYER_IDS.clusterHitArea, handleInteractiveEnter);
  map.on("mouseenter", MAP_LAYER_IDS.conflictHitArea, handleInteractiveEnter);
  map.on("mouseleave", MAP_LAYER_IDS.clusterHitArea, handleInteractiveLeave);
  map.on("mouseleave", MAP_LAYER_IDS.conflictHitArea, handleInteractiveLeave);
  map.on("error", handleError);

  return () => {
    map.off("click", MAP_LAYER_IDS.clusterHitArea, handleClusterClick);
    map.off("click", MAP_LAYER_IDS.clusterCount, handleClusterClick);
    map.off("click", MAP_LAYER_IDS.conflictHitArea, handlePointClick);
    map.off("click", handleMapClick);
    map.off("mousemove", MAP_LAYER_IDS.clusterHitArea, handleClusterHover);
    map.off("mousemove", MAP_LAYER_IDS.conflictHitArea, handleConflictHover);
    map.off("mouseenter", MAP_LAYER_IDS.clusterHitArea, handleInteractiveEnter);
    map.off("mouseenter", MAP_LAYER_IDS.conflictHitArea, handleInteractiveEnter);
    map.off("mouseleave", MAP_LAYER_IDS.clusterHitArea, handleInteractiveLeave);
    map.off("mouseleave", MAP_LAYER_IDS.conflictHitArea, handleInteractiveLeave);
    map.off("error", handleError);
  };
}

export default function MapView({
  conflicts,
  selectedConflict,
  onSelectConflict,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const conflictsRef = useRef<Conflict[]>(conflicts);
  const selectedConflictRef = useRef<Conflict | null>(selectedConflict);
  const territorialDataRef = useRef<TerritorialGeoData | null>(null);
  const layerVisibilityRef = useRef<LayerVisibilityState>(initialLayerVisibility);
  const [territorialData, setTerritorialData] = useState<TerritorialGeoData | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibilityState] =
    useState<LayerVisibilityState>(initialLayerVisibility);
  const handleSelectConflict = useEffectEvent((conflict: Conflict | null) => {
    onSelectConflict(conflict);
  });

  useEffect(() => {
    conflictsRef.current = conflicts;
  }, [conflicts]);

  useEffect(() => {
    selectedConflictRef.current = selectedConflict;
  }, [selectedConflict]);

  useEffect(() => {
    territorialDataRef.current = territorialData;
  }, [territorialData]);

  useEffect(() => {
    layerVisibilityRef.current = layerVisibility;
  }, [layerVisibility]);

  useEffect(() => {
    let isActive = true;

    getTerritorialGeoData()
      .then((data) => {
        if (!isActive) {
          return;
        }

        setTerritorialData(data);
        setMapError(null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setMapError(
          error instanceof Error ? error.message : "Falha ao carregar camadas territoriais.",
        );
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = initMap(mapContainerRef.current);
    mapRef.current = map;

    const syncBaseLayers = () => {
      addSources(map, conflictsRef.current, territorialDataRef.current);

      void ensureConflictIcons(map)
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          addLayers(map, territorialDataRef.current);
          syncLayerVisibility(map, layerVisibilityRef.current);
          setSelectedConflict(map, selectedConflictRef.current?.id ?? null);
          if (territorialDataRef.current) {
            fitMapToFeatureCollection(map, territorialDataRef.current.stateViewport, {
              padding: 52,
              duration: 0,
            });
          }
          map.resize();
        });
    };

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", syncBaseLayers);
    map.on("styledata", () => {
      if (map.isStyleLoaded()) {
        syncBaseLayers();
      }
    });

    if (map.isStyleLoaded()) {
      syncBaseLayers();
    }

    const cleanupEvents = setupEvents({
      map,
      hoverPopupRef,
      conflictsRef,
      onSelectConflict: handleSelectConflict,
      onMapError: setMapError,
    });

    const handleResize = () => map.resize();
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });

    resizeObserver.observe(mapContainerRef.current);
    window.addEventListener("resize", handleResize);
    requestAnimationFrame(() => map.resize());
    window.setTimeout(() => map.resize(), 150);
    window.setTimeout(() => map.resize(), 600);

    return () => {
      cleanupEvents();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      clearPopup(popupRef);
      clearHoverPopup(hoverPopupRef);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    addSources(map, conflicts, territorialData);

    void ensureConflictIcons(map)
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        addLayers(map, territorialData);
        setSelectedConflict(map, selectedConflict?.id ?? null);

        if (
          selectedConflict !== null &&
          !conflicts.some((conflict) => conflict.id === selectedConflict.id)
        ) {
          clearPopup(popupRef);
        }

        if (!selectedConflict) {
          if (territorialData) {
            fitMapToFeatureCollection(map, territorialData.stateViewport, {
              padding: 52,
              duration: 700,
            });
          }
        }
      });
  }, [conflicts, selectedConflict, territorialData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    syncLayerVisibility(map, layerVisibility);
  }, [layerVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedConflict) {
      if (map) {
        setSelectedConflict(map, null);
      }

      clearPopup(popupRef);
      return;
    }

    setSelectedConflict(map, selectedConflict.id);
    showConflictPopup(map, popupRef, selectedConflict);
    map.flyTo({
      center: selectedConflict.coordinates,
      zoom: 8.5,
      duration: 900,
    });
  }, [selectedConflict]);

  const setLayer = (key: keyof LayerVisibilityState) => {
    setLayerVisibilityState((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <main className="relative h-full flex-1 overflow-hidden bg-slate-950">
      <div className="map-vignette pointer-events-none absolute inset-0 z-[1]" />

      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-4">
        <div className="map-panel max-w-[380px] rounded-[26px] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Operational map
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-50">
            Mapa interativo do estado de Pernambuco
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Visão territorial com clusters, relevo, municípios e ocorrências filtradas.
          </p>
        </div>

        <div className="pointer-events-auto map-panel w-[252px] rounded-[26px] px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Camadas
            </p>
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
              painel
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {LAYER_PANEL_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  if ("staticValue" in item) {
                    return (
                      <div key={item.label} className="layer-toggle">
                        <span>{item.label}</span>
                        <span>{item.staticValue}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setLayer(item.key)}
                      className={`layer-toggle ${
                        layerVisibility[item.key] ? "layer-toggle-active" : ""
                      }`}
                    >
                      <span>{item.label}</span>
                      <span>{layerVisibility[item.key] ? "Ligado" : "Desligado"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {!territorialData && !mapError && (
        <div className="pointer-events-none map-panel absolute inset-x-4 top-28 z-10 rounded-[22px] px-4 py-3 text-sm text-slate-200">
          Carregando camadas territoriais...
        </div>
      )}

      {mapError && (
        <div className="pointer-events-none map-panel absolute inset-x-4 top-28 z-10 rounded-[22px] border border-red-400/25 px-4 py-3 text-sm text-slate-100">
          Não foi possível carregar o mapa. Detalhe técnico: {mapError}
        </div>
      )}

      <div className="pointer-events-none map-panel absolute bottom-4 left-4 z-10 rounded-[24px] px-4 py-3 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.45)]" />
            Ativo
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]" />
            Em mediação
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
            Resolvido
          </span>
        </div>
      </div>

      <div className="pointer-events-none map-panel absolute bottom-4 right-4 z-10 w-[320px] rounded-[28px] px-4 py-4 shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Detalhe selecionado
        </p>
        {selectedConflict ? (
          <div className="mt-3 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-50">
                {selectedConflict.nome}
              </h3>
              <p className="mt-1 text-sm text-slate-400">{selectedConflict.municipio}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 bg-slate-950/55 px-2.5 py-1 text-xs text-slate-300">
                {selectedConflict.tipo}
              </span>
              <span
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{
                  color: getStatusColor(selectedConflict.status),
                  borderColor: `${getStatusColor(selectedConflict.status)}55`,
                  backgroundColor: `${getStatusColor(selectedConflict.status)}18`,
                }}
              >
                {selectedConflict.status}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              {selectedConflict.descricao}
            </p>
            <div className="text-xs text-slate-500">
              Data do registro: {formatDate(selectedConflict.data)}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Selecione um marcador no mapa ou uma ocorrência na lista para visualizar os
            detalhes.
          </p>
        )}
      </div>
    </main>
  );
}
