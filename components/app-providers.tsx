"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthUser } from "@/lib/auth/types";
import {
  loginLocalProfile,
  logoutLocalProfile,
  readLocalProfileEntries,
  readLocalSession,
  registerLocalProfile,
  writeLocalProfileEntries,
} from "@/lib/profile/local";
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

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readLocalSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, pin: string) => {
    setUser(await loginLocalProfile(username, pin));
  }, []);

  const register = useCallback(async (username: string, pin: string) => {
    setUser(await registerLocalProfile(username, pin));
  }, []);

  const logout = useCallback(async () => {
    logoutLocalProfile();
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

    setLoading(true);
    const localEntries = readLocalProfileEntries(user.id);
    const legacyEntries = readLegacyWatchlist();
    const merged = [...legacyEntries, ...localEntries].filter(
      (entry, index, all) =>
        all.findIndex(
          (candidate) => candidate.item.mediaKey === entry.item.mediaKey,
        ) === index,
    );

    if (legacyEntries.length > 0) {
      writeLocalProfileEntries(user.id, merged);
      clearLegacyWatchlist();
    }
    setEntries(merged);
    setLoading(false);
  }, [authLoading, user]);

  const save = useCallback(
    async (item: WatchlistItem) => {
      if (!user) throw new Error("Sign in with a username and PIN first.");
      const entry = { item, savedAt: new Date().toISOString() };
      const nextEntries = [
        entry,
        ...readLocalProfileEntries(user.id).filter(
          (candidate) => candidate.item.mediaKey !== item.mediaKey,
        ),
      ];
      writeLocalProfileEntries(user.id, nextEntries);
      setEntries(nextEntries);
    },
    [user],
  );

  const remove = useCallback(
    async (mediaKey: string) => {
      if (!user) return;
      const nextEntries = readLocalProfileEntries(user.id).filter(
        (entry) => entry.item.mediaKey !== mediaKey,
      );
      writeLocalProfileEntries(user.id, nextEntries);
      setEntries(nextEntries);
    },
    [user],
  );

  const clear = useCallback(async () => {
    if (!user) return;
    writeLocalProfileEntries(user.id, []);
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
