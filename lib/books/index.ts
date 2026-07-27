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
  cover_edition_key?: string;
  first_sentence?: string | string[];
}

interface OpenLibrarySearch {
  docs?: OpenLibraryDocument[];
}

interface GoogleBookVolume {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: {
      extraLarge?: string;
      large?: string;
      medium?: string;
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface GoogleBooksSearch {
  items?: GoogleBookVolume[];
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

function lookupTitle(title: string): string {
  const withoutSeries = title
    // Ranking sites often append series metadata that harms cover matching.
    .replace(/\s*\([^)]*(?:#\d+|series|books?\s+\d)[^)]*\)\s*$/i, "")
    // Scraped HTML can contain doubled apostrophes in otherwise valid titles.
    .replace(/'{2,}/g, "'")
    .trim();
  const withoutSubtitle = withoutSeries.split(/\s*:\s*/, 1)[0]?.trim();
  return withoutSubtitle || withoutSeries || title;
}

function secureImageUrl(value: string | undefined): string | undefined {
  const url = nonEmptyString(value);
  return url?.replace(/^http:\/\//i, "https://");
}

function uniqueUrls(
  values: readonly (string | undefined)[],
): string[] {
  return [
    ...new Set(
      values
        .map(secureImageUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function matchScore(
  candidateTitle: string | undefined,
  candidateAuthors: readonly string[] | undefined,
  item: BookItem,
  hasCover: boolean,
): number {
  const wantedTitle = normalize(item.title);
  const shorterTitle = normalize(lookupTitle(item.title));
  const title = normalize(candidateTitle);
  const author = normalize(item.author);
  const authors = (candidateAuthors ?? []).map(normalize);

  let score = 0;
  if (title === wantedTitle) score += 14;
  else if (title === shorterTitle) score += 12;
  else if (
    title &&
    shorterTitle &&
    (title.includes(shorterTitle) || shorterTitle.includes(title))
  ) {
    score += 5;
  }

  if (authors.includes(author)) score += 10;
  else if (
    authors.some(
      (candidate) =>
        candidate.includes(author) || author.includes(candidate),
    )
  ) {
    score += 4;
  }

  if (hasCover) score += 6;
  return score;
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
        coverUrls: row.cover ? [row.cover] : [],
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

async function searchOpenLibrary(item: BookItem) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", lookupTitle(item.title));
  url.searchParams.set("author", item.author);
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,cover_edition_key,first_sentence",
  );
  url.searchParams.set("limit", "10");

  const payload = await fetchJson<OpenLibrarySearch>(url, {
    next: { revalidate: 86_400 },
  });
  return (payload.docs ?? [])
    .map((document) => ({
      document,
      score: matchScore(
        document.title,
        document.author_name,
        item,
        Boolean(document.cover_i || document.cover_edition_key),
      ),
    }))
    .sort((a, b) => b.score - a.score)[0]?.document;
}

async function searchGoogleBooks(item: BookItem) {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set(
    "q",
    `intitle:"${lookupTitle(item.title)}" inauthor:"${item.author}"`,
  );
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("printType", "books");

  const payload = await fetchJson<GoogleBooksSearch>(url, {
    next: { revalidate: 86_400 },
  });
  return (payload.items ?? [])
    .map((volume) => {
      const links = volume.volumeInfo?.imageLinks;
      return {
        volume,
        score: matchScore(
          volume.volumeInfo?.title,
          volume.volumeInfo?.authors,
          item,
          Boolean(
            links?.extraLarge ??
              links?.large ??
              links?.medium ??
              links?.thumbnail,
          ),
        ),
      };
    })
    .sort((a, b) => b.score - a.score)[0]?.volume;
}

async function enrichBook(item: BookItem): Promise<BookItem> {
  const titleCover = `https://covers.openlibrary.org/b/title/${encodeURIComponent(
    lookupTitle(item.title),
  )}-L.jpg?default=false`;
  const shouldSearch = !item.coverUrl || !item.year;
  const [openLibraryResult, googleBooksResult] = shouldSearch
    ? await Promise.allSettled([
        searchOpenLibrary(item),
        searchGoogleBooks(item),
      ])
    : [undefined, undefined];
  const openLibrary =
    openLibraryResult?.status === "fulfilled"
      ? openLibraryResult.value
      : undefined;
  const googleBook =
    googleBooksResult?.status === "fulfilled"
      ? googleBooksResult.value
      : undefined;
  const openLibraryCoverId = finiteNumber(openLibrary?.cover_i);
  const openLibraryEdition = nonEmptyString(
    openLibrary?.cover_edition_key,
  );
  const googleLinks = googleBook?.volumeInfo?.imageLinks;
  const coverUrls = uniqueUrls([
    item.coverUrl,
    openLibraryCoverId
      ? `https://covers.openlibrary.org/b/id/${openLibraryCoverId}-L.jpg?default=false`
      : undefined,
    openLibraryEdition
      ? `https://covers.openlibrary.org/b/olid/${openLibraryEdition}-L.jpg?default=false`
      : undefined,
    googleLinks?.extraLarge,
    googleLinks?.large,
    googleLinks?.medium,
    googleLinks?.thumbnail,
    googleLinks?.smallThumbnail,
    titleCover,
    ...(item.coverUrls ?? []),
  ]);
  const key = nonEmptyString(openLibrary?.key);
  const sentence = Array.isArray(openLibrary?.first_sentence)
    ? nonEmptyString(openLibrary.first_sentence[0])
    : nonEmptyString(openLibrary?.first_sentence);
  const googleYear = Number.parseInt(
    googleBook?.volumeInfo?.publishedDate?.slice(0, 4) ?? "",
    10,
  );

  return {
    ...item,
    year:
      finiteNumber(openLibrary?.first_publish_year) ??
      (Number.isFinite(googleYear) ? googleYear : undefined) ??
      item.year,
    coverUrl: coverUrls[0],
    coverUrls,
    openLibraryUrl: key
      ? `https://openlibrary.org${key}`
      : item.openLibraryUrl,
    synopsis: sentence ?? item.synopsis,
  };
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
