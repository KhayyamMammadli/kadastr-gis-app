import { Button, Modal, Space } from "antd";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (color: string) => void;
};

const colors = ["#1677ff", "#52c41a", "#fa8c16", "#eb2f96", "#722ed1", "#13c2c2"];

export default function ColorModal({ open, onClose, onSelect }: Props) {
  return (
    <Modal title="Seçilmiş poliqonların rəngini dəyiş" open={open} footer={null} onCancel={onClose}>
      <Space wrap>
        {colors.map((color) => (
          <Button key={color} style={{ background: color, width: 54, height: 38 }} onClick={() => onSelect(color)} />
        ))}
      </Space>
    </Modal>
  );
}
