import { NavLink, Outlet } from 'react-router-dom';
import { BookMarked } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabase/client';

export default function Layout() {
  const { user } = useAuth();

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Me';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 fixed top-0 left-0 h-screen border-r-2 border-ink bg-yellow flex flex-col z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b-2 border-ink/20">
          <h1 className="text-2xl font-black text-ink tracking-tight">melikesit</h1>
          <p className="text-xs text-ink/60 mt-0.5 font-medium">your finds, your people</p>
        </div>

        {/* Nav — sits a bit lower than the logo */}
        <nav className="flex flex-col gap-0.5 px-3 pt-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all border-2 ${
                isActive
                  ? 'bg-pink border-ink text-ink shadow-retro'
                  : 'border-transparent text-ink hover:border-ink hover:bg-white/50'
              }`
            }
          >
            <BookMarked size={16} />
            My Finds
          </NavLink>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meme Disclaimer */}
        <div className="mx-3 mb-3 p-3 bg-white border-2 border-ink rounded-lg shadow-retro">
          <p className="text-xs font-black text-ink uppercase tracking-wide mb-1">🚫 House Rules</p>
          <p className="text-xs text-ink/70 leading-snug font-medium">
            No memes. No WhatsApp forwards. No Insta reposts.{' '}
            <span className="text-pink font-black">We will judge you.</span>
          </p>
        </div>

        {/* Decorative dots + Profile */}
        <div className="px-5 pb-5 border-t-2 border-ink/20 pt-3 space-y-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-pink border-2 border-ink" />
            <div className="w-3 h-3 rounded-full bg-cyan border-2 border-ink" />
            <div className="w-3 h-3 rounded-full bg-ink" />
          </div>
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border-2 border-ink" />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-ink bg-white grid place-items-center text-xs font-black text-ink">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink truncate">{displayName}</p>
              <p className="text-xs text-ink/60 truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-2 py-1 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-w-0 p-6 xl:p-8">
        <Outlet />
      </main>
    </div>
  );
}
