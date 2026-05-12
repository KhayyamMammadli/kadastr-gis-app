import { Tooltip, Button } from "antd";
import {
  AimOutlined,
  BgColorsOutlined,
  BorderOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  FullscreenOutlined,
  MergeCellsOutlined,
  SaveOutlined,
  ScissorOutlined,
  SelectOutlined
} from "@ant-design/icons";

type Props = {
  tool: string;
  onSelect: () => void;
  onLocationSelect: () => void;
  onDraw: () => void;
  onEdit: () => void;
  onDrag: () => void;
  onMerge: () => void;
  onCut: () => void;
  onColor: () => void;
  onDelete: () => void;
  onZoom: () => void;
  onSave: () => void;
  isSaving?: boolean;
};

export default function MapToolbar(props: Props) {
  const buttons = [
    { title: "Seç", icon: <SelectOutlined />, action: props.onSelect, active: props.tool === "select" },
    { title: "Məkana görə seç", icon: <AimOutlined />, action: props.onLocationSelect, active: props.tool === "location" },
    { title: "Poliqon çək", icon: <BorderOutlined />, action: props.onDraw, active: props.tool === "draw" },
    { title: "Vertex redaktə et", icon: <EditOutlined />, action: props.onEdit },
    { title: "Daşı", icon: <DragOutlined />, action: props.onDrag },
    { title: "Birləşdir", icon: <MergeCellsOutlined />, action: props.onMerge },
    { title: "Kəs", icon: <ScissorOutlined />, action: props.onCut, active: props.tool === "cut" },
    { title: "Rəngi dəyiş", icon: <BgColorsOutlined />, action: props.onColor },
    { title: "Sil", icon: <DeleteOutlined />, action: props.onDelete, danger: true },
    { title: "Seçilənə yaxınlaş", icon: <FullscreenOutlined />, action: props.onZoom },
    { title: "Yadda saxla", icon: <SaveOutlined />, action: props.onSave, active: true, loading: props.isSaving }
  ];

  return (
    <div className="map-top-toolbar">
      {buttons.map((button) => (
        <Tooltip key={button.title} title={button.title} placement="right">
          <Button
            icon={button.icon}
            shape="circle"
            type={button.active ? "primary" : "default"}
            danger={button.danger}
            loading={button.loading}
            onClick={button.action}
          />
        </Tooltip>
      ))}
    </div>
  );
}
