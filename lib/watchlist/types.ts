import type { MediaItem } from "@/lib/media/types";
import type { TrackItem } from "@/lib/music/types";
import type { BookItem } from "@/lib/books/types";

export type WatchlistItem = MediaItem | TrackItem | BookItem;

export interface WatchlistEntry {
  item: WatchlistItem;
  savedAt: string;
}

export function isWatchlistItem(value: unknown): value is WatchlistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WatchlistItem>;
  return Boolean(
    typeof item.mediaKey === "string" &&
      item.mediaKey &&
      typeof item.title === "string" &&
      item.title &&
      typeof item.category === "string" &&
      typeof item.source === "string" &&
      typeof item.mediaType === "string",
  );
}
