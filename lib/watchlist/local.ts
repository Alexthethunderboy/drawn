import {
  isWatchlistItem,
  type WatchlistEntry,
} from "@/lib/watchlist/types";

export const LEGACY_WATCHLIST_STORAGE_KEY = "pickfilm.watchlist.v1";
const MAX_WATCHLIST_ITEMS = 100;

export function parseLocalWatchlist(value: string | null): WatchlistEntry[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is WatchlistEntry =>
          Boolean(
            entry &&
              typeof entry === "object" &&
              "item" in entry &&
              isWatchlistItem(entry.item) &&
              "savedAt" in entry &&
              typeof entry.savedAt === "string",
          ),
      )
      .slice(0, MAX_WATCHLIST_ITEMS);
  } catch {
    return [];
  }
}

export function readLegacyWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return parseLocalWatchlist(
      window.localStorage.getItem(LEGACY_WATCHLIST_STORAGE_KEY),
    );
  } catch {
    return [];
  }
}

export function clearLegacyWatchlist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_WATCHLIST_STORAGE_KEY);
  } catch {
    // The migration is best-effort; the profile remains usable without it.
  }
}
