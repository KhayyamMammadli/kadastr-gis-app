import { Drawer } from "antd";
import { featureId } from "../../utils/featureUtils";

type Props = {
  feature: any;
  onClose: () => void;
};

export default function ObjectDetailsDrawer({ feature, onClose }: Props) {
  return (
    <Drawer open={Boolean(feature)} onClose={onClose} title="Obyekt məlumatları">
      {feature && (
        <div>
          <p><b>ID:</b> {featureId(feature)}</p>
          <p><b>Ad:</b> {feature.get("name")}</p>
          <p><b>Kateqoriya:</b> {feature.get("category")}</p>
          <p><b>Ünvan:</b> {feature.get("address")}</p>
          <p><b>Mərtəbə:</b> {feature.get("floors")}</p>
          <p><b>Mənzil sayı:</b> {feature.get("apartments")}</p>
          <p><b>Status:</b> {feature.get("status")}</p>
          {feature.get("mergedFrom") && (
            <div className="drawer-merge-card">
              <h4>Birləşmə məlumatı</h4>
              <p><b>Birləşən:</b> {feature.get("mergedFrom")}</p>
              <p><b>Əsas obyekt:</b> {feature.get("mergedTo")}</p>
              <p><b>Merge label:</b> {feature.get("mergeLabel")}</p>
              <p><b>İçində olanlar:</b> {feature.get("mergedItems")}</p>
              <p><b>Birləşmə sayı:</b> {feature.get("mergedCount")}</p>
              <p><b>Tarix:</b> {feature.get("mergedAt")}</p>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
