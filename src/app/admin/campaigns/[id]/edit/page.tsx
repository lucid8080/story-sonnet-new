import { CampaignEditor } from '@/components/admin/campaigns/CampaignEditor';

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignEditor mode="edit" campaignId={id} />;
}

