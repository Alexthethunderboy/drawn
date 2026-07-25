"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export function AuthControl() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;

    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    setMessage(
      error ? error.message : "Check your inbox for the sign-in link.",
    );
  }

  async function signOut() {
    setBusy(true);
    await supabase?.auth.signOut();
    setBusy(false);
    setOpen(false);
  }

  if (!isSupabaseConfigured()) {
    return (
      <span
        className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-black/45"
        title="Add the Supabase environment variables to enable authentication and saving."
      >
        Watchlist setup
      </span>
    );
  }

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex max-w-48 items-center gap-2 rounded-full border border-black/15 bg-white/40 px-3 py-1.5 text-xs font-bold"
          aria-expanded={open}
        >
          <span className="size-2 rounded-full bg-[var(--acid)] ring-1 ring-black/30" />
          <span className="truncate">{user.email}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-20 w-56 border border-black/15 bg-[var(--paper)] p-3 shadow-xl">
            <p className="mb-3 truncate text-xs text-black/55">{user.email}</p>
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              className="w-full bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] text-white disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-black/20 bg-white/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-white"
        aria-expanded={open}
      >
        Sign in
      </button>
      {open && (
        <form
          onSubmit={sendMagicLink}
          className="absolute right-0 top-12 z-20 w-[min(21rem,calc(100vw-2rem))] border border-black/15 bg-[var(--paper)] p-4 shadow-2xl"
        >
          <p className="display-serif mb-1 text-xl font-bold">
            Keep the good ones.
          </p>
          <p className="mb-4 text-xs leading-relaxed text-black/55">
            We’ll email a magic sign-in link. No password required.
          </p>
          <label htmlFor="auth-email" className="sr-only">
            Email address
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mb-2 w-full border border-black/20 bg-white/50 px-3 py-2.5 text-sm placeholder:text-black/35"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[var(--ink)] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.13em] text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a link"}
          </button>
          {message && (
            <p className="mt-3 text-xs leading-relaxed text-black/65">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
