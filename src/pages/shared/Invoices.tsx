import InvoicesSection from '../../sections/invoices/InvoicesSection';
import type { UserProfile } from '../../lib/db';

interface InvoicesProps {
  storeId: number;
  refreshTrigger: number;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  triggerRefresh?: () => void;
}

export default function Invoices({ storeId, refreshTrigger, setActiveTab, currentUser, triggerRefresh }: InvoicesProps) {
  return (
    <InvoicesSection
      storeId={storeId}
      refreshTrigger={refreshTrigger}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      triggerRefresh={triggerRefresh}
    />
  );
}
