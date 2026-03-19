import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { getLargestPolygonFeatureCollection } from "../map/geojson";

export type TerritorialGeoData = {
  state: FeatureCollection<Geometry, GeoJsonProperties>;
  stateViewport: FeatureCollection<Geometry, GeoJsonProperties>;
  municipalities: FeatureCollection<Geometry, GeoJsonProperties>;
};

const GEO_ENDPOINTS = {
  state: `${import.meta.env.BASE_URL}geo/pernambuco.geojson`,
  municipalities: `${import.meta.env.BASE_URL}geo/pernambuco-municipios.geojson`,
} as const;

let territorialGeoDataPromise: Promise<TerritorialGeoData> | undefined;

async function fetchGeoJson(
  url: string,
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao carregar camada geográfica (${response.status}).`);
  }

  return (await response.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
}

export async function getTerritorialGeoData(): Promise<TerritorialGeoData> {
  if (!territorialGeoDataPromise) {
    territorialGeoDataPromise = Promise.all([
      fetchGeoJson(GEO_ENDPOINTS.state),
      fetchGeoJson(GEO_ENDPOINTS.municipalities),
    ])
      .then(([state, municipalities]) => ({
        state,
        stateViewport: getLargestPolygonFeatureCollection(state),
        municipalities,
      }))
      .catch((error) => {
        territorialGeoDataPromise = undefined;
        throw error;
      });
  }

  return territorialGeoDataPromise;
}
