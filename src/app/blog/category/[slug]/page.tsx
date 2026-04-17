import { redirect } from 'next/navigation';

export default async function BlogCategoryRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/blog?category=${encodeURIComponent(slug)}`);
}
