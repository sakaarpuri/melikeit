import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
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

type DbFindRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  url: string | null;
  image_path: string | null;
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

export default function MyFinds() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeSection, setActiveSection] = useState<string | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [dropError, setDropError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
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
  const filtered = useMemo(
    () => (activeSection ? finds.filter((f) => f.sectionId === activeSection) : finds),
    [finds, activeSection]
  );

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

    const [{ data: sectionRows, error: sectionError }, { data: findRows, error: findError }] = await Promise.all([
      supabase.from('sections').select('id,user_id,name,visibility').order('created_at', { ascending: true }),
      supabase
        .from('finds')
        .select('id,user_id,title,description,url,image_path,type,visibility,section_id,created_at,find_comments(id,user_id,text,created_at),find_likes(user_id)')
        .order('created_at', { ascending: false }),
    ]);

    if (sectionError) {
      setError(sectionError.message);
      setLoading(false);
      return;
    }
    if (findError) {
      setError(findError.message);
      setLoading(false);
      return;
    }

    const typedSections = (sectionRows ?? []) as unknown as DbSectionRow[];
    setSections(typedSections.map(mapSection));

    const typedFinds = (findRows ?? []) as unknown as DbFindRow[];
    const paths = typedFinds.map((f) => f.image_path).filter((p): p is string => !!p);
    const signedMap = new Map<string, string>();
    if (paths.length > 0) {
      const { data } = await supabase.storage.from('find_images').createSignedUrls(paths, 60 * 60);
      (data ?? []).forEach((entry) => {
        if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
      });
    }

    setFinds(typedFinds.map((row) => mapFind(row, row.image_path ? signedMap.get(row.image_path) : undefined)));
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

    const title = args.title.trim() || args.url.trim() || (args.imageFile ? args.imageFile.name : '') || 'Untitled find';
    const sectionName = resolveSectionName(args.sectionId);
    const type = inferFindType({ sectionName, url: args.url, mimeType: args.imageFile?.type });

    const { data, error: insertError } = await supabase
      .from('finds')
      .insert({
        user_id: user.id,
        title,
        description: args.description ?? '',
        url: args.url?.trim() || null,
        image_path: imagePath ?? null,
        type,
        visibility: 'all_friends',
        section_id: args.sectionId || null,
      })
      .select('id,user_id,title,description,url,image_path,type,visibility,section_id,created_at,find_comments(id,user_id,text,created_at),find_likes(user_id)')
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create find');
      return;
    }

    const row = data as unknown as DbFindRow;
    let signedUrl: string | undefined;
    if (row.image_path) {
      const { data: signed } = await supabase.storage.from('find_images').createSignedUrl(row.image_path, 60 * 60);
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
      <div className="hidden md:block w-52 shrink-0">
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <img src={me.avatarUrl} alt={me.displayName} className="w-11 h-11 rounded-full border-2 border-ink" />
            <div>
              <h1 className="text-2xl font-black text-ink uppercase tracking-tight">{me.displayName}</h1>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end w-full sm:w-auto">
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
            <button
              onClick={() => setShowModal(true)}
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
              className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-ink text-sm font-black shadow-retro transition-all w-full sm:w-[460px] ${
                isDragging
                  ? 'bg-cyan text-ink -translate-x-0.5 -translate-y-0.5 shadow-retro-lg'
                  : 'bg-pink text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg'
              }`}
            >
              <Plus size={18} />
              <span className="leading-tight text-left">
                <span className="block text-base">add new 'finds'</span>
                <span className="block text-[12px] font-bold">paste links/ drag files here or click on me to add manually</span>
              </span>
            </button>
            {dropError && <p className="text-xs text-pink-dark mt-1 font-bold">{dropError}</p>}
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

        <div className="mb-5">
          <p className="text-xs font-black text-ink/50 uppercase tracking-widest">{finds.length} finds</p>
        </div>

        <div className="columns-1 sm:columns-2 xl:columns-3 gap-6">
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
