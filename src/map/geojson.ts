import maplibregl from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  GeometryCollection,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";
import type { Conflict } from "./types";

function getGeometryPositions(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case "Point":
      return [(geometry as Point).coordinates];
    case "MultiPoint":
    case "LineString":
      return (geometry as MultiPoint).coordinates;
    case "MultiLineString":
    case "Polygon":
      return (geometry as MultiLineString | Polygon).coordinates.flat();
    case "MultiPolygon":
      return (geometry as MultiPolygon).coordinates.flat(2);
    case "GeometryCollection":
      return (geometry as GeometryCollection).geometries.flatMap(getGeometryPositions);
    default:
      return [];
  }
}

export function buildConflictsGeoJSON(
  conflicts: Conflict[],
): FeatureCollection<Point, Omit<Conflict, "coordinates">> {
  return {
    type: "FeatureCollection",
    features: conflicts.map((conflict) => ({
      type: "Feature",
      properties: {
        id: conflict.id,
        nome: conflict.nome,
        municipio: conflict.municipio,
        tipo: conflict.tipo,
        status: conflict.status,
        data: conflict.data,
        descricao: conflict.descricao,
      },
      geometry: {
        type: "Point",
        coordinates: conflict.coordinates,
      },
    })),
  };
}

export function createFeatureCollectionBounds(
  featureCollection: FeatureCollection<Geometry, GeoJsonProperties>,
): maplibregl.LngLatBounds {
  const bounds = new maplibregl.LngLatBounds();

  featureCollection.features.forEach((feature) => {
    getGeometryPositions(feature.geometry).forEach((coordinate) => {
      bounds.extend(coordinate as [number, number]);
    });
  });

  return bounds;
}

function getRingArea(coordinates: Position[]): number {
  let area = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [x1, y1] = coordinates[index];
    const [x2, y2] = coordinates[index + 1];

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function getFeatureArea(feature: Feature<Geometry, GeoJsonProperties>): number {
  if (feature.geometry.type === "Polygon") {
    return getRingArea(feature.geometry.coordinates[0] ?? []);
  }

  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.reduce(
      (largestArea, polygonCoordinates) =>
        Math.max(largestArea, getRingArea(polygonCoordinates[0] ?? [])),
      0,
    );
  }

  return 0;
}

export function getLargestPolygonFeatureCollection(
  featureCollection: FeatureCollection<Geometry, GeoJsonProperties>,
): FeatureCollection<Geometry, GeoJsonProperties> {
  const polygonFeatures = featureCollection.features.flatMap((feature) => {
    if (feature.geometry.type === "Polygon") {
      return [feature];
    }

    if (feature.geometry.type === "MultiPolygon") {
      return feature.geometry.coordinates.map((polygonCoordinates) => ({
        ...feature,
        geometry: {
          type: "Polygon" as const,
          coordinates: polygonCoordinates,
        },
      }));
    }

    return [];
  });

  if (polygonFeatures.length === 0) {
    return featureCollection;
  }

  const largestFeature = polygonFeatures.reduce((currentLargest, feature) =>
    getFeatureArea(feature) > getFeatureArea(currentLargest) ? feature : currentLargest,
  );

  return {
    type: "FeatureCollection",
    features: [largestFeature],
  };
}

export function fitMapToFeatureCollection(
  map: maplibregl.Map,
  featureCollection: FeatureCollection<Geometry, GeoJsonProperties>,
  options?: Omit<maplibregl.FitBoundsOptions, "padding"> & {
    padding?: number | maplibregl.PaddingOptions;
  },
): void {
  map.fitBounds(createFeatureCollectionBounds(featureCollection), {
    padding: 50,
    duration: 0,
    ...options,
  });
}
