import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { BookMarked, Menu, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getSupabase } from '../supabase/client';

function isStrongEnoughPassword(password: string): boolean {
  return /^(?=.{6,})(?=.*(\d|[^A-Za-z0-9])).*$/.test(password);
}

export default function Layout() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: string; fullName: string; avatarUrl?: string }>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsStatus, setFriendsStatus] = useState('');
  const [inviteCreating, setInviteCreating] = useState(false);
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
  const selectedFriendName = useMemo(
    () => friends.find((friend) => friend.id === selectedFriendId)?.fullName ?? '',
    [friends, selectedFriendId]
  );
  const closeMobileNav = () => setMobileNavOpen(false);

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

  useEffect(() => {
    void loadFriends();
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

    const inviteLink = `${window.location.origin}/?friendInvite=${encodeURIComponent(data.token as string)}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setFriendsStatus('Invite link copied.');
    } catch {
      setFriendsStatus(inviteLink);
    }
  };

  const openFriendFinds = (friendId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', 'friends');
    next.set('friend', friendId);
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

      <nav className="flex flex-col gap-0.5 px-3 pt-14">
        <NavLink
          to="/"
          end
          onClick={(event) => {
            event.preventDefault();
            openMyFinds();
          }}
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
        <button
          onClick={() => {
            setShowFriends(true);
            closeMobileNav();
          }}
          className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 border-2 border-ink bg-white hover:bg-white/70 transition-colors"
          title="Open friends"
          aria-label="Open friends"
        >
          <Users size={16} />
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-bold text-ink truncate">Friends</p>
            <p className="text-[10px] text-ink/60 font-medium">
              {selectedFriendName ? `Viewing ${selectedFriendName}` : `${friends.length} connected`}
            </p>
          </div>
        </button>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-pink border-2 border-ink" />
          <div className="w-3 h-3 rounded-full bg-cyan border-2 border-ink" />
          <div className="w-3 h-3 rounded-full bg-ink" />
        </div>
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
        <button
          onClick={() => getSupabase()?.auth.signOut()}
          className="w-full -mt-2 relative z-10 px-2 py-1.5 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
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

      {showFriends && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setShowFriends(false)} />
          <div className="relative w-full max-w-md bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-yellow border-b-2 border-ink flex items-center justify-between">
              <h2 className="text-sm font-black text-ink uppercase tracking-wide">Friends</h2>
              <button
                onClick={() => setShowFriends(false)}
                className="px-2 py-1 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-3">
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
          <div className="relative w-full max-w-sm bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-yellow border-b-2 border-ink">
              <h2 className="text-sm font-black text-ink uppercase tracking-wide">Friend invite</h2>
            </div>
            <div className="p-5 space-y-4">
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

      {/* Main content */}
      <main className="ml-0 md:ml-60 flex-1 min-w-0 pt-20 md:pt-0 p-4 sm:p-6 xl:p-8">
        <Outlet />
      </main>
    </div>
  );
}
