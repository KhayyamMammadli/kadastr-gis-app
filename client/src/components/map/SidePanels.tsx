import { Badge, Button, Divider, Empty, Space, Table, Typography } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

const { Title } = Typography;

type Props = {
  parcelRows: any[];
  objectRows: any[];
  parcelsOpen: boolean;
  areaObjectsOpen: boolean;
  onToggleParcels: () => void;
  onToggleObjects: () => void;
  onZoom: (feature: any) => void;
};

export default function SidePanels({
  parcelRows,
  objectRows,
  parcelsOpen,
  areaObjectsOpen,
  onToggleParcels,
  onToggleObjects,
  onZoom
}: Props) {
  const hasParcels = parcelRows.length > 0;
  const hasObjects = objectRows.length > 0;

  return (
    <div className="right-panel">
      <div className={`side-section ${hasParcels && parcelsOpen ? "is-open" : "is-closed"}`}>
        <div className="side-section-head">
          <Title level={5}>Seçilmiş kadastr sahələri</Title>
          <Space size={8}>
            <Badge count={parcelRows.length} showZero color={hasParcels ? "#1677ff" : "#94a3b8"} />
            <Button size="small" shape="circle" icon={parcelsOpen ? <UpOutlined /> : <DownOutlined />} onClick={onToggleParcels} disabled={!hasParcels} />
          </Space>
        </div>

        <div className="side-section-body">
          {hasParcels ? (
            <Table
              size="small"
              pagination={{ pageSize: 4 }}
              dataSource={parcelRows}
              columns={[
                { title: "ID", dataIndex: "id" },
                { title: "Sahə", dataIndex: "area", render: (value: number) => `${value} m²` },
                { title: "Status", dataIndex: "status" },
                {
                  title: "Birləşmə məlumatı",
                  dataIndex: "mergeInfo",
                  render: (_: string, row: any) => row.mergeInfo ? (
                    <div className="merge-info-cell">
                      <b>{row.mergeInfo}</b>
                      {row.mergedItems && <span>İçindəkilər: {row.mergedItems}</span>}
                      {row.mergedAt && <small>{row.mergedAt}</small>}
                    </div>
                  ) : "-"
                },
                { title: "", render: (_: any, row: any) => <Button size="small" onClick={() => onZoom(row.feature)}>Zoom</Button> }
              ]}
            />
          ) : (
            <div className="collapsed-empty small"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Seçilmiş kadastr sahəsi yoxdur" /></div>
          )}
        </div>
      </div>

      <Divider />

      <div className={`side-section ${hasObjects && areaObjectsOpen ? "is-open" : "is-closed"}`}>
        <div className="side-section-head">
          <Title level={5}>Sahə daxilində tapılan bina/obyektlər</Title>
          <Space size={8}>
            <Badge count={objectRows.length} showZero color={hasObjects ? "#52c41a" : "#94a3b8"} />
            <Button size="small" shape="circle" icon={areaObjectsOpen ? <UpOutlined /> : <DownOutlined />} onClick={onToggleObjects} disabled={!hasObjects} />
          </Space>
        </div>

        <div className="side-section-body">
          {hasObjects ? (
            <Table
              size="small"
              pagination={{ pageSize: 6 }}
              dataSource={objectRows}
              columns={[
                { title: "ID", dataIndex: "id" },
                { title: "Ad", dataIndex: "name" },
                { title: "Tip", dataIndex: "category" },
                { title: "Status", dataIndex: "status" }
              ]}
            />
          ) : (
            <div className="collapsed-empty small"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sahə daxilində bina/obyekt yoxdur" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
