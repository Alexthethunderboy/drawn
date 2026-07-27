"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWatchlist } from "@/components/app-providers";
import { DrawReady, DrawRitual } from "@/components/draw-ritual";
import { SiteHeader } from "@/components/site-header";
import { waitForDrawMoment } from "@/lib/draw";
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
}

function formatReleaseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function PosterArtwork({ item }: { item: MediaItem }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [item.mediaKey, item.posterUrl]);

  if (item.posterUrl && !broken) {
    return (
      <img
        src={item.posterUrl}
        alt={`${item.title} poster`}
        width={500}
        height={750}
        className="absolute inset-0 size-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="pf-poster-fallback absolute inset-0 flex flex-col justify-end p-7">
      <span className="pf-kicker text-[var(--lime)]">Poster unavailable</span>
      <p className="display-serif mt-3 max-w-[10ch] text-4xl font-bold leading-[0.9] text-white">
        {item.title}
      </p>
    </div>
  );
}

function RatingBadges({ item }: { item: MediaItem }) {
  const ratings = [
    item.ratings.rottenTomatoes !== undefined && {
      label: "Rotten Tomatoes",
      value: `${Math.round(item.ratings.rottenTomatoes)}%`,
      accent: "#ff5c57",
    },
    item.ratings.imdb !== undefined && {
      label: "IMDb",
      value: item.ratings.imdb.toFixed(1),
      accent: "#f5c518",
    },
    item.ratings.metacritic !== undefined && {
      label: "Metacritic",
      value: String(Math.round(item.ratings.metacritic)),
      accent: "#66cf84",
    },
    item.ratings.trakt !== undefined && {
      label: "Trakt",
      value: item.ratings.trakt.toFixed(1),
      accent: "#ed1c24",
    },
    item.ratings.tmdb !== undefined && {
      label: "TMDb",
      value: item.ratings.tmdb.toFixed(1),
      accent: "#68d7c2",
    },
    item.ratings.mal !== undefined && {
      label: "MyAnimeList",
      value: item.ratings.mal.toFixed(2),
      accent: "#7ca8ff",
    },
  ].filter(Boolean) as { label: string; value: string; accent: string }[];

  if (ratings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Ratings">
      {ratings.map((rating) => (
        <span key={rating.label} className="pf-rating">
          <i style={{ backgroundColor: rating.accent }} />
          <span>{rating.label}</span>
          <strong>{rating.value}</strong>
        </span>
      ))}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className="pf-detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
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
    <div className="pf-feature-card grid min-h-[34rem] place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl text-[var(--lime)]">
          ↻
        </span>
        <h2 className="display-serif mt-6 text-4xl font-bold text-white">
          This chart came up empty.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/50">{error}</p>
        <button type="button" onClick={onRetry} className="pf-button pf-button-primary mt-7">
          Try another draw
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
  const { isSaved, save } = useWatchlist();
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = isSaved(item.mediaKey);
  const release = formatReleaseDate(item.releaseDate);
  const creatorsLabel =
    item.mediaType === "movie" ? "Directed by" : "Created by";

  useEffect(() => setSaveMessage(""), [item.mediaKey]);

  async function saveToWatchlist() {
    setSaving(true);
    setSaveMessage("");
    try {
      await save(item);
      setSaveMessage("Saved to your profile.");
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
    item.contentRating,
    item.runtimeMinutes && `${item.runtimeMinutes} min`,
    item.seasonCount &&
      `${item.seasonCount} ${item.seasonCount === 1 ? "season" : "seasons"}`,
    item.episodeCount &&
      `${item.episodeCount} ${item.episodeCount === 1 ? "episode" : "episodes"}`,
    ...item.genres.slice(0, 3),
  ].filter(Boolean);

  return (
    <article className="pf-draw-reveal pf-feature-card relative overflow-hidden">
      {(item.backdropUrl ?? item.posterUrl) && (
        <img
          src={item.backdropUrl ?? item.posterUrl}
          alt=""
          className="absolute inset-0 size-full scale-105 object-cover opacity-20 blur-[1px]"
        />
      )}
      <div className="pf-feature-wash absolute inset-0" />

      <div className="relative grid md:grid-cols-[minmax(17rem,21rem)_1fr]">
        <div className="relative aspect-[2/3] overflow-hidden bg-[#11130f] md:aspect-auto md:min-h-[43rem]">
          <PosterArtwork item={item} />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
            <span className="pf-source-chip">{item.sourceLabel}</span>
            {item.rank && <span className="pf-rank">Chart #{item.rank}</span>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-6 sm:p-9 lg:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="pf-kicker text-[var(--lime)]">
              Your draw · {CATEGORY_LABELS[item.category]}
            </p>
            <p className="pf-kicker text-white/30">
              Drawn from {poolSize} titles
            </p>
          </div>

          <h2 className="display-serif mt-6 max-w-[16ch] text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.88] tracking-[-0.05em] text-white">
            {item.title}
          </h2>
          {item.tagline && (
            <p className="display-serif mt-4 max-w-2xl text-lg italic leading-7 text-white/52">
              “{item.tagline}”
            </p>
          )}

          {facts.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
              {facts.map((fact) => (
                <span key={String(fact)} className="pf-fact">
                  {fact}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6">
            <RatingBadges item={item} />
          </div>

          <p className="mt-8 max-w-3xl text-[15px] leading-7 text-white/68 sm:text-base sm:leading-8">
            {item.synopsis}
          </p>

          {(item.creators?.length ||
            item.cast?.length ||
            item.language ||
            release) && (
            <dl className="mt-8 grid gap-x-7 gap-y-5 border-y border-white/10 py-6 sm:grid-cols-2">
              <Detail label={creatorsLabel} value={item.creators?.join(", ")} />
              <Detail label="Starring" value={item.cast?.join(", ")} />
              <Detail label="Original language" value={item.language} />
              <Detail label="Released" value={release} />
            </dl>
          )}

          <div className="mt-auto pt-8">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRoll}
                disabled={loading}
                className="pf-button pf-button-primary"
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Drawing another…" : "Draw something else"}
              </button>
              <button
                type="button"
                onClick={saveToWatchlist}
                disabled={saving || saved}
                className="pf-button pf-button-secondary"
              >
                <span aria-hidden="true">{saved ? "◆" : "◇"}</span>
                {saved ? "Saved" : saving ? "Saving…" : "Save pick"}
              </button>
              {item.trailerUrl && (
                <a
                  href={item.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  Watch trailer ↗
                </a>
              )}
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  Full details ↗
                </a>
              )}
            </div>
            {saveMessage && (
              <p
                className={`mt-4 text-xs ${
                  saved ? "text-[var(--lime)]" : "text-[var(--danger)]"
                }`}
                role="status"
              >
                {saveMessage}
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

export function MediaRandomizer() {
  const [category, setCategory] = useState<MediaCategory>("movies");
  const [source, setSource] = useState<SourceId>("all");
  const [item, setItem] = useState<MediaItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const sources = useMemo(() => getSourcesForCategory(category), [category]);
  const selectedSource =
    sources.find((candidate) => candidate.id === source) ?? sources[0]!;

  const roll = useCallback(
    async (nextCategory = category, nextSource = source) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      const startedAt = performance.now();
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
        await waitForDrawMoment(startedAt, controller.signal);
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
    return () => requestRef.current?.abort();
  }, []);

  function resetDraw() {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError("");
    setItem(null);
  }

  function chooseCategory(nextCategory: MediaCategory) {
    resetDraw();
    const nextSource = isSourceAvailableForCategory(source, nextCategory)
      ? source
      : "all";
    setCategory(nextCategory);
    setSource(nextSource);
  }

  function chooseSource(nextSource: SourceId) {
    resetDraw();
    setSource(nextSource);
  }

  const selectionLabel = `${CATEGORY_LABELS[category]} · ${selectedSource.label}`;

  return (
    <main className="pf-page min-h-screen">
      <div className="grain" />
      <SiteHeader current="watch" />

      <section className="pf-container pb-12 pt-10 sm:pt-14">
        <div className="mb-9 grid gap-8 lg:grid-cols-[1fr_minmax(24rem,36rem)] lg:items-end">
          <div>
            <p className="pf-kicker text-[var(--lime)]">
              Global film and television charts
            </p>
            <h1 className="display-serif mt-4 max-w-4xl text-[clamp(3.3rem,8vw,7rem)] font-bold leading-[0.82] tracking-[-0.06em] text-white">
              Let the charts
              <br />
              <em className="font-normal text-white/45">make the call.</em>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/48 sm:text-base">
              One strong recommendation drawn from popular, acclaimed, and
              specialist lists. No endless grid. No decision fatigue.
            </p>
          </div>

          <div className="pf-picker">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="pf-field">
                <span>I want to watch</span>
                <select
                  value={category}
                  onChange={(event) =>
                    chooseCategory(event.target.value as MediaCategory)
                  }
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pf-field">
                <span>Choose a chart</span>
                <select
                  value={source}
                  onChange={(event) =>
                    chooseSource(event.target.value as SourceId)
                  }
                >
                  {sources.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/38">
              {selectedSource.description}
            </p>
          </div>
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {loading ? (
            <DrawRitual
              tone="watch"
              selectionLabel={selectionLabel}
            />
          ) : error && !item ? (
            <EmptyCard error={error} onRetry={() => roll()} />
          ) : item ? (
            <ResultCard
              key={item.mediaKey}
              item={item}
              poolSize={poolSize}
              onRoll={() => roll()}
              loading={loading}
            />
          ) : (
            <DrawReady
              tone="watch"
              selectionLabel={selectionLabel}
              onDraw={() => roll()}
            />
          )}
        </div>

        {error && item && (
          <p className="pf-inline-error" role="alert">
            {error}
          </p>
        )}

        <footer className="pf-footer">
          <p>Live upstream charts · Uniform server-side randomization</p>
          <p>TMDb data used under API attribution requirements</p>
        </footer>
      </section>
    </main>
  );
}
