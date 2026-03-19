import maplibregl from "maplibre-gl";

export const MAP_SOURCE_IDS = {
  state: "pernambuco",
  municipalities: "pernambuco-municipios",
  conflicts: "conflicts",
  relief: "relief",
} as const;

export const MAP_LAYER_IDS = {
  relief: "relief-hillshade",
  stateFill: "pernambuco-fill",
  municipalityOutline: "pernambuco-municipios-outline",
  stateOutline: "pernambuco-outline",
  clusterHitArea: "conflicts-cluster-hit-area",
  clusters: "conflicts-clusters",
  clusterCount: "conflicts-cluster-count",
  conflictHitArea: "conflicts-hit-area",
  conflicts: "conflicts-unclustered-points",
  selectedConflict: "conflicts-selected-point",
  conflictIcons: "conflicts-icons",
  conflictLabels: "conflicts-labels",
} as const;

export const MAP_ICON_IDS = {
  land: "conflict-icon-land",
  water: "conflict-icon-water",
  environmental: "conflict-icon-environmental",
  infrastructure: "conflict-icon-infrastructure",
  traditional: "conflict-icon-traditional",
  generic: "conflict-icon-generic",
} as const;

type LayerDefinition = Parameters<maplibregl.Map["addLayer"]>[0];
type IconImageValue = LayerDefinition extends {
  layout?: { "icon-image"?: infer T };
}
  ? T
  : never;

const conflictTypeIconExpression = [
  "match",
  ["get", "tipo"],
  "Terra",
  MAP_ICON_IDS.land,
  "Água",
  MAP_ICON_IDS.water,
  "Ambiental",
  MAP_ICON_IDS.environmental,
  "Infraestrutura rural",
  MAP_ICON_IDS.infrastructure,
  "Território tradicional",
  MAP_ICON_IDS.traditional,
  MAP_ICON_IDS.generic,
];

export const MAP_LAYER_GROUPS = {
  base: [],
  boundaries: [
    MAP_LAYER_IDS.stateFill,
    MAP_LAYER_IDS.stateOutline,
    MAP_LAYER_IDS.municipalityOutline,
  ],
  territorialAnalysis: [MAP_LAYER_IDS.relief],
  conflicts: [
    MAP_LAYER_IDS.clusterHitArea,
    MAP_LAYER_IDS.clusters,
    MAP_LAYER_IDS.clusterCount,
    MAP_LAYER_IDS.conflictHitArea,
    MAP_LAYER_IDS.conflicts,
    MAP_LAYER_IDS.selectedConflict,
    MAP_LAYER_IDS.conflictIcons,
    MAP_LAYER_IDS.conflictLabels,
  ],
} as const;

const optionalLayerDefinitions: LayerDefinition[] = [
  {
    id: MAP_LAYER_IDS.relief,
    type: "raster",
    source: MAP_SOURCE_IDS.relief,
    paint: {
      "raster-opacity": 0.4,
      "raster-fade-duration": 100,
      "raster-resampling": "linear",
    },
    layout: {
      visibility: "none",
    },
  },
];

const stateLayerDefinitions: LayerDefinition[] = [
  {
    id: MAP_LAYER_IDS.stateFill,
    type: "fill",
    source: MAP_SOURCE_IDS.state,
    paint: {
      "fill-color": "#7c8ea7",
      "fill-opacity": 0.05,
    },
  },
  {
    id: MAP_LAYER_IDS.stateOutline,
    type: "line",
    source: MAP_SOURCE_IDS.state,
    paint: {
      "line-color": "#8fa2bd",
      "line-width": 1.4,
      "line-opacity": 0.72,
    },
  },
];

const municipalityLayerDefinitions: LayerDefinition[] = [
  {
    id: MAP_LAYER_IDS.municipalityOutline,
    type: "line",
    source: MAP_SOURCE_IDS.municipalities,
    paint: {
      "line-color": "#516175",
      "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.45, 10, 1.1],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.22, 10, 0.5],
    },
  },
];

const conflictLayerDefinitions: LayerDefinition[] = [
  {
    id: MAP_LAYER_IDS.clusterHitArea,
    type: "circle",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        [
          "step",
          ["get", "point_count"],
          22,
          8,
          28,
          20,
          34,
          40,
          40,
          80,
          46,
        ],
        10,
        [
          "step",
          ["get", "point_count"],
          26,
          8,
          34,
          20,
          42,
          40,
          50,
          80,
          58,
        ],
      ],
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    },
  },
  {
    id: MAP_LAYER_IDS.clusters,
    type: "circle",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#1e3a8a",
        8,
        "#2563eb",
        20,
        "#0ea5e9",
        40,
        "#22c55e",
        80,
        "#f59e0b",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        [
          "step",
          ["get", "point_count"],
          16,
          8,
          20,
          20,
          26,
          40,
          32,
          80,
          38,
        ],
        10,
        [
          "step",
          ["get", "point_count"],
          20,
          8,
          26,
          20,
          34,
          40,
          42,
          80,
          50,
        ],
      ],
      "circle-opacity": 0.88,
      "circle-stroke-color": "#0f172a",
      "circle-stroke-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        1.5,
        10,
        2.5,
      ],
      "circle-blur": 0.05,
    },
  },
  {
    id: MAP_LAYER_IDS.clusterCount,
    type: "symbol",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        11,
        10,
        14,
      ],
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#e2e8f0",
      "text-halo-color": "#020617",
      "text-halo-width": 1.2,
    },
  },
  {
    id: MAP_LAYER_IDS.conflictHitArea,
    type: "circle",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 18,
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    },
  },
  {
    id: MAP_LAYER_IDS.conflicts,
    type: "circle",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "status"], "Ativo"],
        11,
        ["==", ["get", "status"], "Em mediação"],
        10,
        9,
      ],
      "circle-color": [
        "match",
        ["get", "status"],
        "Ativo",
        "#f87171",
        "Em mediação",
        "#fbbf24",
        "Resolvido",
        "#34d399",
        "#94a3b8",
      ],
      "circle-stroke-color": "#0f172a",
      "circle-stroke-width": 2.2,
      "circle-opacity": 0.98,
    },
  },
  {
    id: MAP_LAYER_IDS.selectedConflict,
    type: "circle",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], -1]],
    paint: {
      "circle-radius": 17,
      "circle-color": "rgba(226, 232, 240, 0.12)",
      "circle-stroke-color": "#f8fafc",
      "circle-stroke-width": 2.2,
      "circle-opacity": 1,
    },
  },
  {
    id: MAP_LAYER_IDS.conflictIcons,
    type: "symbol",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": conflictTypeIconExpression as IconImageValue,
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        0.7,
        10,
        0.9,
      ],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  },
  {
    id: MAP_LAYER_IDS.conflictLabels,
    type: "symbol",
    source: MAP_SOURCE_IDS.conflicts,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "municipio"],
      "text-size": 11,
      "text-offset": [0, 1.7],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#e2e8f0",
      "text-halo-color": "#020617",
      "text-halo-width": 1,
    },
  },
];

function addLayerGroup(map: maplibregl.Map, layers: LayerDefinition[]): void {
  layers.forEach((layer) => {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  });
}

export function addStateLayers(map: maplibregl.Map): void {
  addLayerGroup(map, stateLayerDefinitions);
}

export function addMunicipalityLayers(map: maplibregl.Map): void {
  addLayerGroup(map, municipalityLayerDefinitions);
}

export function addConflictLayers(map: maplibregl.Map): void {
  addLayerGroup(map, conflictLayerDefinitions);
}

export function addOptionalLayers(map: maplibregl.Map): void {
  addLayerGroup(map, optionalLayerDefinitions);
}

export function setLayerVisibility(
  map: maplibregl.Map,
  layerId: string,
  isVisible: boolean,
): void {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setLayoutProperty(layerId, "visibility", isVisible ? "visible" : "none");
}

export function setSelectedConflict(
  map: maplibregl.Map,
  selectedConflictId: number | null,
): void {
  if (!map.getLayer(MAP_LAYER_IDS.selectedConflict)) {
    return;
  }

  map.setFilter(MAP_LAYER_IDS.selectedConflict, [
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "id"], selectedConflictId ?? -1],
  ]);
}
