import { Badge, Button, Empty, Space, Table, Typography } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

const { Text } = Typography;

type Props = {
  rows: any[];
  open: boolean;
  onToggle: () => void;
  onZoom: (feature: any) => void;
};

export default function SelectedObjectsPanel({ rows, open, onToggle, onZoom }: Props) {
  const hasData = rows.length > 0;

  return (
    <div className={`floating smart-panel ${hasData && open ? "is-open" : "is-closed"}`}>
      <div className="smart-panel-head">
        <Text strong>Seçilmiş obyektlər</Text>
        <Space size={8}>
          <Badge count={rows.length} showZero color={hasData ? "#1677ff" : "#94a3b8"} />
          <Button size="small" shape="circle" icon={open ? <UpOutlined /> : <DownOutlined />} onClick={onToggle} disabled={!hasData} />
        </Space>
      </div>

      <div className="smart-panel-body">
        {hasData ? (
          <Table
            size="small"
            pagination={{ pageSize: 5 }}
            dataSource={rows}
            columns={[
              { title: "ID", dataIndex: "id" },
              { title: "Ad", dataIndex: "name" },
              { title: "Kateqoriya", dataIndex: "category" },
              { title: "Mərtəbə", dataIndex: "floors" },
              { title: "Mənzil", dataIndex: "apartments" },
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
          <div className="collapsed-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Seçilmiş obyekt yoxdur" /></div>
        )}
      </div>
    </div>
  );
}
