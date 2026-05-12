import { Alert, Button, Modal, Select, Space, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type Props = {
  open: boolean;
  features?: any[];
  onClose: () => void;
  onMerge: (sourceId: string, targetId: string) => void;
};

function geometryLabel(type?: string) {
  if (type === "Polygon" || type === "MultiPolygon") return "Polygon";
  if (type === "LineString" || type === "MultiLineString") return "Line";
  if (type === "Point" || type === "MultiPoint") return "Point";
  return type || "Geometry";
}

function tagColor(type?: string) {
  if (type === "Polygon" || type === "MultiPolygon") return "blue";
  if (type === "LineString" || type === "MultiLineString") return "gold";
  if (type === "Point" || type === "MultiPoint") return "green";
  return "default";
}

function getFeatureId(feature: any, index: number) {
  return String(feature?.get?.("id") || feature?.getId?.() || `FEATURE-${index + 1}`);
}

export default function MergeModal({ open, features = [], onClose, onMerge }: Props) {
  const [sourceId, setSourceId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();

  const safeFeatures = useMemo(() => {
    return (Array.isArray(features) ? features : []).filter((feature) => {
      const type = feature?.getGeometry?.()?.getType?.();
      return ["Polygon", "MultiPolygon", "LineString", "MultiLineString", "Point", "MultiPoint"].includes(String(type));
    });
  }, [features]);

  const options = useMemo(() => {
    return safeFeatures.map((feature, index) => {
      const id = getFeatureId(feature, index);
      const type = feature?.getGeometry?.()?.getType?.();
      const name = feature?.get?.("name") || id;

      return {
        value: id,
        label: `${geometryLabel(type)} · ${id} · ${name}`
      };
    });
  }, [safeFeatures]);

  const sourceFeature = safeFeatures.find((feature, index) => getFeatureId(feature, index) === sourceId);
  const targetFeature = safeFeatures.find((feature, index) => getFeatureId(feature, index) === targetId);
  const sourceType = sourceFeature?.getGeometry?.()?.getType?.();
  const targetType = targetFeature?.getGeometry?.()?.getType?.();
  const typeMismatch = Boolean(sourceId && targetId && sourceType !== targetType);

  useEffect(() => {
    if (!open) {
      setSourceId(undefined);
      setTargetId(undefined);
      return;
    }

    if (safeFeatures.length >= 2) {
      setSourceId(getFeatureId(safeFeatures[0], 0));
      setTargetId(getFeatureId(safeFeatures[1], 1));
    }
  }, [open, safeFeatures]);

  const handleMerge = () => {
    if (!sourceId || !targetId || sourceId === targetId || typeMismatch) return;
    onMerge(sourceId, targetId);
  };

  return (
    <Modal
      title="Obyektləri birləşdir"
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnClose
    >
      <Space direction="vertical" className="full" size={14}>
        <Alert
          type="info"
          showIcon
          message="Merge qaydası"
          description="Eyni geometry tipli obyektlər birləşdirilir: Polygon + Polygon, Line + Line, Point + Point."
        />

        <Space wrap>
          <Tag color={safeFeatures.length >= 2 ? "green" : "red"}>
            Seçilmiş obyekt sayı: {safeFeatures.length}
          </Tag>

          {safeFeatures.map((feature, index) => {
            const type = feature?.getGeometry?.()?.getType?.();
            return (
              <Tag key={getFeatureId(feature, index)} color={tagColor(type)}>
                {geometryLabel(type)}: {getFeatureId(feature, index)}
              </Tag>
            );
          })}
        </Space>

        {safeFeatures.length < 2 && (
          <Alert
            type="warning"
            showIcon
            message="Ən azı 2 obyekt seçilməlidir"
            description="Xəritədə iki polygon, iki line və ya iki point seçin."
          />
        )}

        <div>
          <Text strong>Hansı obyekt birləşdirilsin?</Text>
          <Select
            className="full"
            value={sourceId}
            onChange={setSourceId}
            options={options}
            placeholder="Birləşdiriləcək obyekt"
            notFoundContent="Seçilmiş obyekt yoxdur"
          />
        </div>

        <div>
          <Text strong>Hansı obyektə birləşdirilsin?</Text>
          <Select
            className="full"
            value={targetId}
            onChange={setTargetId}
            options={options}
            placeholder="Əsas obyekt"
            notFoundContent="Seçilmiş obyekt yoxdur"
          />
        </div>

        {sourceId && targetId && sourceId === targetId && (
          <Alert type="error" showIcon message="Eyni obyekti özünə birləşdirmək olmaz" />
        )}

        {typeMismatch && (
          <Alert type="error" showIcon message="Fərqli geometry tipləri birləşdirilə bilməz" />
        )}

        <Button
          type="primary"
          block
          disabled={!sourceId || !targetId || sourceId === targetId || safeFeatures.length < 2 || typeMismatch}
          onClick={handleMerge}
        >
          Birləşdir
        </Button>
      </Space>
    </Modal>
  );
}
