import { useMemo, useState } from 'react';
import { Grid3X3, Link2, List, Plus, StickyNote, X } from 'lucide-react';
import type { Find, FindType } from '../data/mockData';
import { friendIds, finds as mockFinds, sections as mockSections, users as mockUsers } from '../data/mockData';

type CardDensity = 'cozy' | 'standard' | 'compact';

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

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
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

function RetroModal(props: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        className="relative w-full max-w-lg border-2 border-ink bg-white/90 shadow-retro rounded-xl overflow-hidden animate-[pop_140ms_ease-out]"
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
      </div>
      <style>{`
        @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}

function SoftRetroCard({ find }: { find: Find }) {
  const author = mockUsers.find((u) => u.id === find.authorId) ?? mockUsers[0];
  const dot = TYPE_DOT[find.type];
  const displayTitle = find.title.trim() || TYPE_LABELS[find.type];
  const domain = domainFromUrl(find.url);
  const emoji = pickEmoji(find);

  return (
    <div className="border-2 border-ink bg-white/80 backdrop-blur-[1px] shadow-retro overflow-hidden rounded-xl">
      <div className="bg-white/70 border-b-2 border-ink px-3 py-2 flex items-center gap-2 select-none">
        <div className="w-4 h-4 border border-ink/20 shrink-0" style={{ backgroundColor: dot }} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink truncate max-w-[52%]">
          {displayTitle}
        </span>
        <div
          className="flex-1 h-[10px] border-y border-ink/70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0, transparent 1px, rgba(17,17,17,0.9) 1px, rgba(17,17,17,0.9) 2px)',
          }}
        />
        <div className="w-6 h-6 border-2 border-ink bg-white grid place-items-center">
          <div className="w-2.5 h-2.5 border border-ink/80" />
        </div>
      </div>

      <div className="relative border-b-2 border-ink bg-[#f2f2f2]">
        {find.imageUrl ? (
          <img src={find.imageUrl} alt={displayTitle} className="block w-full h-52 object-cover" />
        ) : (
          <div
            className="h-52 w-full grid place-items-center"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 34%), linear-gradient(135deg, #f6f6f6 0%, #dfdfdf 55%, #ececec 100%)',
            }}
          >
            <div className="inline-flex items-center justify-center w-24 h-24 border-2 border-ink/70 rounded-xl bg-transparent">
              <span className="text-6xl leading-none select-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="sr-only">Preview</span>
            </div>
          </div>
        )}

        {find.url && (
          <a
            href={find.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-1/2 -translate-x-1/2 bottom-4 no-underline border-2 border-ink bg-[#3ff07a] text-ink px-5 py-2 text-xs font-black uppercase tracking-wider shadow-retro"
          >
            Open
          </a>
        )}
      </div>

      <div className="bg-white/70 p-3">
        <div className="flex items-center justify-between mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-ink/25" style={{ backgroundColor: dot }} />
            {TYPE_LABELS[find.type]}
          </span>
          <span>{timeAgo(find.createdAt)}</span>
        </div>

        <p className="text-sm font-medium leading-snug text-ink/85 line-clamp-2">
          {find.description || 'No description yet.'}
        </p>

        <div className="flex items-center justify-between mt-3 pt-2 text-[11px] font-bold text-ink/55 border-t border-ink/15">
          <span className="truncate max-w-[60%]">{domain || author.username}</span>
          <span className="uppercase tracking-wider">{find.visibility === 'all_friends' ? 'Friends' : 'Private'}</span>
        </div>
      </div>
    </div>
  );
}

export default function DesignSoftRetroPreviewV1() {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [density, setDensity] = useState<CardDensity>('standard');
  const [query, setQuery] = useState('');
  const [showFriends, setShowFriends] = useState(false);

  const friends = useMemo(() => {
    return friendIds.map((id) => mockUsers.find((u) => u.id === id)).filter(Boolean) as Array<{
      id: string;
      displayName: string;
      username: string;
      avatarUrl: string;
    }>;
  }, []);

  const sections = useMemo(() => {
    const base = mockSections.filter((s) => s.userId === 'u1');
    return [{ id: 'all', name: 'All Finds' }, ...base.map((s) => ({ id: s.id, name: s.name }))];
  }, []);

  const filtered = useMemo(() => {
    const base = selectedSection === 'all' ? mockFinds : mockFinds.filter((f) => f.sectionId === selectedSection);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((f) => `${f.title} ${f.description} ${f.url ?? ''} ${f.fileName ?? ''}`.toLowerCase().includes(q));
  }, [selectedSection, query]);

  const gridCols =
    density === 'compact'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : density === 'cozy'
        ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="y2k-surface rounded-2xl p-4 sm:p-6 flex gap-6">
        <aside className="hidden md:block w-60 shrink-0">
          <div className="bg-yellow/60 backdrop-blur-[1px] rounded-xl border-2 border-ink shadow-retro p-4 sticky top-6">
            <div className="pb-4 border-b-2 border-ink/15">
              <h1 className="text-2xl font-black tracking-tight">
                <span className="text-ink">me</span>
                <span className="text-pink">Likes</span>
                <span className="text-ink">It</span>
              </h1>
              <p className="text-xs text-ink/60 mt-0.5 font-medium">softer, but still us</p>
            </div>

            <div className="pt-4 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-ink/55">Browse</p>
              {sections.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSection(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all text-sm font-bold ${
                    selectedSection === s.id
                      ? 'bg-ink text-white border-ink shadow-retro-pink'
                      : 'bg-white/70 border-transparent text-ink hover:border-ink hover:bg-white/80'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-ink/15">
              <button
                type="button"
                onClick={() => setShowFriends(true)}
                className="w-full text-left border-2 border-ink bg-white/70 shadow-retro rounded-xl px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-ink/70">Friends</span>
                  <span className="text-[11px] font-black text-ink">{friends.length}</span>
                </div>
                <div className="text-[11px] font-bold text-ink/55 mt-0.5">See names + invite</div>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-ink/15">
              <p className="text-xs font-black text-ink uppercase tracking-wide mb-1">House rules</p>
              <p className="text-xs text-ink/70 leading-snug font-medium">
                No memes. No forwards. No reposts. <span className="text-pink font-black">We will judge you.</span>
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
                {sections.find((s) => s.id === selectedSection)?.name ?? 'All Finds'}
              </h2>
              <p className="text-sm text-ink/60 mt-1 font-medium">Calm surfaces, chunky lines, still early-2000s.</p>
            </div>
            <button className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-pink px-4 py-2.5 text-sm font-black text-ink border-2 border-ink shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all">
              <Plus size={16} />
              Add Find
            </button>
          </div>

          <div className="mt-6 bg-white/75 backdrop-blur-[1px] border-2 border-ink rounded-xl shadow-retro p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl border-2 border-ink bg-white grid place-items-center text-ink/70">
                  <Link2 size={18} />
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Paste a link, drop a file, or type a quick note..."
                  className="w-full bg-transparent outline-none text-sm font-semibold placeholder:text-ink/35"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-2 text-xs font-black text-ink/75">
                  <StickyNote size={14} />
                  Note
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-2 text-xs font-black text-ink/75">
                  <Link2 size={14} />
                  Link
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-ink/50">{filtered.length} finds</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDensity('cozy')}
                className={`rounded-full px-3 py-1.5 text-xs font-black border-2 border-ink ${
                  density === 'cozy' ? 'bg-ink text-white' : 'bg-white text-ink/70'
                }`}
              >
                Cozy
              </button>
              <button
                onClick={() => setDensity('standard')}
                className={`rounded-full px-3 py-1.5 text-xs font-black border-2 border-ink ${
                  density === 'standard' ? 'bg-ink text-white' : 'bg-white text-ink/70'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setDensity('compact')}
                className={`rounded-full px-3 py-1.5 text-xs font-black border-2 border-ink ${
                  density === 'compact' ? 'bg-ink text-white' : 'bg-white text-ink/70'
                }`}
              >
                Compact
              </button>
              <div className="ml-2 flex items-center gap-1 rounded-xl border-2 border-ink bg-white p-1 shadow-retro">
                <button className="h-8 w-8 rounded-lg grid place-items-center text-ink/70 bg-black/[0.03]">
                  <Grid3X3 size={16} />
                </button>
                <button className="h-8 w-8 rounded-lg grid place-items-center text-ink/70 hover:bg-black/[0.03]">
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className={`mt-6 grid gap-6 ${gridCols}`}>
            {filtered.slice(0, 12).map((find) => (
              <SoftRetroCard key={find.id} find={find} />
            ))}
          </div>
        </main>
      </div>

      {showFriends ? (
        <RetroModal title="Friends" onClose={() => setShowFriends(false)}>
          <div className="text-sm font-semibold text-ink/80">
            In the real app, friends live in the left yellow sidebar as a button. In this preview layout, they open from the sidebar card.
          </div>
          <div className="mt-3 space-y-2">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center gap-3 border-2 border-ink/20 bg-white/70 rounded-xl p-3">
                <img src={friend.avatarUrl} alt="" className="h-9 w-9 rounded-full border border-ink/20 bg-white" />
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">{friend.displayName}</div>
                  <div className="text-xs font-bold text-ink/55 truncate">@{friend.username}</div>
                </div>
              </div>
            ))}
          </div>
        </RetroModal>
      ) : null}
    </div>
  );
}
