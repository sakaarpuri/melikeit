import { useEffect, useState } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { BookMarked, Menu, UserPlus, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getSupabase } from '../supabase/client';
import type { Section } from '../data/mockData';

function isStrongEnoughPassword(password: string): boolean {
  return /^(?=.{6,})(?=.*(\d|[^A-Za-z0-9])).*$/.test(password);
}

type ThemeMode = 'default' | 'plain' | 'stealth';

export default function Layout() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const raw = window.localStorage.getItem('melikeit.theme');
    if (raw === 'plain' || raw === 'stealth' || raw === 'default') return raw;
    return 'default';
  });
  const [friends, setFriends] = useState<Array<{ id: string; fullName: string; avatarUrl?: string }>>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'sections' | 'friends'>('sections');
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsStatus, setFriendsStatus] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCreating, setInviteCreating] = useState(false);
  const [connectInput, setConnectInput] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [invitePrompt, setInvitePrompt] = useState<{ token: string; fromName: string; fromAvatarUrl?: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteStatus, setInviteStatus] = useState('');
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
  const selectedFriendId = searchParams.get('view') === 'friends' ? searchParams.get('friend') : null;
  const selectedSectionId = searchParams.get('section');
  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    if (themeMode === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
    window.localStorage.setItem('melikeit.theme', themeMode);
  }, [themeMode]);

  const clearInviteParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('friendInvite');
    setSearchParams(next, { replace: true });
  };

  const loadFriends = async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setFriendsLoading(true);
    setFriendsStatus('');
    const { data: friendshipRows, error: friendshipError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);
    if (friendshipError) {
      setFriendsLoading(false);
      setFriendsStatus(friendshipError.message);
      return;
    }

    const friendIds = (friendshipRows ?? [])
      .map((row) => row.friend_id as string)
      .filter(Boolean);
    if (friendIds.length === 0) {
      setFriends([]);
      setFriendsLoading(false);
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id,full_name,avatar_url')
      .in('id', friendIds);
    if (profileError) {
      setFriendsLoading(false);
      setFriendsStatus(profileError.message);
      return;
    }

    const rowsById = new Map(
      (profileRows ?? []).map((row) => [
        row.id as string,
        {
          id: row.id as string,
          fullName: ((row.full_name as string | undefined)?.trim() || 'Friend'),
          avatarUrl: (row.avatar_url as string | null) ?? undefined,
        },
      ])
    );
    setFriends(friendIds.map((id) => rowsById.get(id) ?? { id, fullName: 'Friend' }));
    setFriendsLoading(false);
  };

  const loadSections = async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setSectionsLoading(true);
    const { data, error } = await supabase
      .from('sections')
      .select('id,user_id,name,visibility')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error) {
      setSections(
        ((data ?? []) as Array<{ id: string; user_id: string; name: string; visibility: string | null }>)
          .map((row) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            visibility: row.visibility === 'specific_friends' ? 'specific_friends' : 'all_friends',
          }))
      );
    }
    setSectionsLoading(false);
  };

  useEffect(() => {
    void loadFriends();
    void loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const onSectionsChanged = () => {
      void loadSections();
    };
    window.addEventListener('melikeit:sections-changed', onSectionsChanged as EventListener);
    return () => window.removeEventListener('melikeit:sections-changed', onSectionsChanged as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const token = searchParams.get('friendInvite');
    if (!user || !token) return;
    const supabase = getSupabase();
    if (!supabase) return;

    let active = true;
    void (async () => {
      const { data, error } = await supabase.rpc('preview_friend_invite', { p_token: token });
      if (!active) return;

      if (error || !Array.isArray(data) || data.length === 0) {
        setInviteStatus(error?.message ?? 'Invite is invalid or expired.');
        clearInviteParam();
        return;
      }

      const row = data[0] as { from_user_id: string; from_name: string; from_avatar_url?: string | null };
      if (row.from_user_id === user.id) {
        setInviteStatus('This invite belongs to your account.');
        clearInviteParam();
        return;
      }

      setInvitePrompt({
        token,
        fromName: row.from_name || 'A friend',
        fromAvatarUrl: row.from_avatar_url ?? undefined,
      });
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, searchParams.toString()]);

  const createInviteLink = async () => {
    if (!user || inviteCreating) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setInviteCreating(true);
    setFriendsStatus('');
    setInviteLink('');
    const { data, error } = await supabase
      .from('friend_invites')
      .insert({
        from_user_id: user.id,
        from_name: displayName,
        from_avatar_url: avatarUrl ?? null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single();
    setInviteCreating(false);

    if (error || !data?.token) {
      setFriendsStatus(error?.message ?? 'Could not create invite link.');
      return;
    }

    const nextInviteLink = `${window.location.origin}/?friendInvite=${encodeURIComponent(data.token as string)}`;
    setInviteLink(nextInviteLink);
    try {
      await navigator.clipboard.writeText(nextInviteLink);
      setFriendsStatus('Invite link copied.');
    } catch {
      setFriendsStatus('Invite link created. Use Copy.');
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setFriendsStatus('Invite link copied.');
    } catch {
      setFriendsStatus('Could not copy link automatically.');
    }
  };

  const extractInviteToken = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      const parsed = new URL(trimmed);
      const paramToken = parsed.searchParams.get('friendInvite')?.trim();
      if (paramToken) return paramToken;
    } catch {
      const match = trimmed.match(/[?&]friendInvite=([^&\s]+)/i);
      if (match?.[1]) return decodeURIComponent(match[1]).trim();
    }
    return trimmed;
  };

  const connectWithCode = async () => {
    const token = extractInviteToken(connectInput);
    if (!token || connectBusy) {
      if (!token) setFriendsStatus('Paste an invite link or code.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;

    setConnectBusy(true);
    setFriendsStatus('');
    const { error } = await supabase.rpc('accept_friend_invite', { p_token: token });
    setConnectBusy(false);
    if (error) {
      setFriendsStatus(error.message);
      return;
    }

    setConnectInput('');
    setFriendsStatus('Friend connected.');
    void loadFriends();
  };

  const openFriendFinds = (friendId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', 'friends');
    next.set('friend', friendId);
    next.delete('section');
    next.delete('friendInvite');
    setSearchParams(next);
    setShowFriends(false);
    closeMobileNav();
  };

  const openMyFinds = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    next.delete('friend');
    next.delete('friendInvite');
    next.delete('section');
    setSearchParams(next);
    setShowFriends(false);
    closeMobileNav();
  };

  const openSection = (sectionId?: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    next.delete('friend');
    next.delete('friendInvite');
    if (sectionId) next.set('section', sectionId);
    else next.delete('section');
    setSearchParams(next);
    setShowFriends(false);
    closeMobileNav();
  };

  const acceptInvite = async () => {
    if (!invitePrompt || inviteBusy) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setInviteBusy(true);
    setInviteStatus('');
    const { error } = await supabase.rpc('accept_friend_invite', { p_token: invitePrompt.token });
    setInviteBusy(false);

    if (error) {
      setInviteStatus(error.message);
      return;
    }

    setInvitePrompt(null);
    clearInviteParam();
    setInviteStatus('Friend connected.');
    void loadFriends();
  };

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
        <p className="text-xs text-ink/60 mt-0.5 font-medium">place for all your 'finds'</p>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 pt-4">
        <NavLink
          to="/"
          end
          onClick={(event) => {
            event.preventDefault();
            openMyFinds();
          }}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all border-2 ${
              isActive && !selectedSectionId && !selectedFriendId
                ? 'bg-yellow/55 border-ink text-ink shadow-retro'
                : 'border-transparent text-ink hover:border-ink hover:bg-white/50'
            }`
          }
        >
          <BookMarked size={16} />
          My Finds
        </NavLink>
      </nav>

      <div className="px-3 mt-4">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setSidebarTab('sections')}
            className={`px-2 py-1.5 rounded-lg border-2 text-xs font-black uppercase tracking-wide ${
              sidebarTab === 'sections' ? 'bg-ink text-white border-ink' : 'retro-surface-muted text-ink border-ink'
            }`}
          >
            Sections
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('friends')}
            className={`px-2 py-1.5 rounded-lg border-2 text-xs font-black uppercase tracking-wide ${
              sidebarTab === 'friends' ? 'bg-ink text-white border-ink' : 'retro-surface-muted text-ink border-ink'
            }`}
          >
            Friends
          </button>
        </div>
      </div>

      {sidebarTab === 'sections' ? (
        <div className="px-3 mt-3 space-y-1 overflow-y-auto max-h-[38vh]">
          <button
            type="button"
            onClick={() => openSection(undefined)}
            className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm font-black transition-all ${
              !selectedSectionId && !selectedFriendId
                ? 'bg-ink text-white border-ink'
                : 'retro-surface-muted text-ink border-ink hover:bg-white/80'
            }`}
          >
            All Finds
          </button>
          {sectionsLoading && <p className="text-[11px] font-semibold text-ink/60 px-1 py-1">Loading sections…</p>}
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => openSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm font-black transition-all truncate ${
                selectedSectionId === section.id
                  ? 'bg-pink text-ink border-ink shadow-retro'
                  : 'retro-surface-muted text-ink border-ink hover:bg-white/80'
              }`}
              title={section.name}
            >
              {section.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 mt-3 space-y-2 overflow-y-auto max-h-[38vh]">
          <button
            type="button"
            onClick={() => {
              setShowFriends(true);
              closeMobileNav();
            }}
            className="w-full px-3 py-2 rounded-lg border-2 border-ink bg-pink text-ink text-xs font-black shadow-retro"
          >
            Manage friends
          </button>
          {friendsLoading && <p className="text-[11px] font-semibold text-ink/60 px-1">Loading friends…</p>}
          {!friendsLoading && friends.length === 0 && (
            <p className="text-[11px] font-semibold text-ink/60 px-1">No friends connected yet.</p>
          )}
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => openFriendFinds(friend.id)}
              className={`w-full flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-left transition-all ${
                selectedFriendId === friend.id ? 'bg-cyan border-ink shadow-retro' : 'retro-surface-muted border-ink'
              }`}
            >
              {friend.avatarUrl ? (
                <img src={friend.avatarUrl} alt={friend.fullName} className="w-6 h-6 rounded-full border-2 border-ink" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-ink bg-white grid place-items-center text-[10px] font-black text-ink">
                  {friend.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-black text-ink truncate">{friend.fullName}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="mx-3 mb-3 p-3 rounded-lg retro-surface-muted">
        <p className="text-xs font-black text-ink uppercase tracking-wide mb-1">🚫 House Rules</p>
        <p className="text-xs text-ink/70 leading-snug font-medium">
          No memes. No WhatsApp forwards. No Insta reposts.{' '}
          <span className="text-pink font-black">We will judge you.</span>
        </p>
      </div>

      <div className="px-3 pb-3 border-t-2 border-ink/20 pt-2 space-y-2">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-pink border-2 border-ink" />
          <div className="w-3 h-3 rounded-full bg-cyan border-2 border-ink" />
          <div className="w-3 h-3 rounded-full bg-ink" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              openSettings();
              closeMobileNav();
            }}
            className="flex-1 min-w-0 flex items-center gap-2.5 rounded-lg px-2 py-2 retro-surface-muted hover:brightness-95 transition-all"
            title="Open user settings"
            aria-label="Open user settings"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border-2 border-ink" />
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-ink bg-white grid place-items-center text-xs font-black text-ink">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-ink truncate">{displayName}</p>
            </div>
          </button>
          <button
            onClick={() => getSupabase()?.auth.signOut()}
            className="px-3 py-2 rounded-lg border-2 border-ink retro-fill-soft text-xs font-black text-ink hover:bg-yellow transition-colors"
          >
            Sign out
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-ink/60 shrink-0">Mode</label>
          <select
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
            className="flex-1 px-2 py-1.5 rounded-lg border-2 border-ink retro-fill-soft text-[11px] font-black text-ink"
            aria-label="Theme mode"
          >
            <option value="default">Default</option>
            <option value="plain">Plain</option>
            <option value="stealth">Stealth</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 border-b-2 border-ink bg-yellow/70 backdrop-blur-[1px] px-4 py-3 flex items-center justify-between">
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

      <div className="md:p-8">
        <div className="y2k-surface md:rounded-3xl md:overflow-hidden md:flex md:h-[calc(100vh-4rem)] md:min-h-0">
          <div className="hidden md:flex w-full h-full gap-5 p-5">
            <aside className="w-56 lg:w-60 shrink-0">
              <div className="h-full retro-panel-yellow rounded-2xl overflow-hidden flex flex-col">
                {sidebarContent}
              </div>
            </aside>
            <main className="flex-1 min-w-0">
              <div className="h-full overflow-y-auto pr-2">
                <div className="pt-0 p-4 sm:p-5 xl:p-6">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>

          <div className="md:hidden">
            <div className="pt-20 p-4 sm:p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/50" onClick={closeMobileNav} />
          <aside className="relative w-64 h-full border-r-2 border-ink bg-yellow/70 backdrop-blur-[1px] flex flex-col">
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
          <div className="relative w-full max-w-md max-h-[90vh] bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-4 bg-yellow border-b-2 border-ink flex items-center justify-between">
              <h2 className="text-sm font-black text-ink uppercase tracking-wide">User Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="px-2 py-1 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-6 overflow-y-auto max-h-[calc(90vh-64px)]">
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

      {showFriends && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setShowFriends(false)} />
          <div className="relative w-full max-w-md max-h-[90vh] bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-4 bg-yellow border-b-2 border-ink flex items-center justify-between">
              <h2 className="text-sm font-black text-ink uppercase tracking-wide">Friends</h2>
              <button
                onClick={() => setShowFriends(false)}
                className="px-2 py-1 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[calc(90vh-64px)]">
              <div className="border-2 border-ink rounded-lg p-3 bg-white space-y-1">
                <p className="text-[11px] font-black text-ink uppercase tracking-wide">Invite options</p>
                <p className="text-[11px] font-medium text-ink/80">Invite link: send to someone new so they can join and connect.</p>
                <p className="text-[11px] font-medium text-ink/80">Invite code: use only for friends who already have an account.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void createInviteLink()}
                  disabled={inviteCreating}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-ink bg-pink text-ink text-xs font-black"
                >
                  <UserPlus size={14} />
                  {inviteCreating ? 'Creating...' : 'Create invite link'}
                </button>
                <button
                  onClick={openMyFinds}
                  className="px-3 py-2 rounded-lg border-2 border-ink bg-white text-ink text-xs font-black"
                >
                  My finds
                </button>
              </div>
              {friendsStatus && (
                <p className="text-xs font-bold text-ink/70 break-all">{friendsStatus}</p>
              )}
              {inviteLink && (
                <div className="flex gap-2">
                  <input
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-2 py-2 rounded-lg border-2 border-ink bg-white text-[11px] font-bold text-ink"
                  />
                  <button
                    onClick={() => void copyInviteLink()}
                    className="px-3 py-2 rounded-lg border-2 border-ink bg-cyan text-xs font-black text-ink"
                  >
                    Copy
                  </button>
                </div>
              )}
              <div className="border-2 border-ink rounded-lg p-3 bg-white space-y-2">
                <p className="text-[11px] font-black text-ink uppercase tracking-wide">Connect with code</p>
                <p className="text-[11px] font-medium text-ink/80">For existing members only.</p>
                <div className="flex gap-2">
                  <input
                    value={connectInput}
                    onChange={(event) => setConnectInput(event.target.value)}
                    placeholder="Paste invite link or code"
                    className="flex-1 px-2 py-2 rounded-lg border-2 border-ink bg-white text-[11px] font-bold text-ink"
                  />
                  <button
                    onClick={() => void connectWithCode()}
                    disabled={connectBusy}
                    className="px-3 py-2 rounded-lg border-2 border-ink bg-yellow text-xs font-black text-ink"
                  >
                    {connectBusy ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
              <div className="border-2 border-ink rounded-lg max-h-72 overflow-y-auto">
                {friendsLoading ? (
                  <p className="text-xs font-bold text-ink/70 p-3">Loading friends...</p>
                ) : friends.length === 0 ? (
                  <p className="text-xs font-bold text-ink/70 p-3">No friends yet. Share an invite link.</p>
                ) : (
                  friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => openFriendFinds(friend.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 border-b border-ink/15 last:border-b-0 text-left ${
                        selectedFriendId === friend.id ? 'bg-yellow' : 'bg-white hover:bg-cyan/25'
                      }`}
                    >
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt={friend.fullName} className="w-7 h-7 rounded-full border-2 border-ink" />
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-ink bg-white grid place-items-center text-xs font-black text-ink">
                          {friend.fullName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-bold text-ink truncate">{friend.fullName}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {invitePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => { setInvitePrompt(null); clearInviteParam(); }} />
          <div className="relative w-full max-w-sm max-h-[90vh] bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-yellow border-b-2 border-ink">
              <h2 className="text-sm font-black text-ink uppercase tracking-wide">Friend invite</h2>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-64px)]">
              <div className="flex items-center gap-3">
                {invitePrompt.fromAvatarUrl ? (
                  <img src={invitePrompt.fromAvatarUrl} alt={invitePrompt.fromName} className="w-10 h-10 rounded-full border-2 border-ink" />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-ink bg-white grid place-items-center text-sm font-black text-ink">
                    {invitePrompt.fromName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="text-sm font-bold text-ink">
                  {invitePrompt.fromName} wants to connect as a friend.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setInvitePrompt(null);
                    clearInviteParam();
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void acceptInvite()}
                  disabled={inviteBusy}
                  className="flex-1 px-3 py-2 rounded-lg border-2 border-ink bg-pink text-xs font-black text-ink"
                >
                  {inviteBusy ? 'Connecting...' : 'Accept'}
                </button>
              </div>
              {inviteStatus && <p className="text-xs font-bold text-ink/70">{inviteStatus}</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
