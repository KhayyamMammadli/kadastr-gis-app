import { Button, Space, Tag } from "antd";

type Props = {
  onLogout: () => void;
  isLogoutLoading?: boolean;
};

export default function AppHeader({ onLogout, isLogoutLoading }: Props) {
  return (
    <div className="app-header">
      <div className="brand">
        <div className="emblem">DR</div>
        <div className="brand-text">
          <div className="sup">Azərbaycan Respublikası</div>
          <div className="title">Daşınmaz Əmlakın Dövlət Kadastrı və Reyestri</div>
        </div>
      </div>

      <Space>
        <Tag color="blue">Demo GIS</Tag>
        <Button danger onClick={onLogout} loading={isLogoutLoading}>Çıxış</Button>
      </Space>
    </div>
  );
}
