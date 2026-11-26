import ShiftsSection from '../../sections/shifts/ShiftsSection';
import type { UserProfile } from '../../lib/db';

interface ShiftsProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

export default function Shifts({ storeId, refreshTrigger, triggerRefresh, currentUser }: ShiftsProps) {
  return (
    <ShiftsSection
      storeId={storeId}
      refreshTrigger={refreshTrigger}
      triggerRefresh={triggerRefresh}
      currentUser={currentUser}
    />
  );
}
