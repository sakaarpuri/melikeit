import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5]">
        <div className="bg-white border-2 border-ink shadow-retro px-5 py-4 rounded-xl">
          <p className="text-sm font-bold text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setBusy(true);
      try {
        if (mode === 'sign_in') {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) setError(error.message);
        } else {
          const { error } = await supabase.auth.signUp({ email, password });
          if (error) setError(error.message);
        }
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6">
        <div className="w-full max-w-md bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-yellow border-b-2 border-ink">
            <h1 className="text-xl font-black text-ink uppercase tracking-wide">Sign in</h1>
            <p className="text-sm text-ink/60 font-medium mt-1">Private finds, synced online.</p>
          </div>
          <div className="p-5">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode('sign_in')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 border-ink text-xs font-black uppercase tracking-wider ${
                  mode === 'sign_in' ? 'bg-pink text-ink shadow-retro' : 'bg-white text-ink hover:bg-yellow'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('sign_up')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 border-ink text-xs font-black uppercase tracking-wider ${
                  mode === 'sign_up' ? 'bg-pink text-ink shadow-retro' : 'bg-white text-ink hover:bg-yellow'
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
                required
                minLength={6}
              />
              <button
                disabled={busy}
                className="w-full px-4 py-3 rounded-xl border-2 border-ink bg-pink text-ink font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                {busy ? 'Please wait...' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
              </button>
              {error && <p className="text-xs font-bold text-pink-dark">{error}</p>}
              {mode === 'sign_up' && (
                <p className="text-xs text-ink/60 font-medium">
                  You may need to confirm your email depending on Supabase Auth settings.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
