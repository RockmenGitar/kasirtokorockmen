import CustomersSection from '../../sections/customers/CustomersSection';

interface CustomersProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
}

export default function Customers({ storeId, refreshTrigger, triggerRefresh }: CustomersProps) {
  return <CustomersSection storeId={storeId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />;
}
