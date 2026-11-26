import ReportsSection from '../../sections/reports/ReportsSection';

interface ReportsProps {
  storeId: number;
  refreshTrigger: number;
}

export default function Reports({ storeId, refreshTrigger }: ReportsProps) {
  return <ReportsSection storeId={storeId} refreshTrigger={refreshTrigger} />;
}
