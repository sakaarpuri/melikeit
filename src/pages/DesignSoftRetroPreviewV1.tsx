import { useMemo, useRef, useState } from 'react';
import { Grid3X3, List } from 'lucide-react';
import type { Find, FindType } from '../data/mockData';
import { currentUserId, friendIds, finds as seedFinds, sections as seedSections, users as mockUsers } from '../data/mockData';

type CardDensity = 'cozy' | 'standard' | 'compact';
type SidebarMode = 'sections' | 'friends';

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

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractFirstUrl(text: string): string | null {
  const uriList = text.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  for (const token of uriList) {
    const normalized = normalizeUrl(token);
    if (normalized) return normalized;
  }
  return null;
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
  const MAX_PREVIEW_DROP_BYTES = 10 * 1024 * 1024;
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [density, setDensity] = useState<CardDensity>('standard');
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('sections');
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [quickLink, setQuickLink] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteSectionId, setQuickNoteSectionId] = useState('');
  const [dropError, setDropError] = useState('');
  const [isGridDragging, setIsGridDragging] = useState(false);
  const gridDragCounterRef = useRef(0);

  const friends = useMemo(() => {
    return friendIds.map((id) => mockUsers.find((u) => u.id === id)).filter(Boolean) as Array<{
      id: string;
      displayName: string;
      username: string;
      avatarUrl: string;
    }>;
  }, []);

  const sections = useMemo(() => {
    const base = seedSections.filter((s) => s.userId === currentUserId);
    return [{ id: 'all', name: 'All Finds' }, ...base.map((s) => ({ id: s.id, name: s.name }))];
  }, []);

  const mySections = useMemo(() => {
    return seedSections.filter((s) => s.userId === currentUserId).slice(0, 8);
  }, []);

  const [allFinds, setAllFinds] = useState<Find[]>(() => seedFinds);

  const activeAuthorId = sidebarMode === 'friends' && selectedFriendId ? selectedFriendId : currentUserId;

  const activeAuthor = useMemo(() => {
    return mockUsers.find((u) => u.id === activeAuthorId) ?? mockUsers[0];
  }, [activeAuthorId]);

  const filtered = useMemo(() => {
    const byAuthor = allFinds.filter((f) => f.authorId === activeAuthorId);
    const base = selectedSection === 'all' ? byAuthor : byAuthor.filter((f) => f.sectionId === selectedSection);
    return base;
  }, [activeAuthorId, allFinds, selectedSection]);

  const gridCols =
    density === 'compact'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : density === 'cozy'
        ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  function addNewFind(partial: Partial<Find>) {
    const now = new Date();
    const id = `pv-${Math.random().toString(16).slice(2)}`;
    const next: Find = {
      id,
      authorId: currentUserId,
      title: partial.title ?? '',
      description: partial.description ?? '',
      url: partial.url,
      imageUrl: partial.imageUrl,
      fileName: partial.fileName,
      fileMime: partial.fileMime,
      fileSizeBytes: partial.fileSizeBytes,
      type: (partial.type ?? 'other') as FindType,
      visibility: partial.visibility ?? 'specific_friends',
      sectionId: partial.sectionId,
      likes: [],
      saved: [],
      comments: [],
      createdAt: now,
    };
    setAllFinds((prev) => [next, ...prev]);
  }

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

            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSidebarMode('sections')}
                  className={`flex-1 h-9 border-2 font-black text-xs uppercase tracking-wider shadow-retro ${
                    sidebarMode === 'sections' ? 'bg-ink text-white border-ink' : 'bg-white/70 text-ink border-ink/30 hover:border-ink'
                  }`}
                >
                  Sections
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarMode('friends')}
                  className={`flex-1 h-9 border-2 font-black text-xs uppercase tracking-wider shadow-retro ${
                    sidebarMode === 'friends' ? 'bg-ink text-white border-ink' : 'bg-white/70 text-ink border-ink/30 hover:border-ink'
                  }`}
                >
                  Friends
                </button>
              </div>

              {sidebarMode === 'sections' ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-ink/55">Browse</p>
                  {sections.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSection(s.id);
                        setSelectedFriendId('');
                      }}
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
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-ink/55">Your friends</p>
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => {
                        setSelectedFriendId(friend.id);
                        setSelectedSection('all');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all text-sm font-bold ${
                        selectedFriendId === friend.id
                          ? 'bg-ink text-white border-ink shadow-retro-pink'
                          : 'bg-white/70 border-transparent text-ink hover:border-ink hover:bg-white/80'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <img src={friend.avatarUrl} alt="" className="h-5 w-5 rounded-full border border-ink/20 bg-white" />
                        <span className="truncate">{friend.displayName}</span>
                      </span>
                    </button>
                  ))}
                  <div className="pt-1 text-[11px] font-bold text-ink/55">
                    Pick a friend to see their shared finds.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-ink/15">
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
                {sidebarMode === 'friends' && selectedFriendId ? `${activeAuthor.displayName}’s shared finds` : (sections.find((s) => s.id === selectedSection)?.name ?? 'All Finds')}
              </h2>
              <p className="text-sm text-ink/60 mt-1 font-medium">Calm surfaces, chunky lines, still early-2000s.</p>
            </div>
          </div>

          {/* Keep the existing app’s “Quick note” and “+Add Finds” flow (preview-only behavior) */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:justify-end">
            <div className="bg-white/75 backdrop-blur-[1px] border-2 border-ink rounded-xl shadow-retro p-3 w-full lg:w-[340px]">
              <div className="text-xs font-black uppercase tracking-wider text-ink">Quick note</div>
              <div className="mt-2 space-y-2">
                <select
                  value={quickNoteSectionId}
                  onChange={(e) => setQuickNoteSectionId(e.target.value)}
                  className="h-9 w-full border-2 border-ink bg-white px-2 text-xs font-black"
                >
                  <option value="">No section</option>
                  {mySections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Type a note… (Cmd/Ctrl + Enter to add)"
                  className="w-full h-20 border-2 border-ink bg-white px-2 py-2 text-sm font-semibold resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="h-9 px-3 border-2 border-ink bg-yellow shadow-retro text-xs font-black"
                    onClick={() => {
                      if (!quickNote.trim()) return;
                      addNewFind({
                        type: 'other',
                        description: quickNote.trim(),
                        title: 'Quick note',
                        sectionId: quickNoteSectionId || undefined,
                      });
                      setQuickNote('');
                    }}
                  >
                    Add note
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-pink/35 rounded-xl border-2 border-ink shadow-retro overflow-hidden p-3 w-full lg:w-[340px]">
              <div className="text-right">
                <div className="text-base font-black text-ink">+Add Finds</div>
                <div className="text-[11px] font-black text-ink/70 leading-snug">
                  paste links / drag files here
                  <br />
                  press Enter to add
                </div>
              </div>
              <div className="mt-2">
                <input
                  value={quickLink}
                  onChange={(e) => setQuickLink(e.target.value)}
                  placeholder="Paste a link…"
                  className="w-full h-10 border-2 border-ink bg-white/85 px-2 text-sm font-semibold placeholder:text-ink/40"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    const url = extractFirstUrl(quickLink);
                    if (!url) return;
                    addNewFind({ url, type: 'article', title: url, description: '' });
                    setQuickLink('');
                  }}
                />
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

          {/* Drop-anywhere grid area (preview only): images, links, and files */}
          <div
            className="relative mt-6"
            onDragEnter={(e) => {
              e.preventDefault();
              gridDragCounterRef.current += 1;
              setIsGridDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              gridDragCounterRef.current = Math.max(0, gridDragCounterRef.current - 1);
              if (gridDragCounterRef.current === 0) setIsGridDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              gridDragCounterRef.current = 0;
              setIsGridDragging(false);
              setDropError('');

              const files = Array.from(e.dataTransfer.files ?? []);
              const uriList = e.dataTransfer.getData('text/uri-list') || '';
              const plain = e.dataTransfer.getData('text/plain') || '';
              const droppedUrl = extractFirstUrl(uriList) ?? extractFirstUrl(plain);

              let didSomething = false;
              if (droppedUrl) {
                didSomething = true;
                addNewFind({ url: droppedUrl, type: 'article', title: droppedUrl, description: '' });
              }

              for (const file of files) {
                if (file.size > MAX_PREVIEW_DROP_BYTES) {
                  setDropError('File too large (10MB max).');
                  continue;
                }
                didSomething = true;
                if (file.type.startsWith('image/')) {
                  const objectUrl = URL.createObjectURL(file);
                  addNewFind({
                    title: file.name,
                    description: '',
                    imageUrl: objectUrl,
                    type: 'other',
                  });
                } else {
                  addNewFind({
                    title: file.name,
                    description: '',
                    fileName: file.name,
                    fileMime: file.type || 'application/octet-stream',
                    fileSizeBytes: file.size,
                    type: 'other',
                  });
                }
              }

              if (!didSomething) setDropError('No supported files or links found.');
            }}
          >
            {isGridDragging ? (
              <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border-2 border-dashed border-ink bg-white/50 backdrop-blur-[1px] grid place-items-center">
                <div className="border-2 border-ink bg-white shadow-retro px-4 py-3 text-sm font-black">
                  Drop to add finds (images, links, or files)
                </div>
              </div>
            ) : null}

            {dropError ? (
              <div className="mb-3 border-2 border-ink bg-white shadow-retro px-3 py-2 text-xs font-bold text-ink/70">
                {dropError}
              </div>
            ) : null}

            <div className={`grid gap-6 ${gridCols}`}>
            {filtered.slice(0, 12).map((find) => (
              <SoftRetroCard key={find.id} find={find} />
            ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
