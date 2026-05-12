import { apiClient } from "./api";
import type { GeoJsonFeatureCollection } from "../types/gis";

export async function getLayers(): Promise<GeoJsonFeatureCollection> {
  const response = await apiClient.get("/layers");
  return response.data;
}

export async function saveLayers(data: GeoJsonFeatureCollection): Promise<void> {
  await apiClient.post("/layers/save", data);
}
