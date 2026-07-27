import curatedLists from "@/data/curated-lists.json";
import { getBookSource } from "@/lib/books/config";
import type {
  BookItem,
  BookRollResponse,
  BookSourceId,
} from "@/lib/books/types";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { pickRandom } from "@/lib/media/random";

interface CuratedBook {
  rank: number;
  title?: string;
  author?: string;
  href?: string;
  cover?: string;
  rating?: number;
  ratingCount?: number;
}

interface OpenLibraryDocument {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  first_sentence?: string | string[];
}

interface OpenLibrarySearch {
  docs?: OpenLibraryDocument[];
}

function keyPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function rowsForSource(
  source: Exclude<BookSourceId, "all">,
): CuratedBook[] {
  return (
    source === "goodreads-bestsellers"
      ? curatedLists.sources.goodreadsBestsellers.items
      : curatedLists.sources.greatestBooksPage2.items
  ) as CuratedBook[];
}

function bookCandidates(
  source: Exclude<BookSourceId, "all">,
): BookItem[] {
  const definition = getBookSource(source);
  return rowsForSource(source).flatMap((row): BookItem[] => {
    if (!row.title || !row.author) return [];
    const mediaKey = `book:${keyPart(row.author)}:${keyPart(row.title)}`;

    return [
      {
        id: mediaKey,
        mediaKey,
        title: row.title,
        author: row.author,
        synopsis: `${row.title} by ${row.author}, ranked #${row.rank} on ${definition.label}.`,
        coverUrl: row.cover,
        externalUrl: row.href,
        rating: row.rating,
        ratingCount: row.ratingCount,
        genres: [],
        rank: row.rank,
        source,
        sourceLabel: definition.shortLabel,
        sourceNote: `${definition.description} Browser-verified snapshot from ${curatedLists.generatedAt}; cover enrichment is optional.`,
        mediaType: "book",
        category: "books",
      },
    ];
  });
}

function allBookCandidates(): BookItem[] {
  const sourceIds = [
    "goodreads-bestsellers",
    "greatest-books-page-2",
  ] as const;
  const seen = new Set<string>();
  return sourceIds
    .flatMap((source) => bookCandidates(source).slice(0, 25))
    .filter((item) => {
      if (seen.has(item.mediaKey)) return false;
      seen.add(item.mediaKey);
      return true;
    });
}

async function enrichBook(item: BookItem): Promise<BookItem> {
  if (item.coverUrl && item.year) return item;

  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title", item.title);
    url.searchParams.set("author", item.author);
    url.searchParams.set(
      "fields",
      "key,title,author_name,first_publish_year,cover_i,first_sentence",
    );
    url.searchParams.set("limit", "5");

    const payload = await fetchJson<OpenLibrarySearch>(url, {
      next: { revalidate: 86_400 },
    });
    const documents = payload.docs ?? [];
    const match =
      documents.find(
        (document) =>
          normalize(document.title) === normalize(item.title) &&
          document.author_name?.some(
            (author) => normalize(author) === normalize(item.author),
          ),
      ) ?? documents[0];
    if (!match) return item;

    const coverId = finiteNumber(match.cover_i);
    const key = nonEmptyString(match.key);
    const sentence = Array.isArray(match.first_sentence)
      ? nonEmptyString(match.first_sentence[0])
      : nonEmptyString(match.first_sentence);

    return {
      ...item,
      year: finiteNumber(match.first_publish_year) ?? item.year,
      coverUrl:
        item.coverUrl ??
        (coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : undefined),
      openLibraryUrl: key
        ? `https://openlibrary.org${key}`
        : item.openLibraryUrl,
      synopsis: sentence ?? item.synopsis,
    };
  } catch {
    return item;
  }
}

export async function rollBook(
  source: BookSourceId,
  excludedMediaKeys: readonly string[] = [],
): Promise<BookRollResponse> {
  const candidates =
    source === "all" ? allBookCandidates() : bookCandidates(source);
  const exclusions = new Set(excludedMediaKeys);
  const eligible = candidates.filter(
    (item) => !exclusions.has(item.mediaKey),
  );
  const selected = pickRandom(eligible.length ? eligible : candidates);

  return {
    item: await enrichBook(selected),
    poolSize: candidates.length,
    generatedAt: new Date().toISOString(),
  };
}
