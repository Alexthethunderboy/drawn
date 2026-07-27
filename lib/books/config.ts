import type {
  BookSourceDefinition,
  BookSourceId,
} from "@/lib/books/types";

export const BOOK_SOURCES: readonly BookSourceDefinition[] = [
  {
    id: "all",
    label: "All book lists",
    shortLabel: "All books",
    description:
      "An equal blend of the two browser-verified book rankings.",
  },
  {
    id: "goodreads-bestsellers",
    label: "Goodreads · 100 Bestsellers",
    shortLabel: "Goodreads 100",
    description:
      "The complete Best Selling Books of All Time list in its published order.",
  },
  {
    id: "greatest-books-page-2",
    label: "The Greatest Books · 26–50",
    shortLabel: "Greatest 26–50",
    description:
      "Ranks 26 through 50 from The Greatest Books' aggregated all-time ranking.",
  },
] as const;

const BOOK_SOURCE_MAP = new Map(
  BOOK_SOURCES.map((source) => [source.id, source]),
);

export function getBookSource(
  source: BookSourceId,
): BookSourceDefinition {
  const match = BOOK_SOURCE_MAP.get(source);
  if (!match) throw new Error(`Unknown book source: ${source}`);
  return match;
}
