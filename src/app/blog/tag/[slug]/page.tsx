import { redirect } from 'next/navigation';

export default async function BlogTagRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/blog?tag=${encodeURIComponent(slug)}`);
}
