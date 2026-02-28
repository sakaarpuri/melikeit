import { useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { useAuth } from './useAuth';

function isStrongEnoughSignupPassword(password: string): boolean {
  // At least 6 chars, and at least one number or symbol.
  return /^(?=.{6,})(?=.*(\d|[^A-Za-z0-9])).*$/.test(password);
}

function needsNameSetup(fullName: string): boolean {
  const trimmed = fullName.trim();
  return !trimmed || trimmed.includes('@');
}

function resolveAuthRedirectUrl(): string {
  const fallback = `${window.location.origin}/auth/callback`;
  const configured = (import.meta.env.VITE_SUPABASE_REDIRECT_URL as string | undefined)?.trim();
  if (!configured) return fallback;

  try {
    const configuredUrl = new URL(configured, window.location.origin);
    const currentUrl = new URL(window.location.origin);
    const configuredHost = configuredUrl.hostname.toLowerCase();
    const currentHost = currentUrl.hostname.toLowerCase();
    const configuredIsLocal = configuredHost === 'localhost' || configuredHost === '127.0.0.1';
    const currentIsLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';

    if (!currentIsLocal && configuredIsLocal) return fallback;
    if (currentUrl.protocol === 'https:' && configuredUrl.protocol !== 'https:') return fallback;

    return configuredUrl.toString();
  } catch {
    return fallback;
  }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signupEmailSent, setSignupEmailSent] = useState(false);
  const [resetStatus, setResetStatus] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [name, setName] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5]">
        <div className="bg-white border-2 border-ink shadow-retro px-5 py-4 rounded-xl">
          <p className="text-sm font-bold text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? '';
  if (user && needsNameSetup(fullName)) {
    const saveName = async (e: React.FormEvent) => {
      e.preventDefault();
      setNameError('');
      const trimmed = name.trim();
      if (!trimmed) {
        setNameError('Please enter your name.');
        return;
      }
      const supabase = getSupabase();
      if (!supabase) {
        setNameError('Supabase is not configured.');
        return;
      }
      setNameBusy(true);
      try {
        const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
        if (error) setNameError(error.message);
      } finally {
        setNameBusy(false);
      }
    };

    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6">
        <div className="w-full max-w-md bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-yellow border-b-2 border-ink">
            <h1 className="text-xl font-black text-ink uppercase tracking-wide">One more thing</h1>
            <p className="text-sm text-ink/60 font-medium mt-1">What should we call you?</p>
          </div>
          <form onSubmit={saveName} className="p-5 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink"
              required
            />
            <button
              disabled={nameBusy}
              className="w-full px-4 py-3 rounded-xl border-2 border-ink bg-pink text-ink font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {nameBusy ? 'Saving...' : 'Continue'}
            </button>
            {nameError && <p className="text-xs font-bold text-pink-dark">{nameError}</p>}
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    if (!isSupabaseConfigured()) {
      return (
        <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6">
          <div className="w-full max-w-lg bg-white border-2 border-ink shadow-retro-lg rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-yellow border-b-2 border-ink">
              <h1 className="text-xl font-black text-ink uppercase tracking-wide">Missing Supabase Config</h1>
              <p className="text-sm text-ink/60 font-medium mt-1">
                This build is missing `VITE_SUPABASE_URL` and/or `VITE_SUPABASE_ANON_KEY`.
              </p>
            </div>
            <div className="p-5 space-y-3 text-sm text-ink/80">
              <p className="font-bold text-ink">Fix (Netlify):</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Site settings → Environment variables: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`</li>
                <li>Trigger a new deploy (Vite inlines env vars at build time).</li>
              </ol>
              <p className="text-xs text-ink/60">Local dev: create `.env.local` with those variables and restart `npm run dev`.</p>
            </div>
          </div>
        </div>
      );
    }

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setResetStatus('');
      setBusy(true);
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
          return;
        }
        const emailRedirectTo = resolveAuthRedirectUrl();
        if (mode === 'sign_in') {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) setError(error.message);
        } else {
          if (!isStrongEnoughSignupPassword(password)) {
            setError('Password must be at least 6 characters and include a number or symbol.');
            return;
          }
          const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
          if (error) {
            setError(error.message);
            return;
          }
          setSignupEmailSent(true);
          setPassword('');
        }
      } finally {
        setBusy(false);
      }
    };

    const sendPasswordReset = async () => {
      setError('');
      setResetStatus('');
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError('Enter your email first, then click Forgot password.');
        return;
      }
      const supabase = getSupabase();
      if (!supabase) {
        setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }
      const emailRedirectTo = resolveAuthRedirectUrl();
      setResetBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: emailRedirectTo });
        if (error) {
          setError(error.message);
          return;
        }
        setResetStatus('Password reset email sent.');
      } finally {
        setResetBusy(false);
      }
    };

    const switchMode = (nextMode: 'sign_in' | 'sign_up') => {
      setMode(nextMode);
      setPassword('');
      setError('');
      setResetStatus('');
      setSignupEmailSent(false);
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
                onClick={() => switchMode('sign_in')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 border-ink text-xs font-black uppercase tracking-wider ${
                  mode === 'sign_in' ? 'bg-pink text-ink shadow-retro' : 'bg-white text-ink hover:bg-yellow'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('sign_up')}
                className={`px-2 py-1.5 rounded-lg border-2 border-ink text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                  mode === 'sign_up' ? 'bg-pink text-ink shadow-retro' : 'bg-white text-ink hover:bg-yellow'
                }`}
              >
                Sign up
              </button>
            </div>

            {mode === 'sign_up' && signupEmailSent ? (
              <div className="space-y-3">
                <div className="border-2 border-ink rounded-xl bg-white shadow-retro p-4">
                  <p className="text-sm font-black text-ink uppercase tracking-wide">Confirmation email sent</p>
                  <p className="text-sm text-ink/70 font-medium mt-1">
                    Check <span className="font-bold">{email}</span> and click the confirmation link. You’ll be signed in and returned here.
                  </p>
                </div>
                <button
                  onClick={() => {
                    switchMode('sign_in');
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-ink bg-yellow text-ink font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all"
                >
                  Back to sign in
                </button>
                {error && <p className="text-xs font-bold text-pink-dark">{error}</p>}
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="space-y-3"
              >
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
                {mode === 'sign_in' && (
                  <button
                    type="button"
                    onClick={sendPasswordReset}
                    disabled={resetBusy}
                    className="text-xs font-black text-ink/70 hover:text-ink disabled:opacity-60"
                  >
                    {resetBusy ? 'Sending reset...' : 'Forgot password?'}
                  </button>
                )}
                <button
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-xl border-2 border-ink bg-pink text-ink font-black shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {busy ? 'Please wait...' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
                </button>
                {error && <p className="text-xs font-bold text-pink-dark">{error}</p>}
                {resetStatus && <p className="text-xs font-bold text-ink/70">{resetStatus}</p>}
                {mode === 'sign_up' && (
                  <p className="text-xs text-ink/60 font-medium">
                    Password must be at least 6 characters and include a number or symbol.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
