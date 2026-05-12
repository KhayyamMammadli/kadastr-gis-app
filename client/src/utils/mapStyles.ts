import { Fill, Stroke, Style, Text, Circle as CircleStyle, RegularShape } from "ol/style";

function objectIcon(feature: any, selected = false) {
  const category = feature.get("category") || "";
  const commonStroke = new Stroke({ color: selected ? "#00a8ff" : "#fff", width: selected ? 4 : 2 });

  if (category.includes("Ticarət")) {
    return new RegularShape({
      points: 4,
      radius: selected ? 10 : 8,
      angle: Math.PI / 4,
      fill: new Fill({ color: "#fa541c" }),
      stroke: commonStroke
    });
  }

  if (category.includes("Sosial")) {
    return new RegularShape({
      points: 3,
      radius: selected ? 11 : 9,
      fill: new Fill({ color: "#52c41a" }),
      stroke: commonStroke
    });
  }

  if (category.includes("Parkinq")) {
    return new CircleStyle({
      radius: selected ? 9 : 7,
      fill: new Fill({ color: "#1677ff" }),
      stroke: commonStroke
    });
  }

  if (category.includes("Sənaye")) {
    return new RegularShape({
      points: 5,
      radius: selected ? 10 : 8,
      fill: new Fill({ color: "#722ed1" }),
      stroke: commonStroke
    });
  }

  return new CircleStyle({
    radius: selected ? 8 : 6,
    fill: new Fill({ color: "#faad14" }),
    stroke: commonStroke
  });
}

export function parcelStyle(feature: any, selected = false) {
  const isMerged = Boolean(feature.get("mergedFrom"));
  const color = feature.get("color") || "#1677ff";

  return new Style({
    fill: new Fill({
      color: isMerged
        ? "rgba(114,46,209,0.28)"
        : selected
          ? color + "55"
          : color + "33"
    }),
    stroke: new Stroke({
      color: isMerged ? "#722ed1" : selected ? "#001d66" : color,
      width: isMerged ? 5 : selected ? 4 : 2,
      lineDash: isMerged ? [10, 6] : undefined
    }),
    text: new Text({
      text: feature.get("mergeLabel") || feature.get("id") || "",
      font: isMerged ? "700 13px Inter, Arial" : "600 12px Inter, Arial",
      fill: new Fill({ color: isMerged ? "#3b0764" : "#0f172a" }),
      stroke: new Stroke({ color: "#fff", width: 5 }),
      offsetY: -12
    })
  });
}

export function buildingStyle(feature: any, selected = false) {
  const type = feature.get("type");
  const geomType = feature.getGeometry()?.getType();

  if (geomType === "LineString" || geomType === "MultiLineString") {
    const isMerged = Boolean(feature.get("mergedFrom"));
    return new Style({
      stroke: new Stroke({
        color: isMerged ? "#722ed1" : selected ? "#00a8ff" : "#faad14",
        width: isMerged ? 6 : selected ? 5 : 3,
        lineDash: isMerged ? [10, 6] : undefined
      }),
      text: new Text({
        text: feature.get("mergeLabel") || feature.get("id") || "",
        font: "600 10px Inter, Arial",
        fill: new Fill({ color: "#111827" }),
        stroke: new Stroke({ color: "#fff", width: 3 }),
        offsetY: -10
      })
    });
  }

  if (geomType === "Point") {
    const isMerged = Boolean(feature.get("mergedFrom"));
    return new Style({
      image: isMerged
        ? new RegularShape({
            points: 6,
            radius: 12,
            fill: new Fill({ color: "#722ed1" }),
            stroke: new Stroke({ color: "#fff", width: 3 })
          })
        : objectIcon(feature, selected),
      text: new Text({
        text: feature.get("id"),
        font: "600 10px Inter, Arial",
        fill: new Fill({ color: "#111827" }),
        stroke: new Stroke({ color: "#fff", width: 3 }),
        offsetY: -18
      })
    });
  }

  return new Style({
    fill: new Fill({ color: selected ? "rgba(250,84,28,0.35)" : "rgba(250,84,28,0.22)" }),
    stroke: new Stroke({ color: selected ? "#00a8ff" : "#fa541c", width: selected ? 4 : 2 }),
    text: new Text({
      text: feature.get("mergeLabel") || feature.get("id"),
      font: "600 10px Inter, Arial",
      fill: new Fill({ color: "#111827" }),
      stroke: new Stroke({ color: "#fff", width: 3 })
    })
  });
}
