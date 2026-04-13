import { SpotlightFormClient } from '@/components/admin/content-calendar/SpotlightFormClient';

export default async function EditSpotlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SpotlightFormClient spotlightId={id} />;
}
