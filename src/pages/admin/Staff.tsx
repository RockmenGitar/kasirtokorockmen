import StaffSection from '../../sections/staff/StaffSection';
import type { Store } from '../../lib/db';

interface StaffProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  allStores?: Store[];
}

export default function Staff({ storeId, refreshTrigger, triggerRefresh, allStores = [] }: StaffProps) {
  return (
    <StaffSection 
      storeId={storeId} 
      refreshTrigger={refreshTrigger}
      triggerRefresh={triggerRefresh}
      allStores={allStores}
    />
  );
}
