import { Suspense } from 'react';
import { CustomersAdminClient } from '@/components/admin/customers/CustomersAdminClient';

export default function AdminCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-100">
          Loading customers…
        </div>
      }
    >
      <CustomersAdminClient />
    </Suspense>
  );
}
