import CustomersSection from '../../sections/customers/CustomersSection';
import type { UserProfile } from '../../lib/db';

interface CustomersProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

export default function Customers({ storeId, refreshTrigger, triggerRefresh, currentUser }: CustomersProps) {
  return <CustomersSection storeId={storeId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} currentUser={currentUser} />;
}
