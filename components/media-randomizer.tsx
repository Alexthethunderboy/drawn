"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthControl } from "@/components/auth-control";
import {
  CATEGORY_LABELS,
  getSourcesForCategory,
  isSourceAvailableForCategory,
} from "@/lib/media/config";
import type {
  MediaCategory,
  MediaItem,
  RollResponse,
  SourceId,
} from "@/lib/media/types";

interface ApiError {
  error?: string;
  code?: string;
}

function DiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function RatingBadges({ item }: { item: MediaItem }) {
  const ratings = [
    item.ratings.rottenTomatoes !== undefined && {
      label: "RT",
      value: `${Math.round(item.ratings.rottenTomatoes)}%`,
      tone: "bg-[#e53935] text-white",
    },
    item.ratings.imdb !== undefined && {
      label: "IMDb",
      value: item.ratings.imdb.toFixed(1),
      tone: "bg-[#f5c518] text-black",
    },
    item.ratings.metacritic !== undefined && {
      label: "META",
      value: String(Math.round(item.ratings.metacritic)),
      tone: "bg-[#57a773] text-white",
    },
    item.ratings.trakt !== undefined && {
      label: "TRAKT",
      value: item.ratings.trakt.toFixed(1),
      tone: "bg-[#ed1c24] text-white",
    },
    item.ratings.tmdb !== undefined && {
      label: "TMDb",
      value: item.ratings.tmdb.toFixed(1),
      tone: "bg-[#082541] text-[#90cea1]",
    },
    item.ratings.mal !== undefined && {
      label: "MAL",
      value: item.ratings.mal.toFixed(2),
      tone: "bg-[#2e51a2] text-white",
    },
  ].filter(Boolean) as { label: string; value: string; tone: string }[];

  if (ratings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Ratings">
      {ratings.map((rating) => (
        <span
          key={rating.label}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black tracking-wide ${rating.tone}`}
        >
          <span className="opacity-75">{rating.label}</span>
          {rating.value}
        </span>
      ))}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="media-card grid min-h-[34rem] overflow-hidden border border-black/15 bg-[#f8f5ed] md:grid-cols-[minmax(16rem,0.78fr)_1.22fr]">
      <div className="poster-skeleton min-h-[26rem] md:min-h-full" />
      <div className="flex flex-col p-6 md:p-10">
        <div className="loading-line mb-8 h-5 w-28 rounded-full" />
        <div className="loading-line mb-3 h-12 w-11/12" />
        <div className="loading-line mb-8 h-12 w-3/5" />
        <div className="loading-line mb-3 h-3 w-full" />
        <div className="loading-line mb-3 h-3 w-10/12" />
        <div className="loading-line h-3 w-8/12" />
        <div className="mt-auto flex gap-3 pt-10">
          <div className="loading-line h-11 w-32" />
          <div className="loading-line h-11 w-32" />
        </div>
      </div>
    </div>
  );
}

function EmptyCard({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="media-card grid min-h-[34rem] place-items-center border border-black/15 bg-[#f8f5ed] p-8 text-center">
      <div className="max-w-lg">
        <span className="mb-6 inline-grid size-14 place-items-center rounded-full bg-black text-[var(--acid)]">
          <DiceIcon />
        </span>
        <h2 className="display-serif mb-3 text-3xl font-bold">
          This chart came up empty.
        </h2>
        <p className="mb-6 text-sm leading-7 text-black/60">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="bg-[var(--ink)] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-black/80"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function ResultCard({
  item,
  poolSize,
  onRoll,
  loading,
}: {
  item: MediaItem;
  poolSize: number;
  onRoll: () => void;
  loading: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaved(false);
    setSaveMessage("");
  }, [item.mediaKey]);

  async function saveToWatchlist() {
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not save.");
      setSaved(true);
      setSaveMessage("Saved to your watchlist.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Could not save this title.",
      );
    } finally {
      setSaving(false);
    }
  }

  const facts = [
    item.year,
    item.runtimeMinutes && `${item.runtimeMinutes} min`,
    item.genres.slice(0, 2).join(" · "),
  ].filter(Boolean);

  return (
    <article className="media-card grid min-h-[34rem] overflow-hidden border border-black/15 bg-[#f8f5ed] md:grid-cols-[minmax(16rem,0.78fr)_1.22fr]">
      <div className="relative min-h-[28rem] overflow-hidden bg-black md:min-h-full">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={`${item.title} poster`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="poster-fallback absolute inset-0 flex items-end p-7">
            <p className="display-serif max-w-[10ch] text-5xl font-black leading-[0.88] text-white">
              {item.title}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-4 text-white">
          <span className="bg-[var(--acid)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
            {item.sourceLabel}
          </span>
          {item.rank && (
            <span className="text-xs font-bold tracking-wide">#{item.rank}</span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-6 sm:p-8 md:p-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
            Today’s pick · {CATEGORY_LABELS[item.category]}
          </p>
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
            1 of {poolSize}
          </span>
        </div>

        <h1 className="display-serif max-w-[18ch] text-[clamp(2.4rem,7vw,4.7rem)] font-bold leading-[0.92] tracking-[-0.045em]">
          {item.title}
        </h1>

        {facts.length > 0 && (
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-black/45">
            {facts.join("  /  ")}
          </p>
        )}

        <div className="mt-6">
          <RatingBadges item={item} />
        </div>

        <p className="synopsis-clamp mt-7 max-w-2xl text-sm leading-7 text-black/66 sm:text-[15px]">
          {item.synopsis}
        </p>

        <p className="mt-5 border-l-2 border-[var(--acid)] pl-3 text-[11px] leading-5 text-black/45">
          {item.sourceNote}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
          <button
            type="button"
            onClick={onRoll}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[var(--ink)] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-60"
          >
            <DiceIcon />
            {loading ? "Rolling…" : "Roll again"}
          </button>
          <button
            type="button"
            onClick={saveToWatchlist}
            disabled={saving || saved}
            className="inline-flex items-center gap-2 border border-black/20 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition hover:bg-black/5 disabled:opacity-55"
          >
            <BookmarkIcon filled={saved} />
            {saved ? "Saved" : saving ? "Saving…" : "Watchlist"}
          </button>
          {item.externalUrl && (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-0 inline-flex items-center gap-2 px-2 py-3 text-xs font-bold uppercase tracking-[0.12em] text-black/55 transition hover:text-black sm:ml-auto"
            >
              Details
              <ArrowIcon />
            </a>
          )}
        </div>
        {saveMessage && (
          <p
            className={`mt-3 text-xs ${saved ? "text-[#2d7443]" : "text-[#a02e29]"}`}
            role="status"
          >
            {saveMessage}
          </p>
        )}
      </div>
    </article>
  );
}

export function MediaRandomizer() {
  const [category, setCategory] = useState<MediaCategory>("movies");
  const [source, setSource] = useState<SourceId>("all");
  const [item, setItem] = useState<MediaItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const sources = useMemo(
    () => getSourcesForCategory(category),
    [category],
  );
  const selectedSource =
    sources.find((candidate) => candidate.id === source) ?? sources[0]!;

  const roll = useCallback(
    async (nextCategory = category, nextSource = source) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          category: nextCategory,
          source: nextSource,
        });
        const response = await fetch(`/api/roll?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as RollResponse & ApiError;
        if (!response.ok) {
          throw new Error(payload.error ?? "This chart could not be loaded.");
        }
        setItem(payload.item);
        setPoolSize(payload.poolSize);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(
          caught instanceof Error
            ? caught.message
            : "This chart could not be loaded.",
        );
      } finally {
        if (requestRef.current === controller) setLoading(false);
      }
    },
    [category, source],
  );

  useEffect(() => {
    roll();
    return () => requestRef.current?.abort();
  }, [roll]);

  function chooseCategory(nextCategory: MediaCategory) {
    const nextSource = isSourceAvailableForCategory(source, nextCategory)
      ? source
      : "all";
    setCategory(nextCategory);
    setSource(nextSource);
  }

  return (
    <main className="min-h-screen">
      <div className="grain" />
      <header className="border-b border-black/15">
        <div className="mx-auto flex max-w-[86rem] items-center justify-between px-4 py-4 sm:px-7">
          <a href="/" className="flex items-center gap-3" aria-label="Pickfilm home">
            <span className="grid size-8 place-items-center bg-[var(--ink)] text-[var(--acid)]">
              <DiceIcon />
            </span>
            <span className="text-sm font-black uppercase tracking-[0.22em]">
              Pickfilm
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-1 rounded-full border border-black/10 p-1 text-[10px] font-black uppercase tracking-[0.13em]"
            >
              <a
                href="/"
                aria-current="page"
                className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-white"
              >
                Watch
              </a>
              <a
                href="/music"
                className="rounded-full px-3 py-1.5 text-black/45 hover:text-black"
              >
                Music
              </a>
            </nav>
            <AuthControl />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[86rem] px-4 pb-12 pt-8 sm:px-7 sm:pt-12">
        <div className="mb-8 grid gap-6 border-b border-black/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
              Spin the world’s best charts
            </p>
            <h2 className="display-serif max-w-3xl text-[clamp(2.2rem,6vw,5rem)] font-bold leading-[0.9] tracking-[-0.045em]">
              Stop browsing.
              <br />
              <em className="font-normal">Start watching.</em>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-[34rem]">
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-black/45"
              >
                I want
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) =>
                  chooseCategory(event.target.value as MediaCategory)
                }
                className="w-full appearance-none border border-black/20 bg-transparent px-4 py-3 text-sm font-bold"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="source"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-black/45"
              >
                From
              </label>
              <select
                id="source"
                value={source}
                onChange={(event) => setSource(event.target.value as SourceId)}
                className="w-full appearance-none border border-black/20 bg-transparent px-4 py-3 text-sm font-bold"
              >
                {sources.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs leading-5 text-black/48 sm:col-span-2">
              {selectedSource.description}
            </p>
          </div>
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {loading && !item ? (
            <LoadingCard />
          ) : error && !item ? (
            <EmptyCard error={error} onRetry={() => roll()} />
          ) : item ? (
            <ResultCard
              item={item}
              poolSize={poolSize}
              onRoll={() => roll()}
              loading={loading}
            />
          ) : null}
        </div>

        {error && item && (
          <div
            className="mt-4 border border-[#a02e29]/20 bg-[#a02e29]/5 px-4 py-3 text-sm text-[#81231f]"
            role="alert"
          >
            {error}
          </div>
        )}

        <footer className="mt-8 grid gap-3 border-t border-black/15 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-black/35 sm:grid-cols-2 sm:items-center">
          <p>Charts refresh upstream · Every roll is server-randomized</p>
          <p className="sm:text-right">
            Uses the TMDB API but is not endorsed or certified by TMDB
          </p>
        </footer>
      </section>
    </main>
  );
}
