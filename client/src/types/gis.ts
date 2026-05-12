import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

export type User = {
  username: string;
  fullName: string;
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

export type MapFeature = Feature<Geometry>;

export type SelectionRelation = "intersects" | "contains" | "within" | "touches" | "overlaps";
export type SelectionMode = "new" | "add" | "remove" | "from";
