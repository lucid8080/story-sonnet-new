import { CustomerDetailClient } from '@/components/admin/customers/CustomerDetailClient';

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  return <CustomerDetailClient customerId={customerId} />;
}
