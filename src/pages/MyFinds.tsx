import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FindCard from '../components/FindCard';
import CreateFindModal from '../components/CreateFindModal';
import type { Find, FindType, Section, User, Visibility } from '../data/mockData';
import { JOKES_OF_THE_DAY } from '../data/mockData';
import { useAuth } from '../auth/useAuth';
import { getSupabase } from '../supabase/client';

const todaysJoke = JOKES_OF_THE_DAY[new Date().getDate() % JOKES_OF_THE_DAY.length];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_STORED_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_STORED_IMAGE_DIMENSION = 1600;
const QUICK_NOTE_NEW_SECTION_OPTION = '__create_new_section__';
const DEFAULT_SECTION_NAMES = ['Articles', 'Videos', 'Products', 'Places', 'Recipes', 'Notes'];
const SECTION_SUBSECTION_SEPARATOR = ' / ';

function handleFromName(name?: string): string {
  const raw = (name ?? '').trim().toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return slug || 'me';
}

function parseSectionLabel(rawName?: string): { section: string; subsection: string } {
  const name = (rawName ?? '').trim();
  if (!name) return { section: '', subsection: '' };
  const [sectionPart, ...rest] = name.split(SECTION_SUBSECTION_SEPARATOR);
  return {
    section: (sectionPart ?? '').trim(),
    subsection: rest.join(SECTION_SUBSECTION_SEPARATOR).trim(),
  };
}

function composeSectionLabel(sectionName: string, subsectionName?: string): string {
  const base = sectionName.trim();
  const subsection = (subsectionName ?? '').trim();
  if (!base) return '';
  return subsection ? `${base}${SECTION_SUBSECTION_SEPARATOR}${subsection}` : base;
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

async function loadImageForCanvas(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image.'));
    };
    image.src = objectUrl;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not compress image.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function optimizeImageForUpload(file: File): Promise<File> {
  const image = await loadImageForCanvas(file);
  const scale = Math.min(1, MAX_STORED_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process image.');
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const qualitySteps = [0.86, 0.76, 0.66, 0.56, 0.46];
  let bestBlob: Blob | null = null;
  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, 'image/webp', quality);
    bestBlob = blob;
    if (blob.size <= MAX_STORED_IMAGE_BYTES) break;
  }
  if (!bestBlob) throw new Error('Could not optimize image.');
  const baseName = (file.name.replace(/\.[^/.]+$/, '') || 'image').slice(0, 60);
  return new File([bestBlob], `${baseName}.webp`, { type: 'image/webp' });
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
  file_path?: string | null;
  file_name?: string | null;
  file_mime?: string | null;
  file_size_bytes?: number | null;
  type: FindType;
  visibility: Visibility;
  section_id: string | null;
  created_at: string;
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

function mapFind(row: DbFindRow, signedImageUrl?: string, signedFileUrl?: string): Find {
  const likes = (row.find_likes ?? []).map((l) => l.user_id);

  return {
    id: row.id,
    authorId: row.user_id,
    title: row.title,
    description: row.description,
    url: row.url ?? undefined,
    imageUrl: signedImageUrl,
    filePath: row.file_path ?? undefined,
    fileName: row.file_name ?? undefined,
    fileMime: row.file_mime ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    fileUrl: signedFileUrl,
    type: row.type,
    visibility: row.visibility,
    specificFriendIds: [],
    groupIds: [],
    sectionId: row.section_id ?? undefined,
    likes,
    saved: [],
    comments: [],
    createdAt: new Date(row.created_at),
  };
}

function isMissingColumnError(message: string | undefined, column: string): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  const col = column.toLowerCase();
  const escaped = col.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`column\\s+(?:\\w+\\.)?["']?${escaped}["']?\\s+does\\s+not\\s+exist`);
  return (
    re.test(normalized)
    || normalized.includes(`'${col}'`)
    || normalized.includes(`"${col}"`)
  );
}

function notifySectionsChanged() {
  window.dispatchEvent(new CustomEvent('melikeit:sections-changed'));
}

export default function MyFinds() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sections, setSections] = useState<Section[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

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

  const [showModal, setShowModal] = useState(false);
  const [dropError, setDropError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [quickLink, setQuickLink] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const [quickNoteSectionId, setQuickNoteSectionId] = useState('');
  const [quickNoteSubsectionName, setQuickNoteSubsectionName] = useState('');
  const [intakeStatus, setIntakeStatus] = useState('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const processIncomingFilesRef = useRef<(files: File[]) => void>(() => {});
  const [isGridDragging, setIsGridDragging] = useState(false);
  const gridDragCounterRef = useRef(0);
  const [friendAuthor, setFriendAuthor] = useState<User | null>(null);

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

  const viewMode = searchParams.get('view');
  const selectedFriendId = viewMode === 'friends' ? searchParams.get('friend') ?? '' : '';
  const isFriendsView = !!selectedFriendId;
  const activeSection = isFriendsView ? undefined : (searchParams.get('section') ?? undefined);

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

    const FIND_SELECT_WITH_FILES = 'id,user_id,title,description,url,image_path,preview_path,file_path,file_name,file_mime,file_size_bytes,type,visibility,section_id,created_at,find_likes(user_id)';
    const FIND_SELECT_WITH_PREVIEW = 'id,user_id,title,description,url,image_path,preview_path,type,visibility,section_id,created_at,find_likes(user_id)';
    const FIND_SELECT_LEGACY = 'id,user_id,title,description,url,image_path,type,visibility,section_id,created_at,find_likes(user_id)';

    let findsQuery = supabase
      .from('finds')
      .select(FIND_SELECT_WITH_FILES)
      .order('created_at', { ascending: false });
    if (isFriendsView && selectedFriendId) {
      findsQuery = findsQuery.eq('user_id', selectedFriendId).eq('visibility', 'all_friends');
    } else {
      findsQuery = findsQuery.eq('user_id', user.id);
    }

    const [{ data: sectionRows, error: sectionError }, { data: findRowsRaw, error: findError }] = await Promise.all([
      supabase.from('sections').select('id,user_id,name,visibility').eq('user_id', user.id).order('created_at', { ascending: true }),
      findsQuery,
    ]);

    if (sectionError) {
      setError(sectionError.message);
      setLoading(false);
      return;
    }
    if (
      findError
      && !isMissingColumnError(findError.message, 'preview_path')
      && !isMissingColumnError(findError.message, 'file_path')
      && !isMissingColumnError(findError.message, 'file_name')
      && !isMissingColumnError(findError.message, 'file_mime')
      && !isMissingColumnError(findError.message, 'file_size_bytes')
    ) {
      setError(findError.message);
      setLoading(false);
      return;
    }
    let effectiveFindRowsRaw: unknown[] | null = (findRowsRaw ?? null) as unknown[] | null;
    if (findError) {
      const fallbackSelect = isMissingColumnError(findError.message, 'preview_path')
        ? FIND_SELECT_LEGACY
        : FIND_SELECT_WITH_PREVIEW;
      let fallbackQuery = supabase
        .from('finds')
        .select(fallbackSelect)
        .order('created_at', { ascending: false });
      if (isFriendsView && selectedFriendId) {
        fallbackQuery = fallbackQuery.eq('user_id', selectedFriendId).eq('visibility', 'all_friends');
      } else {
        fallbackQuery = fallbackQuery.eq('user_id', user.id);
      }
      const { data: fallbackRows, error: fallbackError } = await fallbackQuery;
      if (fallbackError && fallbackSelect === FIND_SELECT_WITH_PREVIEW && isMissingColumnError(fallbackError.message, 'preview_path')) {
        let legacyQuery = supabase
          .from('finds')
          .select(FIND_SELECT_LEGACY)
          .order('created_at', { ascending: false });
        if (isFriendsView && selectedFriendId) {
          legacyQuery = legacyQuery.eq('user_id', selectedFriendId).eq('visibility', 'all_friends');
        } else {
          legacyQuery = legacyQuery.eq('user_id', user.id);
        }
        const { data: legacyRows, error: legacyError } = await legacyQuery;
        if (legacyError) {
          setError(legacyError.message);
          setLoading(false);
          return;
        }
        effectiveFindRowsRaw = (legacyRows ?? null) as unknown[] | null;
      } else if (fallbackError) {
        setError(fallbackError.message);
        setLoading(false);
        return;
      } else {
        effectiveFindRowsRaw = (fallbackRows ?? null) as unknown[] | null;
      }
    }

    let typedSections = (sectionRows ?? []) as unknown as DbSectionRow[];
    const typedFinds = (effectiveFindRowsRaw ?? []) as unknown as DbFindRow[];
    if (!isFriendsView && typedSections.length === 0 && typedFinds.length === 0) {
      const { data: defaultRows, error: defaultError } = await supabase
        .from('sections')
        .insert(
          DEFAULT_SECTION_NAMES.map((name) => ({
            user_id: user.id,
            name,
            visibility: 'all_friends' as const,
          }))
        )
        .select('id,user_id,name,visibility')
        .order('created_at', { ascending: true });

      if (defaultError) {
        setError(defaultError.message);
        setLoading(false);
        return;
      }
      typedSections = (defaultRows ?? []) as unknown as DbSectionRow[];
      notifySectionsChanged();
    }
    setSections(typedSections.map(mapSection));

    if (isFriendsView && selectedFriendId) {
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('id,full_name,avatar_url')
        .eq('id', selectedFriendId)
        .maybeSingle();
      setFriendAuthor(
        friendProfile
          ? {
            id: friendProfile.id as string,
            username: handleFromName(friendProfile.full_name as string),
            displayName: (friendProfile.full_name as string) || 'Friend',
            avatarUrl:
              ((friendProfile.avatar_url as string | null) ?? undefined)
              ?? `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(friendProfile.id as string)}`,
            bio: '',
          }
          : null
      );
    } else {
      setFriendAuthor(null);
    }

    const paths = typedFinds.flatMap((f) => [f.image_path, f.preview_path, f.file_path]).filter((p): p is string => !!p);
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
        return mapFind(
          row,
          pathToSign ? signedMap.get(pathToSign) : undefined,
          row.file_path ? signedMap.get(row.file_path) : undefined
        );
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedFriendId, isFriendsView]);

  const uploadImage = async (file: File) => {
    if (!user) throw new Error('Not signed in');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');
    const optimizedFile = await optimizeImageForUpload(file);
    const path = `${user.id}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from('find_images').upload(path, optimizedFile, {
      upsert: false,
      contentType: 'image/webp',
    });
    if (uploadError) throw uploadError;
    return path;
  };

  const uploadFile = async (file: File) => {
    if (!user) throw new Error('Not signed in');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');
    const safeName = (file.name || 'file')
      .replace(/[^\w.\- ]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 96);
    const path = `${user.id}/files/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('find_images').upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (uploadError) throw uploadError;
    return path;
  };

  const createFind = async (args: { title: string; description: string; url: string; sectionId: string; imageFile?: File; file?: File }) => {
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
    let filePath: string | undefined;
    if (args.file) {
      filePath = await uploadFile(args.file);
    }
    let previewPath: string | undefined;
    let previewTitle: string | undefined;
    let previewDescription: string | undefined;
    const trimmedUrl = args.url?.trim();
    if (!imagePath && trimmedUrl && !isYouTubeUrl(trimmedUrl)) {
      const { data, error: previewError } = await supabase.functions.invoke<{ previewPath: string; title?: string; description?: string }>('link-preview', {
        body: { url: trimmedUrl },
      });
      if (!previewError && data?.previewPath) {
        previewPath = data.previewPath;
        previewTitle = data.title?.trim() || undefined;
        previewDescription = data.description?.trim() || undefined;
      }
    }

    const title = args.title.trim()
      || previewTitle
      || trimmedUrl
      || (args.imageFile ? args.imageFile.name : '')
      || (args.file ? args.file.name : '')
      || 'Untitled find';
    const sectionName = resolveSectionName(args.sectionId);
    const type = inferFindType({ sectionName, url: args.url, mimeType: args.imageFile?.type ?? args.file?.type });
    const description = (args.description ?? '').trim() || previewDescription || '';

    const FIND_INSERT_SELECT_WITH_FILES = 'id,user_id,title,description,url,image_path,preview_path,file_path,file_name,file_mime,file_size_bytes,type,visibility,section_id,created_at,find_likes(user_id)';
    const FIND_INSERT_SELECT_WITH_PREVIEW = 'id,user_id,title,description,url,image_path,preview_path,type,visibility,section_id,created_at,find_likes(user_id)';
    const FIND_INSERT_SELECT_LEGACY = 'id,user_id,title,description,url,image_path,type,visibility,section_id,created_at,find_likes(user_id)';

    const { data, error: insertError } = await supabase
      .from('finds')
      .insert({
        user_id: user.id,
        title,
        description,
        url: trimmedUrl || null,
        image_path: imagePath ?? null,
        preview_path: previewPath ?? null,
        file_path: filePath ?? null,
        file_name: args.file?.name ?? null,
        file_mime: args.file?.type ?? null,
        file_size_bytes: args.file?.size ?? null,
        type,
        visibility: 'specific_friends',
        section_id: args.sectionId || null,
      })
      .select(FIND_INSERT_SELECT_WITH_FILES)
      .single();

    let insertedRowRaw = data as unknown;
    if (
      insertError
      && (
        isMissingColumnError(insertError.message, 'preview_path')
        || isMissingColumnError(insertError.message, 'file_path')
        || isMissingColumnError(insertError.message, 'file_name')
        || isMissingColumnError(insertError.message, 'file_mime')
        || isMissingColumnError(insertError.message, 'file_size_bytes')
      )
    ) {
      const baseInsert = {
        user_id: user.id,
        title,
        description,
        url: trimmedUrl || null,
        image_path: imagePath ?? null,
        type,
        visibility: 'specific_friends' as const,
        section_id: args.sectionId || null,
      };

      const fileMissing = isMissingColumnError(insertError.message, 'file_path')
        || isMissingColumnError(insertError.message, 'file_name')
        || isMissingColumnError(insertError.message, 'file_mime')
        || isMissingColumnError(insertError.message, 'file_size_bytes');
      const previewMissing = isMissingColumnError(insertError.message, 'preview_path');
      const fallbackInsert = fileMissing
        ? baseInsert
        : { ...baseInsert, preview_path: previewPath ?? null };
      const fallbackSelect = fileMissing
        ? (previewMissing ? FIND_INSERT_SELECT_LEGACY : FIND_INSERT_SELECT_WITH_PREVIEW)
        : FIND_INSERT_SELECT_WITH_PREVIEW;

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('finds')
        .insert(fallbackInsert)
        .select(fallbackSelect)
        .single();

      if (fallbackError && fallbackSelect === FIND_INSERT_SELECT_WITH_PREVIEW && isMissingColumnError(fallbackError.message, 'preview_path')) {
        const { data: legacyData, error: legacyError } = await supabase
          .from('finds')
          .insert(baseInsert)
          .select(FIND_INSERT_SELECT_LEGACY)
          .single();
        if (legacyError || !legacyData) {
          setError(legacyError?.message ?? 'Could not create find');
          return;
        }
        insertedRowRaw = legacyData;
      } else if (fallbackError || !fallbackData) {
        setError(fallbackError?.message ?? 'Could not create find');
        return;
      } else {
        insertedRowRaw = fallbackData;
      }
    } else if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create find');
      return;
    }

    const row = insertedRowRaw as DbFindRow;
    let signedImageUrl: string | undefined;
    let signedFileUrl: string | undefined;
    const pathToSign = row.image_path ?? row.preview_path;
    if (pathToSign) {
      const { data: signed } = await supabase.storage.from('find_images').createSignedUrl(pathToSign, 60 * 60);
      signedImageUrl = signed?.signedUrl;
    }
    if (row.file_path) {
      const { data: signedFile } = await supabase.storage.from('find_images').createSignedUrl(row.file_path, 60 * 60);
      signedFileUrl = signedFile?.signedUrl;
    }
    setFinds((prev) => [mapFind(row, signedImageUrl, signedFileUrl), ...prev]);
  };

  const createFromUpload = async (file: File) => {
    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        setDropError('File is too large. Maximum size is 10MB.');
        return false;
      }
      setDropError('');
      if (file.type.startsWith('image/')) {
        await createFind({ title: file.name.replace(/\.[^/.]+$/, ''), description: '', url: '', sectionId: activeSection ?? '', imageFile: file });
        return true;
      }
      await createFind({
        title: file.name.replace(/\.[^/.]+$/, '') || file.name,
        description: '',
        url: '',
        sectionId: activeSection ?? '',
        file,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add this file.';
      setDropError(`Could not add "${file.name}": ${message}`);
      return false;
    }
  };

  const processIncomingFiles = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) {
      setDropError('No supported files or links found.');
      return;
    }
    setDropError('');
    let successCount = 0;
    let failureCount = 0;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setIntakeStatus(`Processing ${index + 1}/${files.length}: ${file.name}`);
        const ok = await createFromUpload(file);
        if (ok) successCount += 1;
        else failureCount += 1;
      }
      if (successCount > 0 && failureCount === 0) {
        setIntakeStatus(`Added ${successCount} item${successCount > 1 ? 's' : ''}.`);
      } else if (successCount > 0) {
        setIntakeStatus(`Added ${successCount} item${successCount > 1 ? 's' : ''}; ${failureCount} failed.`);
      } else {
        setIntakeStatus('');
      }
    } finally {
      window.setTimeout(() => {
        setIntakeStatus('');
      }, 2200);
    }
  };

  processIncomingFilesRef.current = (files: File[]) => {
    void processIncomingFiles(files);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isFriendsView) return;
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const items = Array.from(clipboard.items ?? []);
      const filesFromItems = items
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);
      const filesFromClipboard = Array.from(clipboard.files ?? []);
      const dedupedByKey = new Map<string, File>();
      [...filesFromItems, ...filesFromClipboard].forEach((file) => {
        const key = [file.name, file.size, file.type, file.lastModified].join('|');
        dedupedByKey.set(key, file);
      });
      const pastedFiles = Array.from(dedupedByKey.values());
      if (pastedFiles.length === 0) return;
      event.preventDefault();
      processIncomingFilesRef.current(pastedFiles);
    };

    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    };
  }, [isFriendsView]);

  const normalizeUrl = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      return new URL(withProtocol).toString();
    } catch {
      return null;
    }
  };

  const submitUrl = async (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) {
      setDropError('Please paste a valid link.');
      return;
    }
    setDropError('');
    await createFind({
      title: url,
      description: '',
      url,
      sectionId: activeSection ?? '',
    });
  };

  const extractFirstUrlFromDataTransfer = (dt: DataTransfer): string | null => {
    const candidates: string[] = [];
    const uriList = dt.getData('text/uri-list');
    if (uriList) candidates.push(...uriList.split('\n').map((line) => line.trim()).filter(Boolean));
    const plain = dt.getData('text/plain');
    if (plain) candidates.push(...plain.split(/\s+/g).map((token) => token.trim()).filter(Boolean));

    for (const candidate of candidates) {
      if (candidate.startsWith('#')) continue;
      const normalized = normalizeUrl(candidate);
      if (normalized) return normalized;
    }
    return null;
  };

  useEffect(() => {
    const seen = window.localStorage.getItem('melikeit.helpSeen');
    if (seen !== '1') setShowHelp(true);
  }, []);

  useEffect(() => {
    if (!showHelp) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowHelp(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHelp]);

  const submitQuickLink = async () => {
    const raw = quickLink.trim();
    if (!raw) return;
    await submitUrl(raw);
    setQuickLink('');
  };

  const submitQuickNote = async () => {
    const raw = quickNote.trim();
    if (!raw) return;
    setQuickNoteSaving(true);
    try {
      setDropError('');
      const titleLine = raw.split('\n').find((line) => line.trim())?.trim() ?? '';
      const title = titleLine.slice(0, 80) || 'Note';
      let targetSectionId = quickNoteSectionId || activeSection || '';
      if (targetSectionId && quickNoteSubsectionName.trim()) {
        targetSectionId = await ensureSectionIdWithSubsection(targetSectionId, quickNoteSubsectionName);
      }
      await createFind({
        title,
        description: raw,
        url: '',
        sectionId: targetSectionId,
      });
      setQuickNote('');
      setQuickNoteSubsectionName('');
    } finally {
      setQuickNoteSaving(false);
    }
  };

  const updateFindInState = (findId: string, patch: { title: string; description: string; url?: string; sectionId?: string; visibility?: Visibility }) => {
    setFinds((prev) =>
      prev.map((find) =>
        find.id === findId
          ? {
            ...find,
            title: patch.title,
            description: patch.description,
            url: patch.url,
            sectionId: patch.sectionId,
            visibility: patch.visibility ?? find.visibility,
          }
          : find
      )
    );
  };

  const removeFindFromState = (findId: string) => {
    setFinds((prev) => prev.filter((find) => find.id !== findId));
  };

  const createSection = async (args: { name: string; visibility: Visibility; subsectionName?: string }): Promise<Section | null> => {
    if (!user) return null;
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return null;
    }
    const name = composeSectionLabel(args.name, args.subsectionName);
    if (!name.trim()) return null;
    const existing = mySections.find((section) => section.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;
    const { data, error: insertError } = await supabase
      .from('sections')
      .insert({ user_id: user.id, name, visibility: args.visibility })
      .select('id,user_id,name,visibility')
      .single();
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create section');
      return null;
    }
    const mapped = mapSection(data as unknown as DbSectionRow);
    setSections((prev) => [...prev, mapped]);
    notifySectionsChanged();
    return mapped;
  };

  const ensureSectionIdWithSubsection = async (sectionId: string, subsectionName: string): Promise<string> => {
    const baseSection = mySections.find((section) => section.id === sectionId);
    if (!baseSection) return sectionId;
    const { section: baseSectionName } = parseSectionLabel(baseSection.name);
    const normalizedBase = baseSectionName || baseSection.name;
    const normalizedSubsection = subsectionName.trim();
    if (!normalizedSubsection) return sectionId;

    const targetName = composeSectionLabel(normalizedBase, normalizedSubsection);
    const existing = mySections.find((section) => section.name.trim().toLowerCase() === targetName.toLowerCase());
    if (existing) return existing.id;

    const created = await createSection({
      name: normalizedBase,
      subsectionName: normalizedSubsection,
      visibility: baseSection.visibility,
    });
    return created?.id ?? sectionId;
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="font-black text-ink text-lg uppercase">Loading</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-w-0">
        {isFriendsView && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow border-2 border-ink rounded-xl shadow-retro">
            <p className="text-xs font-black text-ink uppercase tracking-wider mb-1">Friends View</p>
            <p className="text-sm font-medium text-ink leading-snug">
              Showing finds shared to friends by {friendAuthor?.displayName ?? 'your friend'}.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 sm:mb-5 p-3 bg-white border-2 border-ink rounded-xl shadow-retro">
            <p className="text-sm font-bold text-ink">Error: {error}</p>
            {error.includes("Could not find the table 'public.sections'") && (
              <p className="text-xs text-ink/70 font-medium mt-2">
                This usually means the database schema hasn’t been created yet. Run `supabase/schema.sql` in your Supabase SQL Editor, then refresh.
              </p>
            )}
          </div>
        )}

        <div className="mb-3 sm:mb-4 flex justify-end">
          <p className="w-full lg:w-[692px] text-sm sm:text-base font-black italic text-ink leading-snug">
            Joke of the day: {todaysJoke}
          </p>
        </div>

        {!isFriendsView && (
          <div className="mb-4 sm:mb-6 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:justify-end">
            <div className="w-full lg:w-[340px] retro-surface-soft rounded-xl p-3">
              <p className="text-xs font-black text-ink uppercase tracking-wider mb-2">Quick note</p>
              <select
                value={quickNoteSectionId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value !== QUICK_NOTE_NEW_SECTION_OPTION) {
                    setQuickNoteSectionId(value);
                    setQuickNoteSubsectionName('');
                    return;
                  }
                  const requestedSectionName = window.prompt('New section name');
                  if (!requestedSectionName?.trim()) {
                    setQuickNoteSectionId('');
                    return;
                  }
                  const requestedSubsectionName = window.prompt('Optional subsection name (leave blank to skip)') ?? '';
                  void (async () => {
                    const created = await createSection({
                      name: requestedSectionName,
                      subsectionName: requestedSubsectionName,
                      visibility: 'all_friends',
                    });
                    if (created) {
                      setQuickNoteSectionId(created.id);
                      const parsed = parseSectionLabel(created.name);
                      setQuickNoteSubsectionName(parsed.subsection);
                    }
                  })();
                }}
                className="w-full mb-2 px-2.5 py-1.5 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink focus:outline-none focus:border-pink"
              >
                <option value="">No section</option>
                {mySections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
                <option value={QUICK_NOTE_NEW_SECTION_OPTION}>+ Add new section</option>
              </select>
              {!!quickNoteSectionId && (
                <input
                  value={quickNoteSubsectionName}
                  onChange={(e) => setQuickNoteSubsectionName(e.target.value)}
                  placeholder="Subsection (optional)"
                  className="w-full mb-2 px-2.5 py-1.5 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                />
              )}
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Type a note… (Cmd/Ctrl + Enter to add)"
                rows={2}
                className="w-full min-h-[70px] resize-none rounded-lg border-2 border-ink bg-white px-2.5 py-1.5 text-sm font-semibold text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void submitQuickNote();
                  }
                }}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void submitQuickNote()}
                  disabled={quickNoteSaving || !quickNote.trim()}
                  className="px-2.5 py-1.5 rounded-lg border-2 border-ink bg-yellow/70 text-xs font-black text-ink shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {quickNoteSaving ? 'Adding…' : 'Add note'}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-stretch w-full lg:w-[340px]">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) void processIncomingFiles(files);
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
                  const files = e.dataTransfer.files;
                  if (files?.length) void processIncomingFiles(files);
                }}
                className={`p-3 rounded-xl border-2 border-ink text-sm font-black shadow-retro transition-all w-full ${
                  isDragging
                    ? 'bg-cyan/45 text-ink -translate-x-0.5 -translate-y-0.5 shadow-retro-lg'
                    : 'bg-pink/35 text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg'
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
                  rows={3}
                  className="w-full min-h-[72px] resize-none rounded-lg border-2 border-ink/70 retro-fill-soft px-2.5 py-1.5 text-right text-sm font-black leading-tight text-ink placeholder:text-ink/70 focus:outline-none focus:border-ink"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="px-2.5 py-1.5 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all"
                  >
                    Add manually
                  </button>
                </div>
              </div>
              {dropError && <p className="text-xs text-pink-dark mt-1 font-bold">{dropError}</p>}
              {intakeStatus && <p className="text-xs text-ink/70 mt-1 font-bold">{intakeStatus}</p>}
            </div>
          </div>
        )}

        <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <p className="text-xs font-black text-ink/50 uppercase tracking-widest">
            {finds.length} finds{isFriendsView ? ` from ${friendAuthor?.displayName ?? 'friend'}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="px-2.5 py-2 rounded-lg border-2 border-ink bg-yellow/70 text-xs font-black text-ink shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all"
              aria-label="Help"
              title="Help"
            >
              ? Help
            </button>
            <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-ink/60">Sort</label>
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

            <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-ink/60 ml-1">Grid</label>
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

        <div className="relative">
          <div
            onDragEnter={(e) => {
              if (isFriendsView) return;
              e.preventDefault();
              gridDragCounterRef.current += 1;
              setIsGridDragging(true);
            }}
            onDragOver={(e) => {
              if (isFriendsView) return;
              e.preventDefault();
              setIsGridDragging(true);
            }}
            onDragLeave={(e) => {
              if (isFriendsView) return;
              e.preventDefault();
              gridDragCounterRef.current = Math.max(0, gridDragCounterRef.current - 1);
              if (gridDragCounterRef.current === 0) setIsGridDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (isFriendsView) return;
              gridDragCounterRef.current = 0;
              setIsGridDragging(false);

              const files = e.dataTransfer.files;
              if (files?.length) {
                void processIncomingFiles(files);
                return;
              }

              const url = extractFirstUrlFromDataTransfer(e.dataTransfer);
              if (url) {
                void submitUrl(url);
                return;
              }
              setDropError('No supported files or links found.');
            }}
            className={`grid gap-6 ${
              gridMode === 'compact'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : gridMode === 'cozy'
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3'
            } items-start mt-4 sm:mt-8 ${isGridDragging ? 'outline outline-2 outline-dashed outline-ink/70 outline-offset-4' : ''}`}
          >
            {filtered.map((find) => (
              <div key={find.id}>
                <FindCard
                  find={find}
                  author={isFriendsView ? (friendAuthor ?? me) : me}
                  sections={mySections}
                  onUpdate={updateFindInState}
                  onDelete={removeFindFromState}
                  onEnsureSectionId={ensureSectionIdWithSubsection}
                />
              </div>
            ))}
          </div>

          {!isFriendsView && isGridDragging && (
            <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-dashed border-ink bg-yellow/20 grid place-items-center">
              <div className="bg-white border-2 border-ink shadow-retro px-4 py-3 rounded-xl">
                <p className="text-xs font-black uppercase tracking-wider text-ink">Drop to add finds (images, links, or files)</p>
              </div>
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-ink/30 rounded-xl">
            <p className="font-black text-ink text-lg uppercase">No finds here</p>
            <p className="text-sm text-ink/60 mt-1">
              {isFriendsView ? 'This friend has not shared any finds yet.' : 'Add a new find and assign it here.'}
            </p>
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

    {showHelp && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-ink/50" onClick={() => setShowHelp(false)} />
        <div className="help-pop-in relative w-full max-w-md max-h-[90vh] bg-white/90 backdrop-blur-[1px] border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
          <div className="px-4 sm:px-5 py-4 bg-yellow border-b-2 border-ink flex items-center justify-between">
            <h2 className="text-sm font-black text-ink uppercase tracking-wide">Add finds fast</h2>
            <button
              onClick={() => setShowHelp(false)}
              className="px-2 py-1 rounded-lg border-2 border-ink bg-white text-xs font-black text-ink hover:bg-yellow transition-colors"
            >
              Close
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-3 text-sm text-ink/80 overflow-y-auto max-h-[calc(90vh-64px)]">
            <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
              <li>Drop screenshots, links, or files anywhere on the grid</li>
              <li>Paste screenshot: Cmd/Ctrl+V</li>
              <li>Type/paste a link in +Add Finds and press Enter</li>
              <li>Quick note: Cmd/Ctrl+Enter</li>
              <li>Card buttons: D=Details, pencil=Edit</li>
            </ul>
            <button
              onClick={() => {
                window.localStorage.setItem('melikeit.helpSeen', '1');
                setShowHelp(false);
              }}
              className="w-full mt-2 px-4 py-3 rounded-xl border-2 border-ink bg-pink text-ink font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
