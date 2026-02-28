import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="bg-white border-2 border-ink shadow-retro px-5 py-4 rounded-xl max-w-sm w-full">
        <p className="text-sm font-black text-ink uppercase tracking-wide">Completing sign-in...</p>
        <p className="text-xs font-medium text-ink/70 mt-1">Please wait while we verify your email.</p>
      </div>
    </div>
  );
}
