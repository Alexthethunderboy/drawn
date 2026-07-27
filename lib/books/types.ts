export const BOOK_SOURCE_IDS = [
  "all",
  "goodreads-bestsellers",
  "greatest-books-page-2",
] as const;

export type BookSourceId = (typeof BOOK_SOURCE_IDS)[number];

export interface BookSourceDefinition {
  id: BookSourceId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface BookItem {
  id: string;
  mediaKey: string;
  title: string;
  author: string;
  year?: number;
  synopsis: string;
  coverUrl?: string;
  externalUrl?: string;
  openLibraryUrl?: string;
  rating?: number;
  ratingCount?: number;
  genres: string[];
  rank?: number;
  source: Exclude<BookSourceId, "all">;
  sourceLabel: string;
  sourceNote: string;
  mediaType: "book";
  category: "books";
}

export interface BookRollResponse {
  item: BookItem;
  poolSize: number;
  generatedAt: string;
}
