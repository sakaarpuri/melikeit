import { useEffect, useMemo, useRef, useState } from 'react';
import FindCard from '../components/FindCard';
import SectionManager from '../components/SectionManager';
import CreateFindModal from '../components/CreateFindModal';
import type { Comment, Find, FindType, Section, User, Visibility } from '../data/mockData';
import { JOKES_OF_THE_DAY } from '../data/mockData';
import { useAuth } from '../auth/useAuth';
import { getSupabase } from '../supabase/client';

const todaysJoke = JOKES_OF_THE_DAY[new Date().getDate() % JOKES_OF_THE_DAY.length];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function handleFromName(name?: string): string {
  const raw = (name ?? '').trim().toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return slug || 'me';
}

function inferFindType(args: { sectionName?: string; url?: string; mimeType?: string }): FindType {
  const section = args.sectionName?.toLowerCase() ?? '';
  const url = args.url?.toLowerCase() ?? '';
  const mimeType = args.mimeType?.toLowerCase() ?? '';

  if (section.includes('recipe') || url.includes('recipe')) return 'recipe';
  if (section.includes('restaurant') || section.includes('place') || section.includes('travel')) return 'place';
  if (section.includes('book') || section.includes('article') || section.includes('news')) return 'article';
  if (section.includes('film') || section.includes('show') || section.includes('youtube') || url.includes('youtube.com')) return 'video';
  if (section.includes('music') || url.includes('spotify.com') || url.includes('soundcloud.com')) return 'music';
  if (mimeType.startsWith('image/')) return 'product';
  return 'other';
}

function safeExtFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 6) return fromName;
  const fromType = file.type.split('/')[1]?.toLowerCase();
  if (fromType && fromType.length <= 10) return fromType;
  return 'bin';
}

function isYouTubeUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com';
  } catch {
    return false;
  }
}

type DbFindRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  url: string | null;
  image_path: string | null;
  preview_path?: string | null;
  type: FindType;
  visibility: Visibility;
  section_id: string | null;
  created_at: string;
  find_comments?: Array<{ id: string; user_id: string; text: string; created_at: string }>;
  find_likes?: Array<{ user_id: string }>;
};

type DbSectionRow = {
  id: string;
  user_id: string;
  name: string;
  visibility: Visibility;
};

function mapSection(row: DbSectionRow): Section {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    visibility: row.visibility,
  };
}

function mapFind(row: DbFindRow, signedImageUrl?: string): Find {
  const comments: Comment[] = (row.find_comments ?? []).map((c) => ({
    id: c.id,
    authorId: c.user_id,
    text: c.text,
    createdAt: new Date(c.created_at),
  }));
  const likes = (row.find_likes ?? []).map((l) => l.user_id);

  return {
    id: row.id,
    authorId: row.user_id,
    title: row.title,
    description: row.description,
    url: row.url ?? undefined,
    imageUrl: signedImageUrl,
    type: row.type,
    visibility: row.visibility,
    specificFriendIds: [],
    groupIds: [],
    sectionId: row.section_id ?? undefined,
    likes,
    saved: [],
    comments,
    createdAt: new Date(row.created_at),
  };
}

function isMissingPreviewPathError(message?: string): boolean {
  return !!message && message.toLowerCase().includes('preview_path');
}

export default function MyFinds() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'most_liked'>(() => {
    const raw = window.localStorage.getItem('melikeit.sortMode');
    if (raw === 'oldest' || raw === 'most_liked' || raw === 'newest') return raw;
    return 'newest';
  });
  const [gridMode, setGridMode] = useState<'cozy' | 'standard' | 'compact'>(() => {
    const raw = window.localStorage.getItem('melikeit.gridMode');
    if (raw === 'cozy' || raw === 'compact' || raw === 'standard') return raw;
    return 'standard';
  });

  const [activeSection, setActiveSection] = useState<string | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [dropError, setDropError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [quickLink, setQuickLink] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const me: User = useMemo(() => {
    const fullName = user?.user_metadata?.full_name as string | undefined;
    const displayName = fullName ?? 'Me';
    const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined)
      ?? `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(user?.email ?? 'me')}`;
    const username = handleFromName(fullName);
    return {
      id: user?.id ?? 'me',
      username,
      displayName,
      avatarUrl,
      bio: '',
    };
  }, [user]);

  const mySections = useMemo(() => sections.filter((s) => s.userId === me.id), [sections, me.id]);
  const filtered = useMemo(() => {
    const base = activeSection ? finds.filter((f) => f.sectionId === activeSection) : finds;
    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sortMode === 'most_liked') {
        const likeDelta = (b.likes?.length ?? 0) - (a.likes?.length ?? 0);
        if (likeDelta !== 0) return likeDelta;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (sortMode === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    return sorted;
  }, [finds, activeSection, sortMode]);

  useEffect(() => {
    window.localStorage.setItem('melikeit.sortMode', sortMode);
  }, [sortMode]);

  useEffect(() => {
    window.localStorage.setItem('melikeit.gridMode', gridMode);
  }, [gridMode]);

  const resolveSectionName = (sectionId?: string) => (
    sectionId ? mySections.find((section) => section.id === sectionId)?.name : undefined
  );

  const loadAll = async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    const [{ data: sectionRows, error: sectionError }, { data: findRowsRaw, error: findError }] = await Promise.all([
      supabase.from('sections').select('id,user_id,name,visibility').order('created_at', { ascending: true }),
      supabase
        .from('finds')
        .select('id,user_id,title,description,url,image_path,preview_path,type,visibility,section_id,created_at,find_comments(id,user_id,text,created_at),find_likes(user_id)')
        .order('created_at', { ascending: false }),
    ]);

    if (sectionError) {
      setError(sectionError.message);
      setLoading(false);
      return;
    }
    if (findError && !isMissingPreviewPathError(findError.message)) {
      setError(findError.message);
      setLoading(false);
      return;
    }
    let effectiveFindRowsRaw: unknown[] | null = (findRowsRaw ?? null) as unknown[] | null;
    if (findError && isMissingPreviewPathError(findError.message)) {
      const { data: fallbackRows, error: fallbackError } = await supabase
        .from('finds')
        .select('id,user_id,title,description,url,image_path,type,visibility,section_id,created_at,find_comments(id,user_id,text,created_at),find_likes(user_id)')
        .order('created_at', { ascending: false });
      if (fallbackError) {
        setError(fallbackError.message);
        setLoading(false);
        return;
      }
      effectiveFindRowsRaw = (fallbackRows ?? null) as unknown[] | null;
    }

    const typedSections = (sectionRows ?? []) as unknown as DbSectionRow[];
    setSections(typedSections.map(mapSection));

    const typedFinds = (effectiveFindRowsRaw ?? []) as unknown as DbFindRow[];
    const paths = typedFinds.flatMap((f) => [f.image_path, f.preview_path]).filter((p): p is string => !!p);
    const signedMap = new Map<string, string>();
    if (paths.length > 0) {
      const { data } = await supabase.storage.from('find_images').createSignedUrls(paths, 60 * 60);
      (data ?? []).forEach((entry) => {
        if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
      });
    }

    setFinds(
      typedFinds.map((row) => {
        const pathToSign = row.image_path ?? row.preview_path;
        return mapFind(row, pathToSign ? signedMap.get(pathToSign) : undefined);
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const uploadImage = async (file: File) => {
    if (!user) throw new Error('Not signed in');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');
    const ext = safeExtFromFile(file);
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('find_images').upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (uploadError) throw uploadError;
    return path;
  };

  const createFind = async (args: { title: string; description: string; url: string; sectionId: string; imageFile?: File }) => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    let imagePath: string | undefined;
    if (args.imageFile) {
      imagePath = await uploadImage(args.imageFile);
    }
    let previewPath: string | undefined;
    const trimmedUrl = args.url?.trim();
    if (!imagePath && trimmedUrl && !isYouTubeUrl(trimmedUrl)) {
      const { data, error: previewError } = await supabase.functions.invoke<{ previewPath: string }>('link-preview', {
        body: { url: trimmedUrl },
      });
      if (!previewError && data?.previewPath) {
        previewPath = data.previewPath;
      }
    }

    const title = args.title.trim() || trimmedUrl || (args.imageFile ? args.imageFile.name : '') || 'Untitled find';
    const sectionName = resolveSectionName(args.sectionId);
    const type = inferFindType({ sectionName, url: args.url, mimeType: args.imageFile?.type });

    const { data, error: insertError } = await supabase
      .from('finds')
      .insert({
        user_id: user.id,
        title,
        description: args.description ?? '',
        url: trimmedUrl || null,
        image_path: imagePath ?? null,
        preview_path: previewPath ?? null,
        type,
        visibility: 'all_friends',
        section_id: args.sectionId || null,
      })
      .select('id,user_id,title,description,url,image_path,preview_path,type,visibility,section_id,created_at,find_comments(id,user_id,text,created_at),find_likes(user_id)')
      .single();

    let insertedRowRaw = data as unknown;
    if (insertError && isMissingPreviewPathError(insertError.message)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('finds')
        .insert({
          user_id: user.id,
          title,
          description: args.description ?? '',
          url: trimmedUrl || null,
          image_path: imagePath ?? null,
          type,
          visibility: 'all_friends',
          section_id: args.sectionId || null,
        })
        .select('id,user_id,title,description,url,image_path,type,visibility,section_id,created_at,find_comments(id,user_id,text,created_at),find_likes(user_id)')
        .single();
      if (fallbackError || !fallbackData) {
        setError(fallbackError?.message ?? 'Could not create find');
        return;
      }
      insertedRowRaw = fallbackData;
    } else if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create find');
      return;
    }

    const row = insertedRowRaw as DbFindRow;
    let signedUrl: string | undefined;
    const pathToSign = row.image_path ?? row.preview_path;
    if (pathToSign) {
      const { data: signed } = await supabase.storage.from('find_images').createSignedUrl(pathToSign, 60 * 60);
      signedUrl = signed?.signedUrl;
    }
    setFinds((prev) => [mapFind(row, signedUrl), ...prev]);
  };

  const createFromUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setDropError('Only image files are supported right now.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setDropError('File is too large. Maximum size is 10MB.');
      return;
    }
    setDropError('');
    await createFind({ title: file.name.replace(/\.[^/.]+$/, ''), description: '', url: '', sectionId: activeSection ?? '', imageFile: file });
  };

  const submitQuickLink = async () => {
    const raw = quickLink.trim();
    if (!raw) return;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withProtocol);
      const url = parsed.toString();
      setDropError('');
      await createFind({
        title: url,
        description: '',
        url,
        sectionId: activeSection ?? '',
      });
      setQuickLink('');
    } catch {
      setDropError('Please paste a valid link.');
    }
  };

  const submitQuickNote = async () => {
    const raw = quickNote.trim();
    if (!raw) return;
    setQuickNoteSaving(true);
    try {
      setDropError('');
      const titleLine = raw.split('\n').find((line) => line.trim())?.trim() ?? '';
      const title = titleLine.slice(0, 80) || 'Note';
      await createFind({
        title,
        description: raw,
        url: '',
        sectionId: activeSection ?? '',
      });
      setQuickNote('');
    } finally {
      setQuickNoteSaving(false);
    }
  };

  const createSection = async (args: { name: string; visibility: Visibility }) => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    const name = args.name.trim();
    if (!name) return;
    const { data, error: insertError } = await supabase
      .from('sections')
      .insert({ user_id: user.id, name, visibility: args.visibility })
      .select('id,user_id,name,visibility')
      .single();
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create section');
      return;
    }
    setSections((prev) => [...prev, mapSection(data as unknown as DbSectionRow)]);
  };

  const deleteSection = async (sectionId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('sections').delete().eq('id', sectionId);
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    await loadAll();
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="font-black text-ink text-lg uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="hidden md:block w-52 shrink-0 pt-14">
        <div className="bg-white rounded-xl border-2 border-ink shadow-retro p-4 sticky top-6">
          <div
            className={`px-2.5 py-2 rounded-lg cursor-pointer mb-2 text-sm font-black border-2 transition-all ${
              !activeSection
                ? 'bg-ink text-white border-ink'
                : 'text-ink border-transparent hover:border-ink hover:bg-yellow'
            }`}
            onClick={() => setActiveSection(undefined)}
          >
            All Finds
          </div>
          <SectionManager
            sections={mySections}
            onSectionClick={(id) => setActiveSection(id === activeSection ? undefined : id)}
            activeSectionId={activeSection}
            onCreateSection={createSection}
            onDeleteSection={deleteSection}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-6 p-4 bg-cyan border-2 border-ink rounded-xl shadow-retro flex items-start gap-3">
          <span className="text-2xl shrink-0">:|</span>
          <div>
            <p className="text-xs font-black text-ink uppercase tracking-wider mb-1">Joke of the Day</p>
            <p className="text-sm font-medium text-ink leading-snug">{todaysJoke}</p>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-[320px] bg-white border-2 border-ink rounded-xl shadow-retro p-4">
              <p className="text-xs font-black text-ink uppercase tracking-wider mb-2">Quick note</p>
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Type a note… (Cmd/Ctrl + Enter to add)"
                rows={3}
                className="w-full resize-none rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-semibold text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void submitQuickNote();
                  }
                }}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void submitQuickNote()}
                  disabled={quickNoteSaving || !quickNote.trim()}
                  className="px-3 py-2 rounded-lg border-2 border-ink bg-yellow text-xs font-black text-ink shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {quickNoteSaving ? 'Adding…' : 'Add note'}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-stretch w-full sm:w-auto">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void createFromUpload(file);
                e.currentTarget.value = '';
              }}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void createFromUpload(file);
              }}
              className={`px-5 py-4 rounded-xl border-2 border-ink text-sm font-black shadow-retro transition-all w-full sm:w-[460px] ${
                isDragging
                  ? 'bg-cyan text-ink -translate-x-0.5 -translate-y-0.5 shadow-retro-lg'
                  : 'bg-pink text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg'
              }`}
            >
              <textarea
                value={quickLink}
                onChange={(e) => setQuickLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submitQuickLink();
                  }
                }}
                placeholder={"+Add Finds\npaste links / drag files here\npress Enter to add"}
                rows={4}
                className="w-full min-h-[120px] resize-none bg-transparent text-right text-sm font-black leading-tight text-ink placeholder:text-ink placeholder:opacity-80 focus:outline-none"
              />
            </div>
            {dropError && <p className="text-xs text-pink-dark mt-1 font-bold">{dropError}</p>}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-white border-2 border-ink rounded-xl shadow-retro">
            <p className="text-sm font-bold text-ink">Error: {error}</p>
            {error.includes("Could not find the table 'public.sections'") && (
              <p className="text-xs text-ink/70 font-medium mt-2">
                This usually means the database schema hasn’t been created yet. Run `supabase/schema.sql` in your Supabase SQL Editor, then refresh.
              </p>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs font-black text-ink/50 uppercase tracking-widest">{finds.length} finds</p>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <label className="text-[11px] font-black uppercase tracking-wider text-ink/60">Sort</label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'newest' | 'oldest' | 'most_liked')}
              className="px-2.5 py-2 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink shadow-retro"
              aria-label="Sort finds"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_liked">Most liked</option>
            </select>

            <label className="text-[11px] font-black uppercase tracking-wider text-ink/60 ml-1">Grid</label>
            <select
              value={gridMode}
              onChange={(e) => setGridMode(e.target.value as 'cozy' | 'standard' | 'compact')}
              className="px-2.5 py-2 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink shadow-retro"
              aria-label="Grid density"
            >
              <option value="cozy">Cozy</option>
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>

        <div
          className={`gap-6 ${
            gridMode === 'compact'
              ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4'
              : gridMode === 'cozy'
                ? 'columns-1 md:columns-2 xl:columns-3'
                : 'columns-1 sm:columns-2 xl:columns-3'
          }`}
        >
          {filtered.map((find) => (
            <div key={find.id} className="break-inside-avoid mb-6">
              <FindCard find={find} author={me} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-ink/30 rounded-xl">
            <p className="font-black text-ink text-lg uppercase">No finds here</p>
            <p className="text-sm text-ink/60 mt-1">Add a new find and assign it here.</p>
          </div>
        )}
      </div>

      {showModal && (
        <CreateFindModal
          sections={mySections}
          onClose={() => setShowModal(false)}
          onSubmit={(data) => void createFind(data)}
        />
      )}
    </div>
  );
}
