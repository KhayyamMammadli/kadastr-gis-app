import { Alert, Button, Spin, notification } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Translate from "ol/interaction/Translate";
import SelectInteraction from "ol/interaction/Select";
import { click } from "ol/events/condition";
import { fromLonLat, toLonLat } from "ol/proj";
import { SaveOutlined } from "@ant-design/icons";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import Collection from "ol/Collection";
import { getArea } from "ol/sphere";
import * as turf from "@turf/turf";
import "ol/ol.css";

import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";
import MapToolbar from "../components/map/MapToolbar";
import MapSummary from "../components/map/MapSummary";
import SelectedObjectsPanel from "../components/map/SelectedObjectsPanel";
import SidePanels from "../components/map/SidePanels";
import ObjectDetailsDrawer from "../components/map/ObjectDetailsDrawer";
import MergeModal from "../components/modals/MergeModal";
import ColorModal from "../components/modals/ColorModal";
import SelectByLocationModal, { type GisLayerKey, type SourceLayerKey } from "../components/modals/SelectByLocationModal";
import { useAuth } from "../hooks/useAuth";
import { useGeometries } from "../hooks/useGeometries";
import { useLayers } from "../hooks/useLayers";
import { areaOfFeature, featureId } from "../utils/featureUtils";
import { buildingStyle, parcelStyle } from "../utils/mapStyles";
import type { MapFeature, SelectionMode, SelectionRelation } from "../types/gis";

const geojson = new GeoJSON({ featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" });

function toTurfFeature(feature: any) {
  return geojson.writeFeatureObject(feature, { featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" }) as any;
}

function splitPolygonWithLine(selectedFeature: MapFeature, lineFeature: MapFeature) {
  const polygon = selectedFeature.getGeometry();
  const line = lineFeature.getGeometry();

  if (!polygon || polygon.getType() !== "Polygon" || !line || line.getType() !== "LineString") return null;

  const ring = (polygon as Polygon).getCoordinates()[0].slice();
  const lineCoords = (line as any).getCoordinates();

  if (lineCoords.length < 2 || ring.length < 4) return null;

  const p1 = lineCoords[0];
  const p2 = lineCoords[lineCoords.length - 1];

  const side = (p: any) => (p2[0] - p1[0]) * (p[1] - p1[1]) - (p2[1] - p1[1]) * (p[0] - p1[0]);

  const intersection = (a: any, b: any) => {
    const sa = side(a);
    const sb = side(b);
    const t = sa / (sa - sb);

    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t
    ];
  };

  const makePart = (keepPositive: boolean) => {
    const output: any[] = [];

    for (let i = 0; i < ring.length - 1; i++) {
      const current = ring[i];
      const next = ring[i + 1];
      const currentInside = keepPositive ? side(current) >= 0 : side(current) <= 0;
      const nextInside = keepPositive ? side(next) >= 0 : side(next) <= 0;

      if (currentInside && nextInside) output.push(next);
      else if (currentInside && !nextInside) output.push(intersection(current, next));
      else if (!currentInside && nextInside) {
        output.push(intersection(current, next));
        output.push(next);
      }
    }

    if (output.length < 3) return null;

    const first = output[0];
    const last = output[output.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) output.push([first[0], first[1]]);

    const geometry = new Polygon([output]);
    if (Math.abs(getArea(geometry)) < 10) return null;

    return new Feature({ geometry }) as MapFeature;
  };

  const partA = makePart(true);
  const partB = makePart(false);

  if (!partA || !partB) return null;

  const baseProps = { ...selectedFeature.getProperties() };
  delete baseProps.geometry;

  partA.setProperties({
    ...baseProps,
    id: `${selectedFeature.get("id")}-A`,
    name: `${selectedFeature.get("name") || selectedFeature.get("id")} / A hissəsi`,
    cutFrom: selectedFeature.get("id"),
    color: "#1677ff"
  });

  partB.setProperties({
    ...baseProps,
    id: `${selectedFeature.get("id")}-B`,
    name: `${selectedFeature.get("name") || selectedFeature.get("id")} / B hissəsi`,
    cutFrom: selectedFeature.get("id"),
    color: "#fa541c"
  });

  return [partA, partB];
}

export default function DashboardPage() {
  const { logout, isLogoutLoading } = useAuth();
  const { geometries, isLoadingGeometries, saveGeometries, isSavingGeometries } = useGeometries(true);
  const { layers, isLoadingLayers, saveLayers, isSavingLayers } = useLayers(true);
  const [notificationApi, contextHolder] = notification.useNotification();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<Map | null>(null);
  const parcelSource = useRef(new VectorSource());
  const buildingSource = useRef(new VectorSource());
  const selectionSource = useRef(new VectorSource());
  const cutLineSource = useRef(new VectorSource());
  const selected = useRef(new Collection<MapFeature>());
  const interactions = useRef<any[]>([]);

  const [tool, setTool] = useState("select");
  const [coordinates, setCoordinates] = useState("40.4093 / 49.8671");
  const [selectedParcels, setSelectedParcels] = useState<MapFeature[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<MapFeature[]>([]);
  const [detailFeature, setDetailFeature] = useState<any>(null);
  const [objectsPanelOpen, setObjectsPanelOpen] = useState(true);
  const [parcelsPanelOpen, setParcelsPanelOpen] = useState(true);
  const [areaObjectsPanelOpen, setAreaObjectsPanelOpen] = useState(true);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeModalFeatures, setMergeModalFeatures] = useState<MapFeature[]>([]);
  const [colorOpen, setColorOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [targetLayer, setTargetLayer] = useState<GisLayerKey>("parcels");
  const [sourceLayer, setSourceLayer] = useState<SourceLayerKey>("draw");
  const [relation, setRelation] = useState<SelectionRelation>("intersects");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("new");
  const [searchDistance, setSearchDistance] = useState(0);

  const toast = {
    success: (description: string) => notificationApi.success({ message: "Uğurlu əməliyyat", description, placement: "topRight" }),
    error: (description: string) => notificationApi.error({ message: "Xəta", description, placement: "topRight" }),
    info: (description: string) => notificationApi.info({ message: "Məlumat", description, placement: "topRight" }),
    warning: (description: string) => notificationApi.warning({ message: "Diqqət", description, placement: "topRight" })
  };

  const selectedObjectRows = useMemo(() => selectedObjects.map((feature: any) => ({
    key: featureId(feature),
    id: featureId(feature),
    name: feature.get("name"),
    category: feature.get("category"),
    floors: feature.get("floors"),
    apartments: feature.get("apartments"),
    status: feature.get("status"),
    mergeInfo: feature.get("mergeLabel") || (feature.get("mergedFrom") ? `${feature.get("mergedFrom")} → ${feature.get("mergedTo") || feature.get("id")}` : ""),
    mergedAt: feature.get("mergedAt") || "",
    mergedItems: feature.get("mergedItems") || "",
    feature
  })), [selectedObjects]);

  const selectedParcelRows = useMemo(() => selectedParcels.map((feature: any) => ({
    key: featureId(feature),
    id: featureId(feature),
    name: feature.get("name"),
    status: feature.get("status"),
    area: areaOfFeature(feature),
    owner: feature.get("owner"),
    feature
  })), [selectedParcels]);

  const mergeFeatures = useMemo(() => {
    const map = new globalThis.Map<string, MapFeature>();

    selectedParcels.forEach((feature: any) => {
      const id = String(feature.get("id") || featureId(feature));
      map.set(id, feature);
    });

    selectedObjects.forEach((feature: any) => {
      const id = String(feature.get("id") || featureId(feature));
      map.set(id, feature);
    });

    return Array.from(map.values());
  }, [selectedParcels, selectedObjects]);

  const clearInteractions = () => {
    const map = mapObj.current;
    if (!map) return;

    interactions.current.forEach((interaction) => map.removeInteraction(interaction));
    interactions.current = [];
  };

  const refreshSelected = () => {
    setSelectedParcels([...selected.current.getArray()]);
  };

  const selectMode = () => {
    setTool("select");
    clearInteractions();

    const select = new SelectInteraction({
      condition: click,
      toggleCondition: click,
      multi: true,
      features: selected.current,
      layers: (layer: any) => layer.get("name") === "parcels",
      style: null
    });

    select.on("select", () => {
      refreshSelected();
      parcelSource.current.changed();
    });

    mapObj.current?.addInteraction(select);
    interactions.current.push(select);
  };

  const analyseObjectsInGeometry = (geometry: Geometry) => {
    const selector = new Feature({ geometry }) as MapFeature;
    const selectorTurf = toTurfFeature(selector);

    const found = buildingSource.current.getFeatures().filter((feature: any) => {
      try {
        const target = toTurfFeature(feature);
        return turf.booleanIntersects(target, selectorTurf) || turf.booleanWithin(target, selectorTurf);
      } catch {
        return false;
      }
    }) as MapFeature[];

    setSelectedObjects(found);

    if (found.length === 0) {
      toast.info("Seçilmiş sahədə demo bina/obyekt tapılmadı");
    } else {
      const buildings = found.filter((item: any) => item.get("type") === "building").length;
      const objects = found.filter((item: any) => item.get("type") === "object").length;
      const roads = found.filter((item: any) => item.get("type") === "road").length;
      toast.success(`Sahədə ${buildings} bina, ${objects} obyekt, ${roads} yol tapıldı`);
    }
  };

  const drawPolygon = () => {
    setTool("draw");
    clearInteractions();

    const draw = new Draw({ source: parcelSource.current, type: "Polygon" });

    draw.on("drawend", (event: any) => {
      const id = "AZ-KDR-" + Date.now().toString().slice(-6);
      event.feature.setProperties({
        id,
        name: "Yeni kadastr sahəsi",
        type: "parcel",
        status: "Yeni",
        color: "#1677ff",
        owner: "Məlumat yoxdur"
      });

      setTimeout(() => {
        analyseObjectsInGeometry(event.feature.getGeometry());
        setHasUnsavedChanges(true);
        toast.success("Poliqon çəkildi");
      }, 80);
    });

    mapObj.current?.addInteraction(draw);
    interactions.current.push(draw);
  };

  const editVertex = () => {
    setTool("edit");
    clearInteractions();

    const modify = new Modify({ features: selected.current });
    modify.on("modifyend", () => setHasUnsavedChanges(true));
    mapObj.current?.addInteraction(modify);
    interactions.current.push(modify);
  };

  const dragPolygons = () => {
    setTool("drag");
    clearInteractions();

    const translate = new Translate({ features: selected.current });
    translate.on("translateend", () => setHasUnsavedChanges(true));
    mapObj.current?.addInteraction(translate);
    interactions.current.push(translate);
  };

  const zoomToFeature = (feature: any) => {
    const extent = feature.getGeometry().getExtent();
    mapObj.current?.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 500, maxZoom: 18 });
  };

  const zoomToSelection = () => {
    const selectedArray = selected.current.getArray();
    if (!selectedArray.length) return;

    const extent = selectedArray[0].getGeometry()?.getExtent().slice();
    if (!extent) return;

    selectedArray.slice(1).forEach((feature: any) => {
      const next = feature.getGeometry().getExtent();
      extent[0] = Math.min(extent[0], next[0]);
      extent[1] = Math.min(extent[1], next[1]);
      extent[2] = Math.max(extent[2], next[2]);
      extent[3] = Math.max(extent[3], next[3]);
    });

    mapObj.current?.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 500 });
  };

  const save = async () => {
    const data = geojson.writeFeaturesObject(parcelSource.current.getFeatures(), {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326"
    }) as any;

    const layerData = geojson.writeFeaturesObject(buildingSource.current.getFeatures(), {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326"
    }) as any;

    localStorage.setItem("kadastr_parcels", JSON.stringify(data));
    await saveGeometries(data);
    await saveLayers(layerData);
    setHasUnsavedChanges(false);
    toast.success("Dəyişikliklər yadda saxlanıldı");
  };


  const collectCurrentMergeFeatures = () => {
    const byId = new globalThis.Map<string, MapFeature>();

    selected.current.getArray().forEach((feature: any) => {
      const id = String(feature.get("id") || featureId(feature));
      byId.set(id, feature as MapFeature);
    });

    selectedParcels.forEach((feature: any) => {
      const id = String(feature.get("id") || featureId(feature));
      byId.set(id, feature as MapFeature);
    });

    selectedObjects.forEach((feature: any) => {
      const id = String(feature.get("id") || featureId(feature));
      byId.set(id, feature as MapFeature);
    });

    return Array.from(byId.values()).filter((feature: any) => {
      const type = feature.getGeometry()?.getType();
      return ["Polygon", "MultiPolygon", "LineString", "MultiLineString", "Point", "MultiPoint"].includes(String(type));
    });
  };

  const openMerge = () => {
    refreshSelected();

    const currentFeatures = collectCurrentMergeFeatures();

    if (currentFeatures.length < 2) {
      toast.error("Birləşdirmək üçün ən azı 2 obyekt seçilməlidir");
      return;
    }

    setMergeModalFeatures(currentFeatures);
    setMergeOpen(true);
  };

  const findMergeFeatureById = (id: string) => {
    const activeFeatures = mergeModalFeatures.length ? mergeModalFeatures : collectCurrentMergeFeatures();

    return activeFeatures.find((feature: any, index: number) => {
      const featureIdValue = String(feature.get("id") || feature.getId?.() || `FEATURE-${index + 1}`);
      return featureIdValue === String(id);
    }) as MapFeature | undefined;
  };

  const removeFeatureFromSource = (feature: MapFeature) => {
    const type = feature.getGeometry()?.getType();

    if (type === "Polygon" || type === "MultiPolygon") {
      parcelSource.current.removeFeature(feature);
    } else {
      buildingSource.current.removeFeature(feature);
    }
  };

  const addFeatureToSource = (feature: MapFeature) => {
    const type = feature.getGeometry()?.getType();

    if (type === "Polygon" || type === "MultiPolygon") {
      parcelSource.current.addFeature(feature);
    } else {
      buildingSource.current.addFeature(feature);
    }
  };

  const doMerge = (sourceId: string, targetId: string) => {
    const sourceFeature = findMergeFeatureById(sourceId);
    const targetFeature = findMergeFeatureById(targetId);

    if (!sourceFeature || !targetFeature) {
      toast.error("Seçilmiş obyektlər tapılmadı");
      return;
    }

    if (sourceFeature === targetFeature) {
      toast.error("Eyni obyekti özünə birləşdirmək olmaz");
      return;
    }

    const sourceType = sourceFeature.getGeometry()?.getType();
    const targetType = targetFeature.getGeometry()?.getType();

    if (sourceType !== targetType) {
      toast.error("Fərqli geometry tipləri birləşdirilə bilməz");
      return;
    }

    let mergedFeature: MapFeature | null = null;
    const mergeLabel = `${sourceFeature.get("id")} → ${targetFeature.get("id")}`;

    if (sourceType === "Polygon" || sourceType === "MultiPolygon") {
      let merged: any = null;

      try {
        merged = turf.union(
          turf.featureCollection([
            toTurfFeature(sourceFeature),
            toTurfFeature(targetFeature)
          ]) as any
        );
      } catch {
        merged = null;
      }

      if (!merged) {
        toast.error("Poliqonlar birləşdirilə bilmədi. Poliqonlar kəsişməli və ya toxunmalıdır");
        return;
      }

      const readResult = geojson.readFeature(merged, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326"
      });

      mergedFeature = (Array.isArray(readResult) ? readResult[0] : readResult) as MapFeature;
    }

    if (sourceType === "LineString") {
      const sourceGeometry = sourceFeature.getGeometry() as LineString;
      const targetGeometry = targetFeature.getGeometry() as LineString;

      mergedFeature = new Feature({
        geometry: new LineString([
          ...targetGeometry.getCoordinates(),
          ...sourceGeometry.getCoordinates()
        ])
      }) as MapFeature;
    }

    if (sourceType === "Point") {
      const targetGeometry = targetFeature.getGeometry() as Point;

      mergedFeature = new Feature({
        geometry: targetGeometry.clone()
      }) as MapFeature;
    }

    if (!mergedFeature) {
      toast.error("Bu geometry tipi üçün merge dəstəklənmir");
      return;
    }

    const previousItems = targetFeature.get("mergedItems")
      ? String(targetFeature.get("mergedItems")).split(",").map((item) => item.trim()).filter(Boolean)
      : [String(targetFeature.get("id"))];

    const mergedItems = Array.from(new Set([
      ...previousItems,
      String(sourceFeature.get("id"))
    ]));

    mergedFeature.setProperties({
      ...targetFeature.getProperties(),
      id: targetFeature.get("id"),
      name: `${targetFeature.get("id")} birləşdirildi`,
      status: "Birləşdirildi",
      mergedFrom: sourceFeature.get("id"),
      mergedTo: targetFeature.get("id"),
      mergeLabel,
      mergedItems: mergedItems.join(", "),
      mergedCount: mergedItems.length,
      mergedAt: new Date().toLocaleString("az-AZ"),
      color: "#722ed1"
    });

    removeFeatureFromSource(sourceFeature);
    removeFeatureFromSource(targetFeature);
    addFeatureToSource(mergedFeature);

    selected.current.clear();

    const mergedType = mergedFeature.getGeometry()?.getType();

    if (mergedType === "Polygon" || mergedType === "MultiPolygon") {
      selected.current.push(mergedFeature);
      setSelectedObjects([]);
    } else {
      setSelectedObjects([mergedFeature]);
    }

    refreshSelected();
    parcelSource.current.changed();
    buildingSource.current.changed();

    setMergeOpen(false);
    setMergeModalFeatures([]);
    setHasUnsavedChanges(true);

    toast.success(`${sourceFeature.get("id")} obyekti ${targetFeature.get("id")} obyektinə birləşdirildi`);
  };

  const cutPolygon = () => {
    const selectedArray = selected.current.getArray();

    if (selectedArray.length !== 1) {
      toast.error("Kəsmək üçün yalnız 1 poliqon seçilməlidir");
      return;
    }

    setTool("cut");
    clearInteractions();
    cutLineSource.current.clear();

    const draw = new Draw({ type: "LineString", maxPoints: 2 });

    draw.on("drawend", (event: any) => {
      const target = selectedArray[0] as MapFeature;
      const parts = splitPolygonWithLine(target, event.feature as MapFeature);

      if (!parts || parts.length < 2) {
        toast.error("Xətt poliqonu tam iki hissəyə ayırmadı");
        selectMode();
        return;
      }

      cutLineSource.current.addFeature(event.feature.clone() as MapFeature);
      parcelSource.current.removeFeature(target);

      parts.forEach((feature) => {
        feature.setStyle(undefined);
        parcelSource.current.addFeature(feature);
      });

      selected.current.clear();
      refreshSelected();
      parcelSource.current.changed();
      cutLineSource.current.changed();
      setHasUnsavedChanges(true);
      toast.success("Poliqon xəritədə 2 ayrı hissəyə bölündü");
      selectMode();
    });

    mapObj.current?.addInteraction(draw);
    interactions.current.push(draw);
    toast.info("Kəsmə xəttini 2 kliklə çəkin");
  };

  const changeColor = (color: string) => {
    const selectedArray = selected.current.getArray();

    if (!selectedArray.length) {
      toast.error("Rəng dəyişmək üçün ən azı 1 poliqon seçin");
      return;
    }

    selectedArray.forEach((feature: any) => {
      feature.set("color", color);
      feature.setStyle(parcelStyle(feature, true));
    });

    setColorOpen(false);
    parcelSource.current.changed();
    refreshSelected();
    setHasUnsavedChanges(true);
    toast.success(`${selectedArray.length} poliqonun rəngi dəyişdirildi`);
  };

  const deleteSelected = () => {
    selected.current.getArray().slice().forEach((feature) => parcelSource.current.removeFeature(feature));
    selected.current.clear();
    refreshSelected();
    parcelSource.current.changed();
    setHasUnsavedChanges(true);
    toast.success("Seçilmiş poliqonlar silindi");
  };

  const getLayerFeatures = (layerKey: GisLayerKey): MapFeature[] => {
    if (layerKey === "parcels") {
      return parcelSource.current.getFeatures() as MapFeature[];
    }

    return buildingSource.current.getFeatures().filter((feature: any) => {
      if (layerKey === "buildings") return feature.get("type") === "building";
      if (layerKey === "objects") return feature.get("type") === "object";
      if (layerKey === "roads") return feature.get("type") === "road";
      return false;
    }) as MapFeature[];
  };

  const getSourceFeatures = (layerKey: SourceLayerKey): MapFeature[] => {
    if (layerKey === "draw") return [];
    return getLayerFeatures(layerKey);
  };

  const prepareSourceTurf = (feature: MapFeature) => {
    const turfFeature = toTurfFeature(feature);
    if (searchDistance > 0) {
      try {
        return turf.buffer(turfFeature, searchDistance, { units: "meters" }) || turfFeature;
      } catch {
        return turfFeature;
      }
    }
    return turfFeature;
  };

  const matchByTurf = (targetFeature: MapFeature, sourceFeature: MapFeature) => {
    const targetTurf = toTurfFeature(targetFeature);
    const sourceTurf = prepareSourceTurf(sourceFeature);

    try {
      if (relation === "intersects") return turf.booleanIntersects(targetTurf, sourceTurf);
      if (relation === "contains") return turf.booleanContains(targetTurf, sourceTurf);
      if (relation === "within") return turf.booleanWithin(targetTurf, sourceTurf);
      if (relation === "touches") return turf.booleanTouches(targetTurf, sourceTurf);
      if (relation === "overlaps") return turf.booleanOverlap(targetTurf, sourceTurf);
      return turf.booleanIntersects(targetTurf, sourceTurf);
    } catch {
      return false;
    }
  };

  const applyLayerSelection = (matches: MapFeature[], layerKey: GisLayerKey) => {
    if (layerKey === "parcels") {
      if (selectionMode === "new") selected.current.clear();

      if (selectionMode === "add" || selectionMode === "new") {
        matches.forEach((feature: any) => {
          if (!selected.current.getArray().includes(feature)) selected.current.push(feature);
        });
      }

      if (selectionMode === "remove") {
        matches.forEach((feature: any) => selected.current.remove(feature));
      }

      if (selectionMode === "from") {
        selected.current.getArray().slice().forEach((feature: any) => {
          if (!matches.includes(feature)) selected.current.remove(feature);
        });
      }

      refreshSelected();
      parcelSource.current.changed();
      return;
    }

    setSelectedObjects((previous) => {
      if (selectionMode === "new") return matches;
      if (selectionMode === "add") {
        const next = [...previous];
        matches.forEach((feature) => {
          if (!next.includes(feature)) next.push(feature);
        });
        return next;
      }
      if (selectionMode === "remove") {
        return previous.filter((feature) => !matches.includes(feature));
      }
      if (selectionMode === "from") {
        return previous.filter((feature) => matches.includes(feature));
      }
      return matches;
    });
  };

  const executeLayerSelectByLocation = (sourceFeature?: MapFeature) => {
    const targetFeatures = getLayerFeatures(targetLayer);
    const sourceFeatures = sourceFeature ? [sourceFeature] : getSourceFeatures(sourceLayer);

    if (!sourceFeatures.length) {
      toast.error("Source layer boşdur və ya seçim sahəsi çəkilməyib");
      return;
    }

    const matches = targetFeatures.filter((targetFeature) => {
      return sourceFeatures.some((source) => matchByTurf(targetFeature, source));
    });

    applyLayerSelection(matches, targetLayer);

    const layerTitleMap: Record<GisLayerKey, string> = {
      parcels: "kadastr sahəsi",
      buildings: "bina",
      objects: "obyekt",
      roads: "yol"
    };

    toast.success(`${matches.length} ${layerTitleMap[targetLayer]} seçildi`);

    if (targetLayer !== "parcels") {
      setObjectsPanelOpen(true);
      setAreaObjectsPanelOpen(true);
    }
  };

  const relationMatch = (target: MapFeature, selector: MapFeature) => {
    const targetTurf = toTurfFeature(target);
    const selectorTurf = toTurfFeature(selector);

    if (relation === "intersects") return turf.booleanIntersects(targetTurf, selectorTurf);
    if (relation === "contains") return turf.booleanContains(targetTurf, selectorTurf);
    if (relation === "within") return turf.booleanWithin(targetTurf, selectorTurf);
    if (relation === "touches") return turf.booleanTouches(targetTurf, selectorTurf);
    if (relation === "overlaps") return turf.booleanOverlap(targetTurf, selectorTurf);

    return turf.booleanIntersects(targetTurf, selectorTurf);
  };

  const startSelectByLocation = () => {
    setLocationModalOpen(false);
    setTool("location");
    clearInteractions();

    if (sourceLayer !== "draw") {
      executeLayerSelectByLocation();
      selectMode();
      return;
    }

    const draw = new Draw({ source: selectionSource.current, type: "Polygon" });

    draw.on("drawstart", () => selectionSource.current.clear());

    draw.on("drawend", (event: any) => {
      setTimeout(() => {
        executeLayerSelectByLocation(event.feature as MapFeature);
        toast.success("ArcGIS tipli məkana görə seçim tamamlandı");
      }, 50);
    });

    mapObj.current?.addInteraction(draw);
    interactions.current.push(draw);
  };

  useEffect(() => {
    if (isLoadingGeometries || isLoadingLayers) return;
    if (!mapRef.current || mapObj.current) return;

    // Layer datası React Query ilə backenddən gəldiyi üçün burada ayrıca fake data oxunmur.

    const parcelLayer = new VectorLayer({
      source: parcelSource.current,
      style: (feature: any) => parcelStyle(feature, selected.current.getArray().includes(feature))
    });
    parcelLayer.set("name", "parcels");

    const buildingLayer = new VectorLayer({
      source: buildingSource.current,
      style: (feature: any) => buildingStyle(feature, selectedObjects.includes(feature))
    });
    buildingLayer.set("name", "buildings");

    const selectionLayer = new VectorLayer({ source: selectionSource.current });
    const cutLineLayer = new VectorLayer({ source: cutLineSource.current });

    const map = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() }), parcelLayer, buildingLayer, selectionLayer, cutLineLayer],
      view: new View({ center: fromLonLat([49.8671, 40.4093]), zoom: 12 })
    });

    mapObj.current = map;

    map.on("pointermove", (event: any) => {
      const lonLat = toLonLat(event.coordinate);
      setCoordinates(`${lonLat[1].toFixed(5)} / ${lonLat[0].toFixed(5)}`);
    });

    map.on("singleclick", (event: any) => {
      let found: any = null;

      map.forEachFeatureAtPixel(event.pixel, (feature: any, layer: any) => {
        if (layer?.get("name") === "buildings") found = feature;
      });

      if (found) {
        setDetailFeature(found);
        setSelectedObjects((previous) => {
          if (previous.includes(found)) {
            return previous.filter((item) => item !== found);
          }
          return [...previous, found];
        });
      }
    });

    selected.current.on("add", () => parcelSource.current.changed());
    selected.current.on("remove", () => parcelSource.current.changed());
    selected.current.on("add", refreshSelected);
    selected.current.on("remove", refreshSelected);

    selectMode();

    return () => {
      map.setTarget(undefined);
      mapObj.current = null;
    };
  }, [isLoadingGeometries, isLoadingLayers]);


  useEffect(() => {
    if (!layers) return;

    buildingSource.current.clear();
    buildingSource.current.addFeatures(geojson.readFeatures(layers));
    buildingSource.current.changed();
  }, [layers]);

  useEffect(() => {
    if (!geometries) return;

    parcelSource.current.clear();
    parcelSource.current.addFeatures(geojson.readFeatures(geometries));
  }, [geometries]);

  useEffect(() => {
    if (selectedObjects.length > 0) {
      setObjectsPanelOpen(true);
      setAreaObjectsPanelOpen(true);
    }

    buildingSource.current.changed();
  }, [selectedObjects]);

  useEffect(() => {
    if (selectedParcels.length > 0) {
      setParcelsPanelOpen(true);
    }
  }, [selectedParcels]);

  const buildingCount = selectedObjects.filter((feature: any) => feature.get("type") === "building").length;
  const objectCount = selectedObjects.filter((feature: any) => feature.get("type") === "object").length;
  const roadCount = selectedObjects.filter((feature: any) => feature.get("type") === "road").length;

  return (
    <>
      {contextHolder}

      <div className="dashboard">
        <AppHeader onLogout={logout} isLogoutLoading={isLogoutLoading} />

        <main className="dashboard-main">
          <section className="map-section">
            <div ref={mapRef} className="map" />

            {(isLoadingGeometries || isLoadingLayers) && (
              <div className="map-loading-overlay">
                <Spin size="large" />
                <p>Xəritə və layer məlumatları backenddən yüklənir...</p>
              </div>
            )}

            <MapToolbar
              tool={tool}
              onSelect={selectMode}
              onLocationSelect={() => setLocationModalOpen(true)}
              onDraw={drawPolygon}
              onEdit={editVertex}
              onDrag={dragPolygons}
              onMerge={openMerge}
              onCut={cutPolygon}
              onColor={() => setColorOpen(true)}
              onDelete={deleteSelected}
              onZoom={zoomToSelection}
              onSave={save}
              isSaving={isSavingGeometries || isSavingLayers}
            />

            <MapSummary
              parcelCount={parcelSource.current.getFeatures().length}
              selectedParcelCount={selectedParcels.length}
              buildingCount={buildingCount}
              objectCount={objectCount}
              roadCount={roadCount}
            />

            {hasUnsavedChanges && (
              <div className="unsaved-save-bar">
                <Alert
                  type="warning"
                  showIcon
                  message="Yadda saxlanmamış dəyişikliklər var"
                  description="Səhifəni yeniləsəniz dəyişikliklər itə bilər. Dəyişiklikləri saxlamaq üçün düyməyə basın."
                />
                <Button type="primary" icon={<SaveOutlined />} loading={isSavingGeometries || isSavingLayers} onClick={save}>
                  Yadda saxla
                </Button>
              </div>
            )}

            <SelectedObjectsPanel
              rows={selectedObjectRows}
              open={objectsPanelOpen}
              onToggle={() => setObjectsPanelOpen(!objectsPanelOpen)}
              onZoom={zoomToFeature}
            />
          </section>

          <SidePanels
            parcelRows={selectedParcelRows}
            objectRows={selectedObjectRows}
            parcelsOpen={parcelsPanelOpen}
            areaObjectsOpen={areaObjectsPanelOpen}
            onToggleParcels={() => setParcelsPanelOpen(!parcelsPanelOpen)}
            onToggleObjects={() => setAreaObjectsPanelOpen(!areaObjectsPanelOpen)}
            onZoom={zoomToFeature}
          />
        </main>

        <AppFooter coordinates={coordinates} selectedParcelsCount={selectedParcels.length} selectedObjectsCount={selectedObjects.length} />

        <MergeModal
          open={mergeOpen}
          features={mergeModalFeatures}
          onClose={() => {
            setMergeOpen(false);
            setMergeModalFeatures([]);
          }}
          onMerge={doMerge}
        />
        <ColorModal open={colorOpen} onClose={() => setColorOpen(false)} onSelect={changeColor} />
        <SelectByLocationModal
          open={locationModalOpen}
          targetLayer={targetLayer}
          sourceLayer={sourceLayer}
          relation={relation}
          selectionMode={selectionMode}
          searchDistance={searchDistance}
          onTargetLayerChange={setTargetLayer}
          onSourceLayerChange={setSourceLayer}
          onRelationChange={setRelation}
          onSelectionModeChange={setSelectionMode}
          onSearchDistanceChange={setSearchDistance}
          onClose={() => setLocationModalOpen(false)}
          onStart={startSelectByLocation}
        />
        <ObjectDetailsDrawer feature={detailFeature} onClose={() => setDetailFeature(null)} />
      </div>
    </>
  );
}
