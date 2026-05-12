import { Tooltip } from "antd";

type Props = {
  parcelCount: number;
  selectedParcelCount: number;
  buildingCount: number;
  objectCount: number;
  roadCount: number;
};

export default function MapSummary({ parcelCount, selectedParcelCount, buildingCount, objectCount, roadCount }: Props) {
  return (
    <div className="map-summary-cards">
      <Tooltip title="Poliqon sayı"><div className="summary-pill"><span>Poliqon</span><b>{parcelCount}</b></div></Tooltip>
      <Tooltip title="Seçilmiş kadastr sahəsi"><div className="summary-pill"><span>Seçilmiş</span><b>{selectedParcelCount}</b></div></Tooltip>
      <Tooltip title="Tapılan bina"><div className="summary-pill"><span>Bina</span><b>{buildingCount}</b></div></Tooltip>
      <Tooltip title="Tapılan obyekt"><div className="summary-pill"><span>Obyekt</span><b>{objectCount}</b></div></Tooltip>
      <Tooltip title="Tapılan yol"><div className="summary-pill"><span>Yol</span><b>{roadCount}</b></div></Tooltip>
    </div>
  );
}
