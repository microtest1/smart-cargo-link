import { WarehouseFinder } from "./WarehouseFinder";
import { useAuth } from "@/hooks/useAuth";
import { useDeliveryLocations } from "@/hooks/useDeliveryLocations";

interface ChinaWarehouseInfoProps {
  userCode?: string;
  userName?: string;
  userPhone?: string;
  ghanaLocation?: string;
  compact?: boolean;
}

export function ChinaWarehouseInfo({
  userCode,
  userName,
  userPhone,
  ghanaLocation,
  compact = false,
}: ChinaWarehouseInfoProps) {
  const { user, profile } = useAuth();
  const { locations } = useDeliveryLocations();
  const defaultLocation = locations.find((location) => location.is_default) || locations[0];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">China Warehouse Address</h2>
      <WarehouseFinder
        shippingMark={userCode || profile?.unique_code || undefined}
        customerName={userName || profile?.full_name || undefined}
        customerPhone={userPhone || profile?.phone || undefined}
        ghanaLocation={ghanaLocation || defaultLocation?.address || undefined}
        signedIn={Boolean(user)}
        compact={compact}
      />
    </div>
  );
}
