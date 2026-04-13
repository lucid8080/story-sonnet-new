import { CampaignsSubNav } from '@/components/admin/campaigns/CampaignsSubNav';

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">Campaigns & Offers</h1>
      <p className="mt-1 text-sm text-slate-500">
        Story Sonnet marketing: bars, trials, promo codes, and lightweight analytics.
      </p>
      <CampaignsSubNav />
      {children}
    </div>
  );
}
