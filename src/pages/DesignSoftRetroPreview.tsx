import { useMemo, useState } from 'react';
import { Copy, HelpCircle, LogOut, Plus, Settings, X } from 'lucide-react';
import type { Find, FindType, Section, User } from '../data/mockData';
import { currentUserId, friendIds, finds as mockFinds, sections as mockSections, users as mockUsers } from '../data/mockData';

type SortMode = 'newest' | 'oldest';
type GridMode = 'standard' | 'cozy' | 'compact';

const TYPE_DOT: Record<FindType, string> = {
  article: '#FF4D9E',
  product: '#FFE500',
  place: '#00C9D4',
  video: '#FF6B35',
  music: '#A855F7',
  recipe: '#22C55E',
  other: '#9CA3AF',
};

const TYPE_LABELS: Record<FindType, string> = {
  article: 'ARTICLE',
  product: 'PRODUCT',
  place: 'PLACE',
  video: 'VIDEO',
  music: 'MUSIC',
  recipe: 'RECIPE',
  other: 'OTHER',
};

function dayLabel(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  if (days === 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  if (days < 7) return `${days}D AGO`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}

function domainFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function pickEmoji(find: Find): string {
  const name = (find.fileName ?? '').toLowerCase();
  const mime = (find.fileMime ?? '').toLowerCase();
  const ext = (() => {
    const parts = name.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1] ?? '';
  })();

  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎧';
  if (mime === 'application/pdf' || ext === 'pdf') return '📕';
  if (ext === 'doc' || ext === 'docx' || mime.includes('word')) return '📝';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv' || mime.includes('spreadsheet')) return '📊';
  if (ext === 'ppt' || ext === 'pptx' || mime.includes('presentation')) return '📽️';
  if (ext === 'zip' || ext === 'rar' || ext === '7z' || mime.includes('zip')) return '🧳';
  if (ext === 'txt' || ext === 'md' || mime.startsWith('text/')) return '📜';

  if (find.url) {
    if (find.type === 'article') return '📰';
    if (find.type === 'video') return '📺';
    if (find.type === 'music') return '🎵';
    if (find.type === 'recipe') return '🍜';
    if (find.type === 'place') return '📍';
    if (find.type === 'product') return '🛍️';
    return '🔗';
  }

  if (find.description) return '🗒️';
  return '✨';
}

function RetroModal(props: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={props.onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg border-2 border-ink bg-white/85 shadow-retro rounded-xl overflow-hidden animate-[pop_140ms_ease-out]"
        style={{ transformOrigin: '50% 60%' }}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-yellow/80 px-4 py-3">
          <div className="text-sm font-black uppercase tracking-wider text-ink">{props.title}</div>
          <button
            type="button"
            className="h-8 w-8 grid place-items-center border-2 border-ink bg-white shadow-retro"
            onClick={props.onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 text-sm text-ink">{props.children}</div>
        {props.footer ? (
          <div className="p-4 pt-0 flex items-center justify-end gap-2">{props.footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function RetroFindCard({ find }: { find: Find }) {
  const author = mockUsers.find((u) => u.id === find.authorId) ?? mockUsers[0];
  const dot = TYPE_DOT[find.type];
  const title = (find.title || '').trim() || TYPE_LABELS[find.type];
  const emoji = pickEmoji(find);
  const isLink = !!find.url;
  const domain = domainFromUrl(find.url);

  return (
    <div className="border-2 border-ink bg-white/80 backdrop-blur-[1px] shadow-retro overflow-hidden">
      <div className="bg-white border-b-2 border-ink px-3 py-2 flex items-center gap-2 select-none">
        <div className="w-4 h-4 border border-ink/25 shrink-0" style={{ backgroundColor: dot }} />
        <span className="text-[11px] font-black uppercase tracking-wider text-ink truncate max-w-[56%]">
          {title}
        </span>
        <div
          className="flex-1 h-[10px] border-y border-ink/70"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 1px, rgba(17,17,17,0.9) 1px, rgba(17,17,17,0.9) 2px)' }}
        />
        <div className="w-7 h-7 border-2 border-ink bg-white grid place-items-center">
          <div className="w-3 h-3 border border-ink/80" />
        </div>
      </div>

      <div className="relative border-b-2 border-ink">
        {find.imageUrl ? (
          <img src={find.imageUrl} alt={title} className="block w-full h-52 object-cover" />
        ) : (
          <div className="h-52 w-full bg-[#f2f2f2] grid place-items-center">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-transparent">
              <span className="text-7xl leading-none select-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="sr-only">Preview</span>
            </div>
          </div>
        )}

        {isLink ? (
          <a
            href={find.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-1/2 -translate-x-1/2 bottom-4 no-underline border-2 border-ink bg-[#3ff07a] text-ink px-5 py-2 text-xs font-black uppercase tracking-wider shadow-retro"
          >
            Open link
          </a>
        ) : null}
      </div>

      <div className="bg-white/80 p-3">
        <div className="flex items-center justify-between mb-2 text-[11px] font-black uppercase tracking-wider text-ink/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-ink/25" style={{ backgroundColor: dot }} />
            {TYPE_LABELS[find.type]}
          </span>
          <span>{dayLabel(find.createdAt)}</span>
        </div>

        <p className="text-sm font-medium leading-snug text-ink/85 line-clamp-2">
          {find.description || 'No description added yet.'}
        </p>

        <div className="mt-3 pt-2 border-t border-ink/15 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <img src={author.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-ink/20 bg-white" />
            <div className="min-w-0">
              <div className="text-xs font-black text-ink truncate">@{author.username}</div>
              <div className="text-[11px] font-bold text-ink/50 truncate">{domain || 'Quick note'}</div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button className="h-9 w-9 border-2 border-ink bg-white shadow-retro text-xs font-black">D</button>
            <button className="h-9 px-3 border-2 border-ink bg-yellow shadow-retro inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              <span aria-hidden="true">✏️</span>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignSoftRetroPreview() {
  const [activeSection, setActiveSection] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [gridMode, setGridMode] = useState<GridMode>('standard');
  const [showHelp, setShowHelp] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [quickLink, setQuickLink] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteSectionId, setQuickNoteSectionId] = useState('');

  const me = useMemo<User>(() => {
    return mockUsers.find((u) => u.id === currentUserId) ?? mockUsers[0];
  }, []);

  const mySections = useMemo<Section[]>(() => mockSections.filter((s) => s.userId === currentUserId), []);

  const friends = useMemo<User[]>(
    () => friendIds.map((id) => mockUsers.find((u) => u.id === id)).filter(Boolean) as User[],
    [],
  );

  const filteredFinds = useMemo(() => {
    const mine = mockFinds.filter((f) => f.authorId === currentUserId);
    const sectioned = activeSection === 'all' ? mine : mine.filter((f) => f.sectionId === activeSection);
    const sorted = [...sectioned].sort((a, b) => {
      const delta = a.createdAt.getTime() - b.createdAt.getTime();
      return sortMode === 'newest' ? -delta : delta;
    });
    return sorted;
  }, [activeSection, sortMode]);

  const gridCols =
    gridMode === 'compact'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : gridMode === 'cozy'
        ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div
      className="min-h-screen text-ink"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 20% 10%, rgba(255,77,158,0.18), transparent 45%)',
          'radial-gradient(circle at 90% 20%, rgba(0,201,212,0.20), transparent 55%)',
          'radial-gradient(circle at 40% 100%, rgba(255,229,0,0.22), transparent 55%)',
          'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(250,250,250,0.86))',
        ].join(','),
      }}
    >
      <style>{`
        @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-64 shrink-0 border-r-2 border-ink bg-yellow">
          <div className="w-full flex flex-col">
            <div className="p-5 border-b-2 border-ink">
              <div className="text-2xl font-black tracking-tight">
                <span className="text-ink">me</span>
                <span className="text-pink">Likes</span>
                <span className="text-ink">It</span>
              </div>
              <div className="text-xs font-bold text-ink/70 mt-1">place for all your ‘finds’</div>
            </div>

            <div className="p-5">
              <button className="w-full text-left px-4 py-3 rounded-xl border-2 border-ink bg-pink shadow-retro text-ink font-black">
                My Finds
              </button>
            </div>

            <div className="flex-1" />

            <div className="p-5 space-y-4">
              <button
                type="button"
                onClick={() => setShowFriends(true)}
                className="w-full text-left border-2 border-ink bg-white/75 shadow-retro rounded-xl p-4"
              >
                <div className="text-xs font-black uppercase tracking-wider text-ink/70">Friends</div>
                <div className="text-xs font-bold text-ink/55 mt-0.5">{friends.length} connected</div>
              </button>

              <div className="border-2 border-ink bg-white/75 shadow-retro rounded-xl p-4">
                <div className="text-xs font-black uppercase tracking-wider text-ink/70">House rules</div>
                <div className="text-xs font-bold text-ink/60 mt-1 leading-snug">
                  No memes. No forwards. No Insta reposts. <span className="text-pink font-black">We will judge you.</span>
                </div>
              </div>

              <div className="border-2 border-ink bg-white/85 shadow-retro rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <img src={me.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-ink/20 bg-white" />
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate">{me.displayName}</div>
                    <div className="text-[11px] font-bold text-ink/55 truncate">@{me.username}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <select className="flex-1 h-9 border-2 border-ink bg-white px-2 text-xs font-black">
                    <option>MODE: Default</option>
                    <option>MODE: Plain</option>
                    <option>MODE: Stealth</option>
                  </select>
                  <button
                    className="h-9 w-9 border-2 border-ink bg-white shadow-retro grid place-items-center"
                    aria-label="Settings"
                  >
                    <Settings size={16} />
                  </button>
                </div>

                <button className="mt-3 w-full h-10 border-2 border-ink bg-white shadow-retro inline-flex items-center justify-center gap-2 text-xs font-black">
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr_1fr] items-start">
            <div className="bg-white/75 backdrop-blur-[1px] rounded-xl border-2 border-ink shadow-retro overflow-hidden">
              <div className="bg-ink text-white px-4 py-3 text-sm font-black">All Finds</div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-black uppercase tracking-wider text-ink/55">My sections</div>
                  <button className="h-7 w-7 border-2 border-ink bg-white shadow-retro grid place-items-center text-xs font-black">
                    +
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('all')}
                    className={`w-full flex items-center gap-2 px-3 py-2 border-2 rounded-xl text-sm font-black shadow-retro ${
                      activeSection === 'all' ? 'bg-white border-ink' : 'bg-white/60 border-ink/30 hover:border-ink'
                    }`}
                  >
                    <span className="inline-block h-3 w-3 rounded-sm border border-ink/20 bg-ink" />
                    <span className="truncate">all finds</span>
                  </button>
                  {mySections.slice(0, 6).map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 border-2 rounded-xl text-sm font-black shadow-retro ${
                        activeSection === section.id ? 'bg-white border-ink' : 'bg-white/60 border-ink/30 hover:border-ink'
                      }`}
                    >
                      <span className="inline-block h-3 w-3 rounded-sm border border-ink/20 bg-pink" />
                      <span className="truncate">{section.name.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/75 backdrop-blur-[1px] rounded-xl border-2 border-ink shadow-retro p-4">
              <div className="text-sm font-black uppercase tracking-wider text-ink">Quick note</div>
              <div className="mt-3 space-y-3">
                <select
                  value={quickNoteSectionId}
                  onChange={(e) => setQuickNoteSectionId(e.target.value)}
                  className="h-10 w-full border-2 border-ink bg-white px-3 text-xs font-black"
                >
                  <option value="">No section</option>
                  {mySections.slice(0, 6).map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Type a note… (Cmd/Ctrl + Enter to add)"
                  className="w-full h-24 border-2 border-ink bg-white px-3 py-2 text-sm font-semibold resize-none"
                />
                <div className="flex justify-end">
                  <button className="h-10 px-4 border-2 border-ink bg-yellow shadow-retro text-xs font-black">Add note</button>
                </div>
              </div>
            </div>

            <div className="bg-pink/70 rounded-xl border-2 border-ink shadow-retro overflow-hidden">
              <div className="p-4">
                <div className="text-right">
                  <div className="text-lg font-black text-ink">+Add Finds</div>
                  <div className="text-xs font-black text-ink/70 leading-snug">
                    paste links / drag files here
                    <br />
                    press Enter to add
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    value={quickLink}
                    onChange={(e) => setQuickLink(e.target.value)}
                    placeholder="Paste a link…"
                    className="w-full h-11 border-2 border-ink bg-white/85 px-3 text-sm font-semibold placeholder:text-ink/40"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button className="h-10 px-4 border-2 border-ink bg-white shadow-retro inline-flex items-center gap-2 text-xs font-black">
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 bg-cyan/70 backdrop-blur-[1px] rounded-xl border-2 border-ink shadow-retro p-4">
            <div className="text-xs font-black uppercase tracking-wider text-ink">Joke of the day</div>
            <div className="text-sm font-semibold text-ink mt-1">
              Your “Good Morning!” flower GIF is beautiful. Keep it in your DMs where it belongs.
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs font-black uppercase tracking-widest text-ink/50">{filteredFinds.length} finds</div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="h-10 px-3 border-2 border-ink bg-yellow shadow-retro inline-flex items-center gap-2 text-xs font-black"
              >
                <HelpCircle size={16} />
                ? Help
              </button>

              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink/60">
                Sort
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="h-10 border-2 border-ink bg-white px-2 text-xs font-black"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink/60">
                Grid
                <select
                  value={gridMode}
                  onChange={(e) => setGridMode(e.target.value as GridMode)}
                  className="h-10 border-2 border-ink bg-white px-2 text-xs font-black"
                >
                  <option value="standard">Standard</option>
                  <option value="cozy">Cozy</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`mt-5 grid gap-6 ${gridCols}`}>
            {filteredFinds.slice(0, 12).map((find) => (
              <RetroFindCard key={find.id} find={find} />
            ))}
          </div>
        </main>
      </div>

      {showFriends ? (
        <RetroModal
          title="Friends"
          onClose={() => setShowFriends(false)}
          footer={
            <button
              type="button"
              className="h-10 px-4 border-2 border-ink bg-white shadow-retro text-xs font-black"
              onClick={() => setShowFriends(false)}
            >
              Done
            </button>
          }
        >
          <div className="text-sm font-semibold text-ink/80">Friends’ names show here (same place as the real app).</div>
          <div className="mt-3 space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between gap-3 border-2 border-ink/20 bg-white/70 rounded-xl p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={friend.avatarUrl} alt="" className="h-9 w-9 rounded-full border border-ink/20 bg-white" />
                  <div className="min-w-0">
                    <div className="text-sm font-black truncate">{friend.displayName}</div>
                    <div className="text-xs font-bold text-ink/55 truncate">@{friend.username}</div>
                  </div>
                </div>
                <button className="h-9 px-3 border-2 border-ink bg-white shadow-retro text-xs font-black">View</button>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-ink/15 pt-4">
            <div className="text-xs font-black uppercase tracking-wider text-ink/60">Invite link</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value="https://melikesit.example/?friendInvite=TOKEN"
                className="flex-1 h-10 border-2 border-ink bg-white/85 px-3 text-xs font-black text-ink/70"
              />
              <button className="h-10 w-10 border-2 border-ink bg-white shadow-retro grid place-items-center" aria-label="Copy invite link">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </RetroModal>
      ) : null}

      {showHelp ? (
        <RetroModal
          title="Help"
          onClose={() => setShowHelp(false)}
          footer={
            <button
              type="button"
              className="h-10 px-4 border-2 border-ink bg-yellow shadow-retro text-xs font-black"
              onClick={() => setShowHelp(false)}
            >
              Got it
            </button>
          }
        >
          <div className="space-y-3">
            <div className="text-sm font-black">Add finds fast</div>
            <ul className="list-disc pl-5 space-y-1 text-sm font-semibold text-ink/80">
              <li>Drop screenshots, links, or files anywhere on the grid</li>
              <li>Paste screenshot: Cmd/Ctrl+V</li>
              <li>Type/paste a link in +Add Finds and press Enter</li>
              <li>Quick note: Cmd/Ctrl+Enter</li>
              <li>Card buttons: D=Details, pencil=Edit</li>
            </ul>
          </div>
        </RetroModal>
      ) : null}
    </div>
  );
}

