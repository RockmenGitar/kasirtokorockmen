import ExpensesSection from '../../sections/expenses/ExpensesSection';
import type { UserProfile } from '../../lib/db';

interface ExpensesProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

export default function Expenses({ storeId, refreshTrigger, triggerRefresh, currentUser }: ExpensesProps) {
  return (
    <ExpensesSection
      storeId={storeId}
      refreshTrigger={refreshTrigger}
      triggerRefresh={triggerRefresh}
      currentUser={currentUser}
    />
  );
}
