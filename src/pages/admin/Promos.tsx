import PromosSection from '../../sections/promos/PromosSection';

interface PromosProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
}

export default function Promos({ storeId, refreshTrigger, triggerRefresh }: PromosProps) {
  return <PromosSection storeId={storeId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />;
}
