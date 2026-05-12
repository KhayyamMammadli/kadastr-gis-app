import { apiClient } from "./api";
import type { GeoJsonFeatureCollection } from "../types/gis";

export async function getGeometries(): Promise<GeoJsonFeatureCollection> {
  const response = await apiClient.get("/geometries");
  return response.data;
}

export async function saveGeometries(data: GeoJsonFeatureCollection): Promise<void> {
  await apiClient.post("/geometries/save", data);
}
