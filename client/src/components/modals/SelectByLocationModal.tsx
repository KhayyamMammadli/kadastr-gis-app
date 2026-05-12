import { Alert, Divider, InputNumber, Modal, Select, Space, Typography } from "antd";
import type { SelectionMode, SelectionRelation } from "../../types/gis";

const { Text } = Typography;

export type GisLayerKey = "parcels" | "buildings" | "objects" | "roads";
export type SourceLayerKey = GisLayerKey | "draw";

type Props = {
  open: boolean;
  targetLayer: GisLayerKey;
  sourceLayer: SourceLayerKey;
  relation: SelectionRelation;
  selectionMode: SelectionMode;
  searchDistance: number;
  onTargetLayerChange: (value: GisLayerKey) => void;
  onSourceLayerChange: (value: SourceLayerKey) => void;
  onRelationChange: (value: SelectionRelation) => void;
  onSelectionModeChange: (value: SelectionMode) => void;
  onSearchDistanceChange: (value: number) => void;
  onClose: () => void;
  onStart: () => void;
};

export default function SelectByLocationModal({
  open,
  targetLayer,
  sourceLayer,
  relation,
  selectionMode,
  searchDistance,
  onTargetLayerChange,
  onSourceLayerChange,
  onRelationChange,
  onSelectionModeChange,
  onSearchDistanceChange,
  onClose,
  onStart
}: Props) {
  return (
    <Modal
      title="ArcGIS tipli məkana görə seçim"
      open={open}
      onCancel={onClose}
      onOk={onStart}
      okText={sourceLayer === "draw" ? "Sahə çək" : "Seçimi icra et"}
      cancelText="Bağla"
      width={680}
    >
      <Space direction="vertical" size={14} className="full">
        <div>
          <Text strong>Layer-dən obyekt seçilsin?</Text>
          <Select
            value={targetLayer}
            onChange={onTargetLayerChange}
            className="full"
            options={[
              { value: "parcels", label: "Kadastr sahələri / Parcels" },
              { value: "buildings", label: "Binalar / Buildings" },
              { value: "objects", label: "Obyektlər / Objects" },
              { value: "roads", label: "Yollar / Roads" }
            ]}
          />
        </div>

        <div>
          <Text strong>Seçim nəyə əsasən edilsin?</Text>
          <Select
            value={sourceLayer}
            onChange={onSourceLayerChange}
            className="full"
            options={[
              { value: "draw", label: "Xəritədə seçim sahəsi çək" },
              { value: "parcels", label: "Kadastr sahələri / Parcels" },
              { value: "buildings", label: "Binalar / Buildings" },
              { value: "objects", label: "Obyektlər / Objects" },
              { value: "roads", label: "Yollar / Roads" }
            ]}
          />
        </div>

        <Divider style={{ margin: "4px 0" }} />

        <div>
          <Text strong>Məkan əlaqəsi</Text>
          <Select
            value={relation}
            onChange={onRelationChange}
            className="full"
            options={[
              { value: "intersects", label: "Intersect — kəsişənlər" },
              { value: "contains", label: "Contains — özündə saxlayanlar" },
              { value: "within", label: "Within — tam daxilində olanlar" },
              { value: "touches", label: "Touches — toxunanlar" },
              { value: "overlaps", label: "Overlaps — üst-üstə düşənlər" }
            ]}
          />
        </div>

        <div>
          <Text strong>Seçim üsulu</Text>
          <Select
            value={selectionMode}
            onChange={onSelectionModeChange}
            className="full"
            options={[
              { value: "new", label: "New selection — yeni seçim" },
              { value: "add", label: "Add to current selection — mövcud seçimə əlavə et" },
              { value: "remove", label: "Remove from current selection — mövcud seçimdən çıxart" },
              { value: "from", label: "Select from current selection — mövcud seçimin içindən seç" }
            ]}
          />
        </div>

        <div>
          <Text strong>Buffer məsafəsi</Text>
          <InputNumber
            min={0}
            max={5000}
            value={searchDistance}
            onChange={(value) => onSearchDistanceChange(Number(value || 0))}
            addonAfter="metr"
            className="full"
          />
        </div>
      </Space>
    </Modal>
  );
}
