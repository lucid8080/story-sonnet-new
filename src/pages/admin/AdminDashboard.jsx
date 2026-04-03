import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import AdminStatsCard from '../../components/admin/AdminStatsCard.jsx';
import AdminRoute from '../../components/auth/AdminRoute.jsx';
import { supabase } from '../../lib/supabaseClient.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    stories: 0,
    episodes: 0,
    users: 0,
    activeSubscribers: 0,
    uploads: 0,
  });

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [stories, episodes, profiles, uploads] = await Promise.all([
        supabase.from('stories').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id,subscription_status', { count: 'exact' }),
        supabase.from('uploads').select('id', { count: 'exact', head: true }),
      ]);

      const activeSubscribers =
        profiles.data?.filter((p) => p.subscription_status === 'active').length || 0;

      setStats({
        stories: stories.count || 0,
        episodes: episodes.count || 0,
        users: profiles.count || 0,
        activeSubscribers,
        uploads: uploads.count || 0,
      });
    }
    load();
  }, []);

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatsCard label="Stories" value={stats.stories} hint="Total story series" />
          <AdminStatsCard label="Episodes" value={stats.episodes} hint="All episodes" />
          <AdminStatsCard
            label="Active subscribers"
            value={stats.activeSubscribers}
            hint="Profiles with active subscription"
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AdminStatsCard label="Users" value={stats.users} />
          <AdminStatsCard label="Uploads" value={stats.uploads} />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}

