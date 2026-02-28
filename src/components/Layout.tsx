import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookMarked, Menu, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getSupabase } from '../supabase/client';

function isStrongEnoughPassword(password: string): boolean {
  return /^(?=.{6,})(?=.*(\d|[^A-Za-z0-9])).*$/.test(password);
}

export default function Layout() {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [nameInput, setNameInput] = useState((user?.user_metadata?.full_name as string | undefined) ?? '');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirmInput, setPasswordConfirmInput] = useState('');
  const [nameStatus, setNameStatus] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? 'Me';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;
  const closeMobileNav = () => setMobileNavOpen(false);

  const openSettings = () => {
    setShowSettings(true);
    setNameInput((user?.user_metadata?.full_name as string | undefined) ?? '');
    setNameStatus('');
    setPasswordStatus('');
    setPasswordInput('');
    setPasswordConfirmInput('');
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameStatus('');
    const nextName = nameInput.trim();
    if (!nextName) {
      setNameStatus('Please enter a valid name.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setNameStatus('Supabase is not configured.');
      return;
    }
    setNameSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: nextName } });
      if (error) {
        setNameStatus(error.message);
        return;
      }
      setNameStatus('Name updated.');
    } finally {
      setNameSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus('');
    if (passwordInput !== passwordConfirmInput) {
      setPasswordStatus('Passwords do not match.');
      return;
    }
    if (!isStrongEnoughPassword(passwordInput)) {
      setPasswordStatus('Password must be at least 6 characters and include a number or symbol.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setPasswordStatus('Supabase is not configured.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordInput });
      if (error) {
        setPasswordStatus(error.message);
        return;
      }
      setPasswordStatus('Password updated.');
      setPasswordInput('');
      setPasswordConfirmInput('');
    } finally {
      setPasswordSaving(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="px-5 pt-6 pb-4 border-b-2 border-ink/20">
        <h1 className="text-2xl font-black tracking-tight">
          <span className="text-ink">me</span>
          <span className="text-pink">Likes</span>
          <span className="text-ink">It</span>
        </h1>
        <p className="text-xs text-ink/60 mt-0.5 font-medium">your finds, your people</p>
      </div>

      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => {
            openSettings();
            closeMobileNav();
          }}
          className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 border-2 border-ink bg-white hover:bg-white/70 transition-colors"
          title="Open user settings"
          aria-label="Open user settings"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border-2 border-ink" />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-ink bg-white grid place-items-center text-xs font-black text-ink">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-bold text-ink truncate">{displayName}</p>
            <p className="text-[10px] text-ink/60 font-medium">User settings</p>
          </div>
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 pt-2">
        <NavLink
          to="/"
          end
          onClick={closeMobileNav}
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

      <div className="flex-1" />

      <div className="mx-3 mb-3 p-3 bg-white border-2 border-ink rounded-lg shadow-retro">
        <p className="text-xs font-black text-ink uppercase tracking-wide mb-1">🚫 House Rules</p>
        <p className="text-xs text-ink/70 leading-snug font-medium">
          No memes. No WhatsApp forwards. No Insta reposts.{' '}
          <span className="text-pink font-black">We will judge you.</span>
        </p>
      </div>

      <div className="px-5 pb-5 border-t-2 border-ink/20 pt-3 space-y-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-pink border-2 border-ink" />
          <div className="w-3 h-3 rounded-full bg-cyan border-2 border-ink" />
          <div className="w-3 h-3 rounded-full bg-ink" />
        </div>
        <button
          onClick={() => getSupabase()?.auth.signOut()}
          className="w-full px-2 py-1.5 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 border-b-2 border-ink bg-yellow px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-black tracking-tight">
          <span className="text-ink">me</span>
          <span className="text-pink">Likes</span>
          <span className="text-ink">It</span>
        </h1>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 rounded-lg border-2 border-ink bg-white text-ink"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
      </header>

      <aside className="hidden md:flex w-60 shrink-0 fixed top-0 left-0 h-screen border-r-2 border-ink bg-yellow flex-col z-40">
        {sidebarContent}
      </aside>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/50" onClick={closeMobileNav} />
          <aside className="relative w-64 h-full border-r-2 border-ink bg-yellow flex flex-col">
            <div className="absolute top-3 right-3">
              <button
                onClick={closeMobileNav}
                className="p-1.5 rounded-lg border-2 border-ink bg-white text-ink"
                aria-label="Close menu"
              >
                <X size={14} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-yellow border-b-2 border-ink flex items-center justify-between">
              <h2 className="text-sm font-black text-ink uppercase tracking-wide">User Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="px-2 py-1 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-6">
              <form onSubmit={saveName} className="space-y-2">
                <label className="text-xs font-black text-ink uppercase tracking-wider">Edit name</label>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                  placeholder="Your name"
                />
                <button
                  disabled={nameSaving}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-ink bg-pink text-ink text-sm font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {nameSaving ? 'Saving...' : 'Save name'}
                </button>
                {nameStatus && <p className="text-xs font-medium text-ink/70">{nameStatus}</p>}
              </form>

              <form onSubmit={savePassword} className="space-y-2">
                <label className="text-xs font-black text-ink uppercase tracking-wider">Change password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={passwordConfirmInput}
                  onChange={(e) => setPasswordConfirmInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                  placeholder="Confirm new password"
                />
                <p className="text-[11px] text-ink/60 font-medium">
                  Password must be at least 6 characters and include a number or symbol.
                </p>
                <button
                  disabled={passwordSaving}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-ink bg-cyan text-ink text-sm font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {passwordSaving ? 'Saving...' : 'Save password'}
                </button>
                {passwordStatus && <p className="text-xs font-medium text-ink/70">{passwordStatus}</p>}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="ml-0 md:ml-60 flex-1 min-w-0 pt-20 md:pt-0 p-4 sm:p-6 xl:p-8">
        <Outlet />
      </main>
    </div>
  );
}
