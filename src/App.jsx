import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { MoonStar, Clock3, ArrowRight } from 'lucide-react';
import Story from './pages/Story';
import { fetchStories } from './lib/api/stories.js';
import { AuthProvider } from './context/AuthContext.jsx';
import SiteHeader from './components/layout/SiteHeader.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Account from './pages/Account.jsx';
import Pricing from './pages/Pricing.jsx';
import BillingSuccess from './pages/BillingSuccess.jsx';
import BillingCancel from './pages/BillingCancel.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUploads from './pages/admin/AdminUploads.jsx';
import AdminStories from './pages/admin/AdminStories.jsx';
import AdminStoryDetail from './pages/admin/AdminStoryDetail.jsx';

function Home() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchStories();
        if (!ignore) setStories(data);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-sky-50 text-slate-800">
      <main className="mx-auto max-w-6xl px-3 pb-16 pt-8 sm:px-4 lg:px-4">
        <div className="mb-8 grid gap-8 lg:grid-cols-1 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-rose-500 shadow-sm ring-1 ring-rose-100">
              <MoonStar className="h-4 w-4" /> Organized for easy story browsing and listening
            </div>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
              Tiny adventures, big imagination.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Browse stories by cover tile, open a story page, and listen through its episodes. Each story includes an age group so filtering can be added cleanly later.
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Story Library</h2>
            <p className="text-slate-500">
              Click a tile to open the story and start listening.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm font-medium text-slate-500">
            Loading stories…
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stories.map((story) => (
            <Link
              key={story.slug}
              to={`/story/${story.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/70 ring-1 ring-slate-100 transition duration-300 hover:shadow-2xl"
            >
              <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl" style={{ backgroundColor: story.accent }}>
                <img
                  src={story.cover}
                  alt={`${story.title} cover art`}
                  className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-100 shadow-sm backdrop-blur opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {story.episodes.length}{' '}
                    {story.episodes.length === 1 ? 'episode' : 'episodes'}
                  </div>
                </div>
              </div>
            </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-sky-50 text-slate-800">
          <SiteHeader />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/story/:slug" element={<Story />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/account" element={<Account />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing/cancel" element={<BillingCancel />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/stories" element={<AdminStories />} />
            <Route path="/admin/stories/:slug" element={<AdminStoryDetail />} />
            <Route path="/admin/uploads" element={<AdminUploads />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
