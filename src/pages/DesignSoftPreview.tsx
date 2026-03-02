import { useMemo, useState } from 'react';
import { Grid3X3, Link2, List, Plus, StickyNote } from 'lucide-react';
import type { Find } from '../data/mockData';
import { finds as mockFinds, sections as mockSections, users as mockUsers } from '../data/mockData';

type CardDensity = 'roomy' | 'comfortable' | 'compact';

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
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

function typePill(type: Find['type']): { label: string; bg: string; fg: string } {
  switch (type) {
    case 'video':
      return { label: 'VIDEO', bg: 'bg-orange-100', fg: 'text-orange-700' };
    case 'article':
      return { label: 'ARTICLE', bg: 'bg-indigo-100', fg: 'text-indigo-700' };
    case 'music':
      return { label: 'MUSIC', bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700' };
    case 'recipe':
      return { label: 'RECIPE', bg: 'bg-emerald-100', fg: 'text-emerald-700' };
    case 'place':
      return { label: 'PLACE', bg: 'bg-cyan-100', fg: 'text-cyan-800' };
    case 'product':
      return { label: 'PRODUCT', bg: 'bg-yellow-100', fg: 'text-yellow-800' };
    default:
      return { label: 'NOTE', bg: 'bg-stone-100', fg: 'text-stone-700' };
  }
}

function SoftFindCard({ find }: { find: Find }) {
  const author = mockUsers.find((u) => u.id === find.authorId) ?? mockUsers[0];
  const pill = typePill(find.type);
  const domain = domainFromUrl(find.url);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      <div className="relative h-44 bg-[linear-gradient(135deg,#f7f7f7,#ececec)]">
        {find.imageUrl ? (
          <img src={find.imageUrl} alt={find.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <div className="h-16 w-16 rounded-2xl border border-black/10 bg-white/70 backdrop-blur-sm grid place-items-center">
              <span className="text-3xl" aria-hidden="true">✦</span>
            </div>
          </div>
        )}
        <div className="absolute left-4 top-4">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider ${pill.bg} ${pill.fg}`}>
            {pill.label}
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm font-black text-ink line-clamp-1">{find.title}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink/70 line-clamp-2">
          {find.description || 'A quiet little find.'}
        </p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-ink/55">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2.5 w-2.5 rounded-sm bg-pink/60" />
            <span className="truncate">{domain || author.username}</span>
          </div>
          <span className="shrink-0">{timeAgo(find.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DesignSoftPreview() {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [density, setDensity] = useState<CardDensity>('comfortable');
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const base = mockSections.filter((s) => s.userId === 'u1');
    return [{ id: 'all', name: 'All Finds' }, ...base.map((s) => ({ id: s.id, name: s.name }))];
  }, []);

  const filtered = useMemo(() => {
    const base = selectedSection === 'all'
      ? mockFinds
      : mockFinds.filter((f) => f.sectionId === selectedSection);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((f) => `${f.title} ${f.description} ${f.url ?? ''}`.toLowerCase().includes(q));
  }, [selectedSection, query]);

  const gridCols = density === 'compact'
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : density === 'roomy'
      ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-ink">
      <div className="flex">
        <aside className="hidden lg:flex w-72 shrink-0 border-r border-black/10 bg-white/70 backdrop-blur-sm min-h-screen">
          <div className="w-full p-6 flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-black tracking-tight">
                <span className="text-ink">me</span>
                <span className="text-pink">Likes</span>
                <span className="text-ink">It</span>
              </h1>
              <p className="text-xs text-ink/55 mt-1">your finds, curated</p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-ink/40">Browse</p>
              <button
                onClick={() => setSelectedSection('all')}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold border ${
                  selectedSection === 'all'
                    ? 'bg-pink/10 border-pink/20 text-pink-dark'
                    : 'bg-white border-black/10 text-ink/70 hover:bg-black/[0.02]'
                }`}
              >
                <span>All Finds</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white border border-black/10 text-ink/60">
                  {mockFinds.length}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-widest text-ink/40">Sections</p>
                <button className="h-7 w-7 rounded-lg border border-black/10 bg-white text-ink/60">+</button>
              </div>
              <div className="space-y-1">
                {sections.filter((s) => s.id !== 'all').slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSection(s.id)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold border ${
                      selectedSection === s.id
                        ? 'bg-black/[0.03] border-black/10 text-ink'
                        : 'bg-white border-black/10 text-ink/70 hover:bg-black/[0.02]'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white border border-black/10 text-ink/60">
                      {mockFinds.filter((f) => f.sectionId === s.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-black/10 flex items-center justify-between text-xs text-ink/55">
              <span>Friends</span>
              <span className="font-black">0</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{sections.find((s) => s.id === selectedSection)?.name ?? 'All Finds'}</h2>
              <p className="text-sm text-ink/55 mt-1">A softer layout option, easier on the eyes.</p>
            </div>
            <button className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-pink px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_30px_rgba(255,77,158,0.25)]">
              <Plus size={16} />
              Add Find
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white/80 backdrop-blur-sm p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl border border-black/10 bg-white grid place-items-center text-ink/60">
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
                <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black text-ink/70">
                  <StickyNote size={14} />
                  Note
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black text-ink/70">
                  <Link2 size={14} />
                  Link
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-ink/40">{filtered.length} finds</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDensity('roomy')}
                className={`rounded-full px-3 py-1.5 text-xs font-black border ${density === 'roomy' ? 'bg-ink text-white border-ink' : 'bg-white border-black/10 text-ink/60'}`}
              >
                Roomy
              </button>
              <button
                onClick={() => setDensity('comfortable')}
                className={`rounded-full px-3 py-1.5 text-xs font-black border ${density === 'comfortable' ? 'bg-ink text-white border-ink' : 'bg-white border-black/10 text-ink/60'}`}
              >
                Comfy
              </button>
              <button
                onClick={() => setDensity('compact')}
                className={`rounded-full px-3 py-1.5 text-xs font-black border ${density === 'compact' ? 'bg-ink text-white border-ink' : 'bg-white border-black/10 text-ink/60'}`}
              >
                Compact
              </button>
              <div className="ml-2 flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1">
                <button className="h-8 w-8 rounded-lg grid place-items-center text-ink/60 bg-black/[0.03]">
                  <Grid3X3 size={16} />
                </button>
                <button className="h-8 w-8 rounded-lg grid place-items-center text-ink/60 hover:bg-black/[0.03]">
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className={`mt-6 grid gap-6 ${gridCols}`}>
            {filtered.slice(0, 12).map((find) => (
              <SoftFindCard key={find.id} find={find} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

