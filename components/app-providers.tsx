"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthResponse, AuthUser } from "@/lib/auth/types";
import {
  clearLegacyWatchlist,
  readLegacyWatchlist,
} from "@/lib/watchlist/local";
import type {
  WatchlistEntry,
  WatchlistItem,
} from "@/lib/watchlist/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(username: string, pin: string): Promise<void>;
  register(username: string, pin: string): Promise<void>;
  logout(): Promise<void>;
}

interface WatchlistContextValue {
  entries: WatchlistEntry[];
  loading: boolean;
  isSaved(mediaKey: string): boolean;
  save(item: WatchlistItem): Promise<void>;
  remove(mediaKey: string): Promise<void>;
  clear(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const WatchlistContext = createContext<WatchlistContextValue | null>(null);

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await readError(response, "Could not load the current profile."),
          );
        }
        return (await response.json()) as AuthResponse;
      })
      .then((body) => setUser(body.user))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const submitCredentials = useCallback(
    async (mode: "login" | "register", username: string, pin: string) => {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            mode === "login"
              ? "Could not sign in."
              : "Could not create the profile.",
          ),
        );
      }
      const body = (await response.json()) as AuthResponse;
      if (!body.user) throw new Error("The profile response was incomplete.");
      setUser(body.user);
    },
    [],
  );

  const login = useCallback(
    (username: string, pin: string) =>
      submitCredentials("login", username, pin),
    [submitCredentials],
  );
  const register = useCallback(
    (username: string, pin: string) =>
      submitCredentials("register", username, pin),
    [submitCredentials],
  );
  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error(await readError(response, "Could not sign out."));
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    async function load() {
      const legacyEntries = readLegacyWatchlist();
      if (legacyEntries.length > 0) {
        const migrated = await Promise.all(
          legacyEntries.map(({ item }) =>
            fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ item }),
              signal: controller.signal,
            }),
          ),
        );
        if (migrated.every((response) => response.ok)) {
          clearLegacyWatchlist();
        }
      }

      const response = await fetch("/api/watchlist", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Could not load saved picks."));
      }
      const body = (await response.json()) as { entries?: WatchlistEntry[] };
      setEntries(body.entries ?? []);
    }

    load()
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authLoading, user]);

  const save = useCallback(
    async (item: WatchlistItem) => {
      if (!user) throw new Error("Sign in with a username and PIN first.");
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Could not save this pick."));
      }
      const body = (await response.json()) as { entry?: WatchlistEntry };
      if (!body.entry) throw new Error("The saved pick response was incomplete.");
      setEntries((current) => [
        body.entry!,
        ...current.filter(
          (entry) => entry.item.mediaKey !== body.entry!.item.mediaKey,
        ),
      ]);
    },
    [user],
  );

  const remove = useCallback(
    async (mediaKey: string) => {
      if (!user) return;
      const response = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaKey }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Could not remove this pick."));
      }
      setEntries((current) =>
        current.filter((entry) => entry.item.mediaKey !== mediaKey),
      );
    },
    [user],
  );

  const clear = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/watchlist", { method: "DELETE" });
    if (!response.ok) {
      throw new Error(await readError(response, "Could not clear saved picks."));
    }
    setEntries([]);
  }, [user]);

  const isSaved = useCallback(
    (mediaKey: string) =>
      entries.some((entry) => entry.item.mediaKey === mediaKey),
    [entries],
  );
  const value = useMemo(
    () => ({ entries, loading, isSaved, save, remove, clear }),
    [entries, loading, isSaved, save, remove, clear],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WatchlistProvider>{children}</WatchlistProvider>
    </AuthProvider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AppProviders.");
  return context;
}

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used inside AppProviders.");
  }
  return context;
}
