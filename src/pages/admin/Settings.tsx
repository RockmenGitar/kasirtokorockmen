import SettingsSection from '../../sections/settings/SettingsSection';

interface SettingsProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
}

export default function Settings({ storeId, refreshTrigger, triggerRefresh }: SettingsProps) {
  return <SettingsSection storeId={storeId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />;
}
