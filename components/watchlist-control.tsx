"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useWatchlist } from "@/components/app-providers";
import {
  pinValidationError,
  usernameValidationError,
} from "@/lib/auth/validation";
import type { WatchlistItem } from "@/lib/watchlist/types";

interface WatchlistControlProps {
  theme?: "light" | "dark";
  accent?: "lime" | "coral";
}

function artworkFor(item: WatchlistItem) {
  if ("artist" in item) return item.artworkUrl;
  if ("author" in item) return item.coverUrl;
  return item.posterUrl;
}

export function WatchlistControl({
  theme = "light",
  accent = "lime",
}: WatchlistControlProps) {
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const {
    entries,
    loading: watchlistLoading,
    remove,
    clear,
  } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dark = theme === "dark";

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    setConfirmClear(false);
    setMessage("");
  }, [open, entries.length, mode]);

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    const validationError =
      usernameValidationError(username) ?? pinValidationError(pin);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") await login(username, pin);
      else await register(username, pin);
      setPin("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage("");
    try {
      await logout();
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(mediaKey: string) {
    setMessage("");
    try {
      await remove(mediaKey);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not remove this pick.",
      );
    }
  }

  async function clearEntries() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await clear();
      setConfirmClear(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not clear saved picks.",
      );
    } finally {
      setBusy(false);
    }
  }

  const triggerLabel = authLoading
    ? "Profile"
    : user
      ? `${user.username}${entries.length > 0 ? ` · ${entries.length}` : ""}`
      : "Sign in";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={authLoading}
        className={`min-h-11 max-w-40 truncate rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition disabled:opacity-50 ${
          dark
            ? "border-white/15 bg-white/4 text-white/75 hover:bg-white/10"
            : "border-black/15 bg-white/40 text-black/65 hover:bg-white"
        }`}
        aria-expanded={open}
        aria-controls="profile-and-watchlist"
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="pf-drawer-backdrop" onClick={() => setOpen(false)}>
          <aside
            id="profile-and-watchlist"
            onClick={(e) => e.stopPropagation()}
            aria-label={user ? "Profile and saved picks" : "Sign in"}
            className={`pf-drawer-panel ${
              dark
                ? "border-white/15 bg-[#141613] text-white"
                : "border-black/15 bg-[var(--paper)] text-black"
            }`}
          >
            <div className="pf-sheet-handle-bar sm:hidden">
              <div className="pf-sheet-handle" />
            </div>

            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h2 className="display-serif text-xl font-bold">
                {user ? `Profile & Saved Picks` : `Account Access`}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pf-sheet-close"
                aria-label="Close profile drawer"
              >
                ✕
              </button>
            </div>

            {!user ? (
              <form onSubmit={submitCredentials} className="p-6">
                <div
                  className={`mb-5 grid grid-cols-2 border ${
                    dark ? "border-white/12" : "border-black/12"
                  }`}
                >
                  {(["login", "register"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.13em] ${
                        mode === value
                          ? dark
                            ? "bg-white text-black"
                            : "bg-[var(--ink)] text-white"
                          : dark
                            ? "text-white/40"
                            : "text-black/45"
                      }`}
                    >
                      {value === "login" ? "Sign in" : "Create user"}
                    </button>
                  ))}
                </div>

                <h3 className="display-serif text-2xl font-bold">
                  {mode === "login" ? "Welcome back." : "Create your profile."}
                </h3>
                <p
                  className={`mt-2 text-xs leading-5 ${
                    dark ? "text-white/45" : "text-black/50"
                  }`}
                >
                  This profile and its saved picks stay on this device. There is
                  no email or PIN recovery, so choose something memorable.
                </p>

                <label
                  htmlFor={`${theme}-profile-username`}
                  className={`mb-1.5 mt-5 block text-[9px] font-black uppercase tracking-[0.15em] ${
                    dark ? "text-white/40" : "text-black/45"
                  }`}
                >
                  Username
                </label>
                <input
                  id={`${theme}-profile-username`}
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={24}
                  required
                  className={`w-full border px-3 py-3 text-sm rounded-md ${
                    dark
                      ? "border-white/15 bg-white/5 text-white"
                      : "border-black/15 bg-white/55"
                  }`}
                />

                <label
                  htmlFor={`${theme}-profile-pin`}
                  className={`mb-1.5 mt-4 block text-[9px] font-black uppercase tracking-[0.15em] ${
                    dark ? "text-white/40" : "text-black/45"
                  }`}
                >
                  PIN · 4–8 digits
                </label>
                <input
                  id={`${theme}-profile-pin`}
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  minLength={4}
                  maxLength={8}
                  pattern="[0-9]{4,8}"
                  required
                  aria-describedby={`${theme}-profile-note`}
                  className={`w-full border px-3 py-3 text-sm tracking-[0.25em] rounded-md ${
                    dark
                      ? "border-white/15 bg-white/5 text-white"
                      : "border-black/15 bg-white/55"
                  }`}
                />

                <button
                  type="submit"
                  disabled={busy}
                  className={`mt-6 w-full rounded-md px-4 py-3.5 text-xs font-black uppercase tracking-[0.14em] transition disabled:opacity-50 ${
                    dark
                      ? accent === "coral"
                        ? "bg-[var(--coral)] text-black"
                        : "bg-[var(--lime)] text-black"
                      : "bg-[var(--ink)] text-white"
                  }`}
                >
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in"
                      : "Create and sign in"}
                </button>

                <p
                  id={`${theme}-profile-note`}
                  className={`mt-4 text-[9px] leading-4 ${
                    dark ? "text-white/30" : "text-black/38"
                  }`}
                >
                  The PIN is salted and hashed. This lightweight profile is for
                  saved picks, not sensitive personal data.
                </p>
                {message && (
                  <p className="mt-3 text-xs leading-5 text-[#d9574f]" role="alert">
                    {message}
                  </p>
                )}
              </form>
            ) : (
              <div className="flex flex-col h-[calc(100%-4rem)]">
                <div
                  className={`flex items-center justify-between gap-4 border-b p-5 ${
                    dark ? "border-white/10" : "border-black/10"
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-[9px] font-black uppercase tracking-[0.14em] ${
                        dark ? "text-white/35" : "text-black/40"
                      }`}
                    >
                      Signed in as
                    </p>
                    <h3 className="display-serif truncate text-2xl font-bold">
                      {user.username}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={busy}
                    className={`px-3 py-1.5 border rounded-full text-[9px] font-black uppercase tracking-[0.12em] transition disabled:opacity-50 ${
                      dark
                        ? "border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                        : "border-black/20 text-black/70 hover:bg-black/10 hover:text-black"
                    }`}
                  >
                    Sign out
                  </button>
                </div>

                {watchlistLoading ? (
                  <p
                    className={`px-5 py-12 text-center text-sm ${
                      dark ? "text-white/45" : "text-black/50"
                    }`}
                  >
                    Loading saved picks…
                  </p>
                ) : entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
                    <span className="text-3xl mb-3 opacity-40">◇</span>
                    <p
                      className={`text-sm max-w-xs ${
                        dark ? "text-white/45" : "text-black/50"
                      }`}
                    >
                      Your saved list is empty. Draw media and click "Save pick" to keep items here.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    <ul className="flex-1 overflow-y-auto divide-y divide-white/8 p-2">
                      {entries.map(({ item }) => {
                        const artwork = artworkFor(item);
                        return (
                          <li
                            key={item.mediaKey}
                            className={`grid grid-cols-[3.5rem_1fr_auto] items-center gap-3.5 p-3 rounded-lg hover:bg-white/5 transition`}
                          >
                            {artwork ? (
                              <img
                                src={artwork}
                                alt=""
                                className="size-14 rounded object-cover shadow-sm"
                              />
                            ) : (
                              <span
                                className={`grid size-14 place-items-center rounded text-xl font-black ${
                                  dark
                                    ? accent === "coral"
                                      ? "bg-white/8 text-[var(--coral)]"
                                      : "bg-white/8 text-[var(--lime)]"
                                    : "bg-black/8 text-black/45"
                                }`}
                                aria-hidden="true"
                              >
                                {item.mediaType === "track" ||
                                item.mediaType === "album"
                                  ? "♪"
                                  : item.mediaType === "book"
                                    ? "B"
                                    : "◆"}
                              </span>
                            )}
                            <div className="min-w-0">
                              {item.externalUrl ? (
                                <a
                                  href={item.externalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block truncate text-sm font-bold hover:underline"
                                >
                                  {item.title}
                                </a>
                              ) : (
                                <p className="truncate text-sm font-bold">
                                  {item.title}
                                </p>
                              )}
                              <p
                                className={`mt-1 truncate text-[10px] font-bold uppercase tracking-[0.1em] ${
                                  dark ? "text-white/40" : "text-black/45"
                                }`}
                              >
                                {item.mediaType === "track" ||
                                item.mediaType === "album"
                                  ? item.artist
                                  : item.mediaType === "book"
                                    ? item.author
                                    : `${item.category}${item.year ? ` · ${item.year}` : ""}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEntry(item.mediaKey)}
                              className={`grid size-8 place-items-center rounded-full text-base transition ${
                                dark
                                  ? "text-white/35 hover:bg-white/10 hover:text-white"
                                  : "text-black/35 hover:bg-black/10 hover:text-black"
                              }`}
                              aria-label={`Remove ${item.title} from saved picks`}
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="p-4 border-t border-white/10 bg-black/20">
                      <button
                        type="button"
                        onClick={clearEntries}
                        disabled={busy}
                        className={`w-full py-2.5 rounded text-[10px] font-black uppercase tracking-[0.12em] transition disabled:opacity-50 ${
                          confirmClear
                            ? "bg-[#a02e29] text-white"
                            : dark
                              ? "text-white/40 hover:bg-white/8 hover:text-white"
                              : "text-black/40 hover:bg-black/5 hover:text-black"
                        }`}
                      >
                        {confirmClear ? "Confirm clear all" : "Clear all saved picks"}
                      </button>
                    </div>
                  </div>
                )}
                {message && (
                  <p className="px-5 pb-4 text-xs text-[#d9574f]" role="alert">
                    {message}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
