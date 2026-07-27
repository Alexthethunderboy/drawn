"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatchlist } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";
import { BOOK_SOURCES, getBookSource } from "@/lib/books/config";
import type {
  BookItem,
  BookRollResponse,
  BookSourceId,
} from "@/lib/books/types";

interface ApiError {
  error?: string;
}

function compactNumber(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function BookCover({ item }: { item: BookItem }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [item.mediaKey, item.coverUrl]);

  if (item.coverUrl && !broken) {
    return (
      <img
        src={item.coverUrl}
        alt={`${item.title} book cover`}
        width={600}
        height={900}
        className="absolute inset-0 size-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="pf-poster-fallback absolute inset-0 flex flex-col justify-end p-7">
      <span className="pf-kicker text-[var(--lime)]">Cover unavailable</span>
      <p className="display-serif mt-3 max-w-[10ch] text-4xl font-bold leading-[0.9] text-white">
        {item.title}
      </p>
    </div>
  );
}

function BookLoadingCard() {
  return (
    <div className="pf-feature-card grid min-h-[39rem] overflow-hidden lg:grid-cols-[minmax(17rem,22rem)_1fr]">
      <div className="poster-skeleton aspect-[2/3] lg:aspect-auto" />
      <div className="flex flex-col p-6 sm:p-9 lg:p-12">
        <div className="loading-line mb-8 h-4 w-32" />
        <div className="loading-line mb-3 h-14 w-10/12" />
        <div className="loading-line mb-10 h-8 w-5/12" />
        <div className="loading-line mt-auto h-12 w-44" />
      </div>
    </div>
  );
}

function BookResult({
  item,
  poolSize,
  loading,
  roll,
}: {
  item: BookItem;
  poolSize: number;
  loading: boolean;
  roll: () => void;
}) {
  const { isSaved, save } = useWatchlist();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const saved = isSaved(item.mediaKey);

  useEffect(() => setMessage(""), [item.mediaKey]);

  async function saveBook() {
    setSaving(true);
    setMessage("");
    try {
      await save(item);
      setMessage("Saved to your profile.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save this book.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="pf-feature-card relative overflow-hidden">
      {item.coverUrl && (
        <img
          src={item.coverUrl}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover opacity-15 blur-3xl"
        />
      )}
      <div className="pf-feature-wash absolute inset-0" />

      <div className="relative grid lg:grid-cols-[minmax(17rem,22rem)_1fr]">
        <div className="relative aspect-[2/3] overflow-hidden bg-[#11130f] lg:aspect-auto lg:min-h-[43rem]">
          <BookCover item={item} />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
            <span className="pf-source-chip">{item.sourceLabel}</span>
            {item.rank && <span className="pf-rank">List #{item.rank}</span>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-6 sm:p-9 lg:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="pf-kicker text-[var(--lime)]">Your next read</p>
            <p className="pf-kicker text-white/30">
              Randomized from {poolSize} books
            </p>
          </div>

          <h2 className="display-serif mt-7 max-w-[15ch] text-[clamp(3rem,7vw,5.7rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white">
            {item.title}
          </h2>
          <p className="mt-4 text-xl font-semibold text-[var(--lime)]">
            {item.author}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {item.year && <span className="pf-stat">{item.year}</span>}
            {item.rating !== undefined && (
              <span className="pf-stat">
                Goodreads {item.rating.toFixed(2)}
              </span>
            )}
            {item.ratingCount !== undefined && (
              <span className="pf-stat">
                {compactNumber(item.ratingCount)} ratings
              </span>
            )}
          </div>

          <p className="mt-8 max-w-3xl text-[15px] leading-7 text-white/68 sm:text-base sm:leading-8">
            {item.synopsis}
          </p>

          <div className="mt-auto pt-9">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={roll}
                disabled={loading}
                className="pf-button pf-button-primary"
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Finding another…" : "Roll another book"}
              </button>
              <button
                type="button"
                onClick={saveBook}
                disabled={saving || saved}
                className="pf-button pf-button-secondary"
              >
                <span aria-hidden="true">{saved ? "◆" : "◇"}</span>
                {saved ? "Saved" : saving ? "Saving…" : "Save book"}
              </button>
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  View source ↗
                </a>
              )}
              {item.openLibraryUrl && (
                <a
                  href={item.openLibraryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  Open Library ↗
                </a>
              )}
            </div>
            {message && (
              <p className="mt-4 text-xs text-[var(--lime)]" role="status">
                {message}
              </p>
            )}
            <p className="mt-6 max-w-3xl border-l border-[var(--lime)]/60 pl-3 text-[10px] leading-5 text-white/35">
              {item.sourceNote}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function BooksRandomizer() {
  const [source, setSource] = useState<BookSourceId>("all");
  const [item, setItem] = useState<BookItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const recentRef = useRef<string[]>([]);

  const roll = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ source });
      recentRef.current.forEach((key) => params.append("exclude", key));
      const response = await fetch(`/api/books/roll?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = (await response.json()) as BookRollResponse & ApiError;
      if (!response.ok) {
        throw new Error(payload.error ?? "This book list could not be loaded.");
      }
      setItem(payload.item);
      setPoolSize(payload.poolSize);
      recentRef.current = [
        payload.item.mediaKey,
        ...recentRef.current.filter((key) => key !== payload.item.mediaKey),
      ].slice(0, 10);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(
        caught instanceof Error
          ? caught.message
          : "This book list could not be loaded.",
      );
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    roll();
    return () => requestRef.current?.abort();
  }, [roll]);

  const selectedSource = getBookSource(source);

  return (
    <main className="pf-page pf-page-books min-h-screen">
      <div className="grain" />
      <SiteHeader current="books" />

      <section className="pf-container pb-12 pt-10 sm:pt-14">
        <div className="mb-9 grid gap-8 lg:grid-cols-[1fr_minmax(22rem,32rem)] lg:items-end">
          <div>
            <p className="pf-kicker text-[var(--lime)]">
              Worldwide literary rankings
            </p>
            <h1 className="display-serif mt-4 max-w-4xl text-[clamp(3.3rem,8vw,7rem)] font-bold leading-[0.82] tracking-[-0.06em] text-white">
              Find the book
              <br />
              <em className="font-normal text-white/45">
                worth disappearing into.
              </em>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/48 sm:text-base">
              One pick from bestselling and critically aggregated book lists,
              with optional Open Library cover matching.
            </p>
          </div>

          <div className="pf-picker">
            <label className="pf-field">
              <span>Choose a book list</span>
              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as BookSourceId)
                }
              >
                {BOOK_SOURCES.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-4 text-xs leading-5 text-white/38">
              {selectedSource.description}
            </p>
          </div>
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {loading && !item ? (
            <BookLoadingCard />
          ) : item ? (
            <BookResult
              item={item}
              poolSize={poolSize}
              loading={loading}
              roll={roll}
            />
          ) : (
            <div className="pf-feature-card grid min-h-[30rem] place-items-center p-8 text-center">
              <div>
                <h2 className="display-serif text-4xl font-bold text-white">
                  The shelf came up empty.
                </h2>
                <p className="mt-3 text-sm text-white/50">{error}</p>
                <button
                  type="button"
                  className="pf-button pf-button-primary mt-6"
                  onClick={roll}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {error && item && (
          <p className="pf-inline-error" role="alert">
            {error}
          </p>
        )}

        <footer className="pf-footer">
          <p>125 ranked books stored locally · Exact published list order</p>
          <p>Open Library metadata is optional and never blocks a roll</p>
        </footer>
      </section>
    </main>
  );
}
