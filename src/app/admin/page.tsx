import prisma from '@/lib/prisma';

export default async function AdminDashboardPage() {
  let stories = 0;
  let episodes = 0;
  let users = 0;
  let activeSubscribers = 0;
  let uploads = 0;

  if (process.env.DATABASE_URL) {
    try {
      const [s, e, profiles, u] = await Promise.all([
        prisma.story.count(),
        prisma.episode.count(),
        prisma.profile.findMany({
          select: { subscriptionStatus: true },
        }),
        prisma.upload.count(),
      ]);
      stories = s;
      episodes = e;
      users = profiles.length;
      activeSubscribers = profiles.filter(
        (p) => p.subscriptionStatus === 'active'
      ).length;
      uploads = u;
    } catch (e) {
      console.warn('[admin dashboard] DB stats failed', e);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">Admin</h1>
      <p className="mt-1 text-sm text-slate-500">
        Overview (requires database connection for live counts).
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Stories" value={stories} />
        <Stat label="Episodes" value={episodes} />
        <Stat label="Profiles" value={users} />
        <Stat label="Active subscribers" value={activeSubscribers} />
        <Stat label="Uploads" value={uploads} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}
