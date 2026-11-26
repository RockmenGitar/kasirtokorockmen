import InventorySection from '../../sections/inventory/InventorySection';
import type { UserProfile } from '../../lib/db';

interface InventoryProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

export default function Inventory({ storeId, refreshTrigger, triggerRefresh, currentUser }: InventoryProps) {
  return (
    <InventorySection
      storeId={storeId}
      refreshTrigger={refreshTrigger}
      triggerRefresh={triggerRefresh}
      currentUser={currentUser}
    />
  );
}
