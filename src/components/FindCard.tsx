import { useEffect, useState } from 'react';
import { FileText, Pencil } from 'lucide-react';
import type { Find, User, FindType, Section } from '../data/mockData';
import { useAuth } from '../auth/useAuth';
import { getSupabase } from '../supabase/client';

const TYPE_DOT: Record<FindType, string> = {
  article: '#FF4D9E',
  product: '#FFE500',
  place:   '#00C9D4',
  video:   '#FF6B35',
  music:   '#A855F7',
  recipe:  '#22C55E',
  other:   '#9CA3AF',
};

const TYPE_LABELS: Record<FindType, string> = {
  article: 'ARTICLE',
  product: 'PRODUCT',
  place:   'PLACE',
  video:   'VIDEO',
  music:   'MUSIC',
  recipe:  'RECIPE',
  other:   'OTHER',
};

interface FindCardProps {
  find: Find;
  author: User;
  sections?: Section[];
  onUpdate?: (findId: string, patch: { title: string; description: string; url?: string; sectionId?: string }) => void;
  onDelete?: (findId: string) => void;
}

function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ?? null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoParam = parsed.searchParams.get('v');
      if (videoParam) return videoParam;

      const parts = parsed.pathname.split('/').filter(Boolean);
      const markerIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
      if (markerIndex >= 0 && parts[markerIndex + 1]) return parts[markerIndex + 1];
    }
  } catch {
    return null;
  }
  return null;
}

export default function FindCard({ find, author, sections = [], onUpdate, onDelete }: FindCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [erroredPreviewUrl, setErroredPreviewUrl] = useState('');
  const [erroredVideoThumbUrl, setErroredVideoThumbUrl] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(() => find.title);
  const [editDescription, setEditDescription] = useState(() => find.description);
  const [editUrl, setEditUrl] = useState(() => find.url ?? '');
  const [editSectionId, setEditSectionId] = useState(() => find.sectionId ?? '');
  const { user } = useAuth();
  const [likes, setLikes] = useState<string[]>(() => find.likes);
  const [comments, setComments] = useState(() => find.comments);
  const [nowMs, setNowMs] = useState<number>(() => find.createdAt.getTime());

  const timeAgo = (date: Date) => {
    const diff = nowMs - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  const dot = TYPE_DOT[find.type];
  const currentUserId = user?.id ?? '';
  const liked = !!currentUserId && likes.includes(currentUserId);
  const canEdit = !!currentUserId && currentUserId === find.authorId;
  const displayTitle = find.title.trim() || TYPE_LABELS[find.type];
  const youtubeId = getYouTubeVideoId(find.url);
  const videoThumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '';
  const linkPreviewUrl = find.url ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(find.url)}?w=1200&h=800` : '';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNowMs(Date.now()), 0);
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="border-2 border-ink bg-[#f0f0f0] shadow-retro overflow-hidden">
      <div className="bg-[#f8f8f8] border-b-2 border-ink px-3 py-2 flex items-center gap-2 select-none">
        <div className="w-4 h-4 border border-ink/20 shrink-0" style={{ backgroundColor: dot }} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink truncate max-w-[42%]">
          {displayTitle}
        </span>
        <div
          className="flex-1 h-[10px] border-y border-ink/80"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 1px, #111 1px, #111 2px)' }}
        />
        <div className="w-6 h-6 border-2 border-ink bg-[#ececec] grid place-items-center">
          <div className="w-2.5 h-2.5 border border-ink/80" />
        </div>
      </div>

      <div className="relative border-b-2 border-ink bg-black">
        {find.imageUrl ? (
          <img
            src={find.imageUrl}
            alt={displayTitle}
            className="block w-full h-56 object-cover"
          />
        ) : videoThumbnailUrl && erroredVideoThumbUrl !== videoThumbnailUrl ? (
          <img
            src={videoThumbnailUrl}
            alt={displayTitle}
            className="block w-full h-56 object-cover"
            loading="lazy"
            onError={() => setErroredVideoThumbUrl(videoThumbnailUrl)}
          />
        ) : find.url && erroredPreviewUrl !== find.url ? (
          <img
            src={linkPreviewUrl}
            alt={displayTitle}
            className="block w-full h-56 object-cover"
            loading="lazy"
            onError={() => setErroredPreviewUrl(find.url ?? '')}
          />
        ) : (
          <div
            className="h-56 w-full grid place-items-center text-white"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16), transparent 35%), linear-gradient(135deg, #2d2d2d 0%, #111 65%, #1a1a1a 100%)',
            }}
          >
            <div className="text-center px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 border-2 border-white/80 rounded-lg mb-2">
                <FileText size={20} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider">
                {find.type === 'article' ? 'Article Preview Unavailable' : 'Preview Unavailable'}
              </p>
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
            Open Link
          </a>
        )}
      </div>

      <div className="bg-[#efefef] p-3">
        <div className="flex items-center justify-between mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/80">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-ink/30" style={{ backgroundColor: dot }} />
            {TYPE_LABELS[find.type]}
          </span>
          <span>{timeAgo(find.createdAt)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={author.avatarUrl}
              alt={author.displayName}
              className="rounded-full shrink-0 w-5 h-5 border border-ink/30"
            />
            <span className="text-xs font-bold text-ink/70 truncate">
              @{author.username}
            </span>
          </div>

          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`px-2 py-1 border-2 border-ink text-[11px] font-black uppercase tracking-wider ${
                showDetails ? 'bg-cyan text-ink' : 'bg-white text-ink'
              }`}
            >
              D
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  setShowDetails(true);
                  setIsEditing(true);
                  setSaveStatus('');
                  setSaveError('');
                  setEditTitle(find.title);
                  setEditDescription(find.description);
                  setEditUrl(find.url ?? '');
                  setEditSectionId(find.sectionId ?? '');
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 border-2 border-ink bg-yellow text-[11px] font-black uppercase tracking-wider text-ink"
                aria-label="Edit details"
                title="Edit details"
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
            <button
              onClick={() => setShowComments(!showComments)}
              className="px-2 py-1 border-2 border-ink bg-white text-[11px] font-black uppercase tracking-wider text-ink"
            >
              C {comments.length}
            </button>
            <button
              onClick={async () => {
                if (!currentUserId) return;
                const supabase = getSupabase();
                if (!supabase) return;
                if (liked) {
                  setLikes((prev) => prev.filter((id) => id !== currentUserId));
                  await supabase.from('find_likes').delete().eq('find_id', find.id).eq('user_id', currentUserId);
                } else {
                  setLikes((prev) => [...prev, currentUserId]);
                  await supabase.from('find_likes').insert({ find_id: find.id, user_id: currentUserId });
                }
              }}
              className={`px-2 py-1 border-2 border-ink text-[11px] font-black uppercase tracking-wider ${
                liked ? 'bg-pink text-ink' : 'bg-white text-ink'
              }`}
            >
              L {likes.length}
            </button>
          </div>
        </div>

        <p className="text-sm font-medium leading-snug text-ink/85 line-clamp-3">
          {find.description || 'No description added yet.'}
        </p>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-ink/20 space-y-2">
            {!isEditing ? (
              <>
                <p className="text-xs font-bold text-ink/70 uppercase tracking-wider">Full details</p>
                <p className="text-sm font-medium leading-snug text-ink/90 whitespace-pre-wrap">
                  {find.description || 'No description added yet.'}
                </p>
                {find.url && (
                  <a
                    href={find.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-black text-ink underline break-all"
                  >
                    {find.url}
                  </a>
                )}
                {canEdit && (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setSaveStatus('');
                        setSaveError('');
                        setEditTitle(find.title);
                        setEditDescription(find.description);
                        setEditUrl(find.url ?? '');
                        setEditSectionId(find.sectionId ?? '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-ink bg-yellow text-[11px] font-black uppercase tracking-wider text-ink"
                    >
                      <Pencil size={12} />
                      Edit Details
                    </button>
                  </div>
                )}
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!currentUserId) return;
                  const supabase = getSupabase();
                  if (!supabase) {
                    setSaveError('Supabase is not configured.');
                    return;
                  }
                  const nextTitle = editTitle.trim() || 'Untitled find';
                  const nextDescription = editDescription.trim();
                  const rawUrl = editUrl.trim();
                  const nextUrl = rawUrl ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`) : null;
                  if (nextUrl) {
                    try {
                      new URL(nextUrl);
                    } catch {
                      setSaveError('Please enter a valid URL.');
                      setSaveStatus('');
                      return;
                    }
                  }

                  setSaving(true);
                  setSaveError('');
                  setSaveStatus('');
                  const { error } = await supabase
                    .from('finds')
                    .update({
                      title: nextTitle,
                      description: nextDescription,
                      url: nextUrl,
                      section_id: editSectionId || null,
                    })
                    .eq('id', find.id)
                    .eq('user_id', currentUserId);
                  setSaving(false);

                  if (error) {
                    setSaveError(error.message);
                    return;
                  }

                  onUpdate?.(find.id, {
                    title: nextTitle,
                    description: nextDescription,
                    url: nextUrl ?? undefined,
                    sectionId: editSectionId || undefined,
                  });
                  setSaveStatus('Saved.');
                  setIsEditing(false);
                }}
                className="space-y-2"
              >
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-2 py-1.5 rounded-none bg-white border-2 border-ink text-xs text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  rows={4}
                  className="w-full px-2 py-1.5 rounded-none bg-white border-2 border-ink text-xs text-ink placeholder-ink/40 focus:outline-none focus:border-pink resize-y"
                />
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="Link (optional)"
                  className="w-full px-2 py-1.5 rounded-none bg-white border-2 border-ink text-xs text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                />
                <select
                  value={editSectionId}
                  onChange={(e) => setEditSectionId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-none bg-white border-2 border-ink text-xs text-ink focus:outline-none focus:border-pink"
                >
                  <option value="">No section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-2.5 py-1 border-2 border-ink bg-yellow text-[11px] font-black uppercase tracking-wider text-ink"
                  >
                    {saving ? 'Saving' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveStatus('');
                      setSaveError('');
                    }}
                    className="px-2.5 py-1 border-2 border-ink bg-white text-[11px] font-black uppercase tracking-wider text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUserId) return;
                      const firstConfirm = window.confirm('Delete this find?');
                      if (!firstConfirm) return;
                      const secondConfirm = window.confirm('Confirm again: this delete is permanent. Continue?');
                      if (!secondConfirm) return;

                      const supabase = getSupabase();
                      if (!supabase) {
                        setSaveError('Supabase is not configured.');
                        return;
                      }
                      setSaving(true);
                      setSaveError('');
                      setSaveStatus('');
                      const { error } = await supabase
                        .from('finds')
                        .delete()
                        .eq('id', find.id)
                        .eq('user_id', currentUserId);
                      setSaving(false);
                      if (error) {
                        setSaveError(error.message);
                        return;
                      }
                      onDelete?.(find.id);
                    }}
                    disabled={saving}
                    className="px-2.5 py-1 border-2 border-ink bg-pink text-[11px] font-black uppercase tracking-wider text-ink disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-[11px] font-bold text-ink/60">Delete requires two confirmations.</p>
                {saveError && <p className="text-xs font-bold text-pink-dark">{saveError}</p>}
              </form>
            )}
            {saveStatus && <p className="text-xs font-bold text-ink/70">{saveStatus}</p>}
          </div>
        )}

        {showComments && (
          <div className="mt-3 pt-3 space-y-2 border-t border-ink/20">
            {comments.map((comment) => (
              <div key={comment.id} className="text-xs leading-snug text-ink/80">
                <span className="font-black">
                  {comment.authorId === currentUserId ? 'me' : comment.authorId}:
                </span>{' '}
                {comment.text}
              </div>
            ))}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!currentUserId) return;
                const supabase = getSupabase();
                if (!supabase) return;
                const text = commentText.trim();
                if (!text) return;
                setCommentText('');
                const optimistic = { id: `cm_${Date.now()}`, authorId: currentUserId, text, createdAt: new Date() };
                setComments((prev) => [...prev, optimistic]);
                const { data, error } = await supabase
                  .from('find_comments')
                  .insert({ find_id: find.id, user_id: currentUserId, text })
                  .select('id, user_id, text, created_at')
                  .single();
                if (error || !data) return;
                setComments((prev) =>
                  prev.map((c) =>
                    c.id === optimistic.id
                      ? { id: data.id as string, authorId: data.user_id as string, text: data.text as string, createdAt: new Date(data.created_at as string) }
                      : c
                  )
                );
              }}
              className="flex gap-2 pt-1"
            >
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-2 py-1 rounded-none bg-white border-2 border-ink text-xs text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
              />
              <button
                type="submit"
                className="px-2.5 py-1 border-2 border-ink bg-yellow text-xs font-black"
              >
                Send
              </button>
            </form>
          </div>
        )}

        <div className="flex justify-between mt-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink/60 border-t border-ink/20">
          <span>{find.visibility === 'specific_friends' ? 'Selective' : 'All Friends'}</span>
          <span>{TYPE_LABELS[find.type]}</span>
        </div>
      </div>
    </div>
  );
}
