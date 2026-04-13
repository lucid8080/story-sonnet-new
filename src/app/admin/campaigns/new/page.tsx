import { CampaignEditor } from '@/components/admin/campaigns/CampaignEditor';

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const t =
    sp.type === 'trial_offer' || sp.type === 'promo_code' ? sp.type : 'notification_bar';
  return <CampaignEditor mode="create" campaignType={t} />;
}
