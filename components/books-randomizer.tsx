"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatchlist } from "@/components/app-providers";
import { DrawReady, DrawRitual } from "@/components/draw-ritual";
import { SiteHeader } from "@/components/site-header";
import { ChartSheet } from "@/components/chart-sheet";
import { BOOK_SOURCES, getBookSource } from "@/lib/books/config";
import { waitForDrawMoment } from "@/lib/draw";
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
  const [coverIndex, setCoverIndex] = useState(0);
  const coverUrls =
    item.coverUrls?.length
      ? item.coverUrls
      : item.coverUrl
        ? [item.coverUrl]
        : [];
  const coverUrl = coverUrls[coverIndex];

  useEffect(() => setCoverIndex(0), [item.mediaKey, item.coverUrl]);

  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt={`${item.title} book cover`}
        width={600}
        height={900}
        className="absolute inset-0 size-full object-cover"
        onError={() => setCoverIndex((index) => index + 1)}
      />
    );
  }

  return (
    <div
      className="book-cover-fallback absolute inset-0 flex flex-col p-6"
      role="img"
      aria-label={`Designed cover for ${item.title} by ${item.author}`}
    >
      <span className="book-cover-spine" aria-hidden="true" />
      <span className="pf-kicker text-black/50 text-[10px]">DRAWN editions</span>
      <span className="book-cover-rule mt-4" aria-hidden="true" />
      <p className="display-serif mt-auto max-w-[10ch] text-2xl font-bold leading-[0.9] tracking-[-0.045em] text-[#0b1428]">
        {item.title}
      </p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-black/55">
        {item.author}
      </p>
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
    <article className="pf-draw-reveal pf-feature-card relative overflow-hidden">
      {(item.coverUrls?.[0] ?? item.coverUrl) && (
        <img
          src={item.coverUrls?.[0] ?? item.coverUrl}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover opacity-15 blur-3xl"
        />
      )}
      <div className="pf-feature-wash absolute inset-0" />

      {/* Responsive layout: Stacked mobile header vs 2-column desktop */}
      <div className="relative grid md:grid-cols-[minmax(17rem,21rem)_1fr]">
        
        {/* Mobile Header Banner */}
        <div className="md:hidden flex items-start gap-4 p-5 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="relative w-24 shrink-0 aspect-[2/3] overflow-hidden rounded-md border border-white/15 bg-[#11130f] shadow-lg">
            <BookCover item={item} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pf-source-chip text-[9px] px-2 py-0.5">
                {item.sourceLabel}
              </span>
              {item.rank && <span className="pf-rank text-[9px] px-2 py-0.5">#{item.rank}</span>}
            </div>
            <h2 className="display-serif mt-1.5 text-2xl font-bold leading-tight text-white truncate">
              {item.title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--lime)] font-bold truncate">
              {item.author}
            </p>
          </div>
        </div>

        {/* Desktop Cover Showcase */}
        <div className="hidden md:block relative aspect-[2/3] overflow-hidden bg-[#11130f] md:aspect-auto md:min-h-[43rem]">
          <BookCover item={item} />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
            <span className="pf-source-chip">{item.sourceLabel}</span>
            {item.rank && <span className="pf-rank">List #{item.rank}</span>}
          </div>
        </div>

        {/* Content Details */}
        <div className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="pf-kicker text-[var(--lime)]">Your book draw</p>
            <p className="pf-kicker text-white/40">
              Drawn from {poolSize} books
            </p>
          </div>

          <h2 className="hidden md:block display-serif mt-4 max-w-[15ch] text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.88] tracking-[-0.05em] text-white">
            {item.title}
          </h2>
          <p className="mt-2 text-lg sm:text-xl font-semibold text-[var(--lime)]">
            {item.author}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
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

          <p className="mt-6 max-w-3xl text-sm leading-relaxed sm:text-base sm:leading-relaxed text-white/75">
            {item.synopsis}
          </p>

          <div className="mt-auto pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={roll}
                disabled={loading}
                className="pf-button pf-button-primary"
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Drawing another…" : "Draw another book"}
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
              <p className="mt-3 text-xs text-[var(--lime)]" role="status">
                {message}
              </p>
            )}
            <p className="mt-5 max-w-3xl border-l border-[var(--lime)]/60 pl-3 text-[10px] leading-relaxed text-white/40">
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartSheetOpen, setChartSheetOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const recentRef = useRef<string[]>([]);

  const roll = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    const startedAt = performance.now();
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
      await waitForDrawMoment(startedAt, controller.signal);
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
    return () => requestRef.current?.abort();
  }, []);

  function chooseSource(nextSource: BookSourceId) {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError("");
    setItem(null);
    setSource(nextSource);
  }

  const selectedSource = getBookSource(source);
  const selectionLabel = selectedSource.label;

  return (
    <main className="pf-page pf-page-books min-h-screen pb-24 sm:pb-12">
      <div className="grain" />
      <SiteHeader current="books" />

      <section className="pf-container pb-12 pt-6 sm:pt-12">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_minmax(22rem,32rem)] lg:items-end">
          <div>
            <p className="pf-kicker text-[var(--lime)]">
              Worldwide literary rankings
            </p>
            <h1 className="display-serif mt-3 max-w-4xl text-[clamp(2.5rem,7vw,6.5rem)] font-bold leading-[0.85] tracking-[-0.05em] text-white">
              Find the book
              <br />
              <em className="font-normal text-white/45">
                worth disappearing into.
              </em>
            </h1>
            <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-white/50">
              One pick from bestselling and critically aggregated book lists,
              with cover matching from Open Library and Google Books.
            </p>
          </div>

          <div className="pf-picker">
            <div>
              <span className="pf-field-label">Book List Source</span>
              <button
                type="button"
                onClick={() => setChartSheetOpen(true)}
                className="mt-2 w-full flex items-center justify-between p-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-left"
              >
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {selectedSource.label}
                  </p>
                  <p className="text-[11px] text-white/50 truncate max-w-xs sm:max-w-sm mt-0.5">
                    {selectedSource.description}
                  </p>
                </div>
                <span className="text-xs font-bold text-[var(--lime)] px-2.5 py-1 rounded-full border border-[var(--lime)]/30 bg-[var(--lime)]/10">
                  Change ▾
                </span>
              </button>
            </div>
          </div>
        </div>

        <ChartSheet
          isOpen={chartSheetOpen}
          onClose={() => setChartSheetOpen(false)}
          title="Book Lists"
          options={BOOK_SOURCES.map((s) => ({
            id: s.id,
            label: s.label,
            description: s.description,
          }))}
          selectedId={source}
          onSelect={(id) => chooseSource(id as BookSourceId)}
        />

        <div aria-live="polite" aria-busy={loading}>
          {loading ? (
            <DrawRitual
              tone="books"
              selectionLabel={selectionLabel}
            />
          ) : item ? (
            <BookResult
              key={item.mediaKey}
              item={item}
              poolSize={poolSize}
              loading={loading}
              roll={roll}
            />
          ) : !error ? (
            <DrawReady
              tone="books"
              selectionLabel={selectionLabel}
              onDraw={roll}
            />
          ) : (
            <div className="pf-feature-card grid min-h-[28rem] place-items-center p-8 text-center">
              <div>
                <h2 className="display-serif text-3xl sm:text-4xl font-bold text-white">
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

        {/* Sticky Mobile Floating Action Bar */}
        <div className="sm:hidden fixed bottom-16 inset-x-0 z-30 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none flex justify-center">
          <button
            type="button"
            onClick={() => roll()}
            disabled={loading}
            className="pointer-events-auto pf-button pf-button-primary shadow-2xl px-6 py-3.5 rounded-full text-xs font-black"
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Drawing…" : "Draw Book Now"}
          </button>
        </div>

        <footer className="pf-footer">
          <p>125 ranked books stored locally · Exact published list order</p>
          <p>Multiple cover sources fail over to a designed edition</p>
        </footer>
      </section>
    </main>
  );
}
