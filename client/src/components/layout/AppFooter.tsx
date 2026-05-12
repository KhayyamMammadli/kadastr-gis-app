type Props = {
  coordinates: string;
  selectedParcelsCount: number;
  selectedObjectsCount: number;
};

export default function AppFooter({ coordinates, selectedParcelsCount, selectedObjectsCount }: Props) {
  return (
    <div className="app-footer">
      Koordinat: {coordinates} · Görünüş: WGS84 · Seçilmiş: {selectedParcelsCount} · Obyekt: {selectedObjectsCount}
    </div>
  );
}
