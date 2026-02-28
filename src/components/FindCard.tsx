import { useEffect, useState } from 'react';
import type { Find, User, FindType } from '../data/mockData';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabase/client';

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
}

export default function FindCard({ find, author }: FindCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
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
  const displayTitle = find.title.trim() || TYPE_LABELS[find.type];

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
        ) : (
          <div
            className="h-56 w-full"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16), transparent 35%), linear-gradient(135deg, #2d2d2d 0%, #111 65%, #1a1a1a 100%)',
            }}
          />
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
              onClick={() => setShowComments(!showComments)}
              className="px-2 py-1 border-2 border-ink bg-white text-[11px] font-black uppercase tracking-wider text-ink"
            >
              C {comments.length}
            </button>
            <button
              onClick={async () => {
                if (!currentUserId) return;
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
