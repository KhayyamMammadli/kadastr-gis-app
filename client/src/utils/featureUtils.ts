import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { getArea } from "ol/sphere";

export function featureId(feature: any) {
  return feature.get("id") || feature.getId() || feature.get("name") || "N/A";
}

export function areaOfFeature(feature: Feature<Geometry>) {
  const geometry = feature.getGeometry();
  if (!geometry || geometry.getType() !== "Polygon") return 0;
  return Math.round(getArea(geometry));
}
