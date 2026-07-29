"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatchlist } from "@/components/app-providers";
import { DrawReady, DrawRitual } from "@/components/draw-ritual";
import { SiteHeader } from "@/components/site-header";
import { ChartSheet } from "@/components/chart-sheet";
import { waitForDrawMoment } from "@/lib/draw";
import { MUSIC_SOURCES, getMusicSource } from "@/lib/music/config";
import type {
  MusicMediaType,
  MusicRollResponse,
  MusicSourceId,
  TrackItem,
} from "@/lib/music/types";

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

function duration(value: number | undefined): string | undefined {
  if (!value) return undefined;
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function TrackArtwork({ item }: { item: TrackItem }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [item.mediaKey, item.artworkUrl]);

  if (item.artworkUrl && !broken) {
    return (
      <img
        src={item.artworkUrl}
        alt={`${item.title} ${item.mediaType === "album" ? "album" : "single"} cover`}
        width={640}
        height={640}
        className="absolute inset-0 size-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="music-art-fallback absolute inset-0 grid place-items-center">
      <div className="music-record" aria-label="Cover art unavailable">
        <span />
      </div>
    </div>
  );
}

function MusicError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="pf-feature-card grid min-h-[28rem] place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl text-[var(--coral)]">
          ♪
        </span>
        <h2 className="display-serif mt-6 text-3xl sm:text-4xl font-bold text-white">
          The chart went quiet.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/50">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="pf-button pf-button-music mt-7"
        >
          Try another draw
        </button>
      </div>
    </div>
  );
}

function MusicResult({
  item,
  poolSize,
  artistPoolSize,
  loading,
  roll,
}: {
  item: TrackItem;
  poolSize: number;
  artistPoolSize: number;
  loading: boolean;
  roll: () => void;
}) {
  const { isSaved, save } = useWatchlist();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const saved = isSaved(item.mediaKey);
  const mediaTypeLabel = item.mediaType === "album" ? "Album" : "Single";

  useEffect(() => setSaveMessage(""), [item.mediaKey]);

  async function saveTrack() {
    setSaving(true);
    setSaveMessage("");
    try {
      await save(item);
      setSaveMessage("Saved to your profile.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Could not save this track.",
      );
    } finally {
      setSaving(false);
    }
  }

  const trackFacts = [
    item.mediaType === "track" ? item.album : item.year,
    item.recordLabel,
    item.genres[0],
    duration(item.durationMs),
  ].filter(Boolean);
  const statFacts = [
    item.stats.listens !== undefined &&
      `${compactNumber(item.stats.listens)} listens`,
    item.stats.listeners !== undefined &&
      `${compactNumber(item.stats.listeners)} listeners`,
    item.stats.plays !== undefined &&
      `${compactNumber(item.stats.plays)} plays`,
  ].filter(Boolean);

  return (
    <article className="pf-draw-reveal pf-feature-card relative overflow-hidden">
      {item.artworkUrl && (
        <img
          src={item.artworkUrl}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover opacity-15 blur-3xl"
        />
      )}
      <div className="pf-feature-wash absolute inset-0" />

      {/* Responsive layout: Compact top header on mobile, 2-column on desktop */}
      <div className="relative grid md:grid-cols-[minmax(18rem,24rem)_1fr]">
        
        {/* Mobile Header Banner */}
        <div className="md:hidden grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-4 p-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="relative size-28 shrink-0 aspect-square overflow-hidden rounded-lg border border-white/15 bg-[#11130f] shadow-lg">
            <TrackArtwork item={item} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pf-source-chip pf-source-chip-music text-[9px] px-2 py-0.5">
                {item.sourceLabel}
              </span>
              {item.rank && <span className="pf-rank text-[9px] px-2 py-0.5">#{item.rank}</span>}
            </div>
            <h2 className="display-serif mt-2 text-[1.7rem] font-bold leading-[0.95] tracking-[-0.035em] text-white break-words">
              {item.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--coral)] font-bold break-words">
              {item.artist}
            </p>
          </div>
        </div>

        {/* Desktop Artwork Showcase */}
        <div className="hidden md:block relative aspect-square overflow-hidden bg-[#11130f] md:aspect-auto md:min-h-[43rem]">
          <TrackArtwork item={item} />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
            <span className="pf-source-chip pf-source-chip-music">
              {item.sourceLabel}
            </span>
            <span className="pf-media-kind">{mediaTypeLabel}</span>
          </div>
          {item.rank && (
            <div className="absolute bottom-4 left-4">
              <span className="pf-rank">Chart #{item.rank}</span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="pf-kicker text-[var(--coral)]">
              Music draw · {mediaTypeLabel}
            </p>
            <p className="pf-kicker text-white/40">
              Drawn from {poolSize} records ({artistPoolSize} artists)
            </p>
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--coral)]">
            {item.artist}
          </p>
          <h2 className="hidden md:block display-serif mt-2 max-w-[16ch] text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.9] tracking-[-0.05em] text-white">
            {item.title}
          </h2>

          {trackFacts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
              {trackFacts.map((fact) => (
                <span key={String(fact)} className="pf-fact">
                  {fact}
                </span>
              ))}
            </div>
          )}

          {statFacts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {statFacts.map((stat, idx) => (
                <span key={`${stat}-${idx}`} className="pf-stat">
                  {stat}
                </span>
              ))}
            </div>
          )}

          {item.previewUrl && (
            <div className="pf-audio mt-6">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                30-Second Audio Preview
              </p>
              <audio controls src={item.previewUrl} className="w-full" />
            </div>
          )}

          <p className="mt-6 max-w-3xl text-sm leading-relaxed sm:text-base sm:leading-relaxed text-white/75">
            {item.synopsis}
          </p>

          <div className="mt-auto pt-6">
            <div className="grid grid-cols-1 gap-2 min-[440px]:flex min-[440px]:flex-wrap min-[440px]:items-center min-[440px]:gap-3">
              <button
                type="button"
                onClick={roll}
                disabled={loading}
                className="pf-button pf-button-music"
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Drawing another…" : "Draw something else"}
              </button>
              <button
                type="button"
                onClick={saveTrack}
                disabled={saving || saved}
                className="pf-button pf-button-secondary"
              >
                <span aria-hidden="true">{saved ? "◆" : "◇"}</span>
                {saved ? "Saved" : saving ? "Saving…" : "Save pick"}
              </button>
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  Listen on Apple Music ↗
                </a>
              )}
            </div>

            {saveMessage && (
              <p
                className={`mt-3 text-xs ${
                  saved ? "text-[var(--coral)]" : "text-[var(--danger)]"
                }`}
                role="status"
              >
                {saveMessage}
              </p>
            )}

            <p className="mt-5 max-w-3xl border-l border-[var(--coral)]/60 pl-3 text-[10px] leading-relaxed text-white/40">
              {item.sourceNote}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

const MEDIA_TYPE_PILLS: { id: MusicMediaType; label: string; icon: string }[] = [
  { id: "all",   label: "All",    icon: "✦" },
  { id: "album", label: "Albums", icon: "💿" },
  { id: "track", label: "Tracks", icon: "🎵" },
];

function mediaTypeLabel(t: MusicMediaType) {
  return t === "album" ? "Album" : t === "track" ? "Track" : "Music";
}

export function MusicRandomizer() {
  const [source, setSource] = useState<MusicSourceId>("all");
  const [mediaType, setMediaType] = useState<MusicMediaType>("all");
  const [item, setItem] = useState<TrackItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [artistPoolSize, setArtistPoolSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartSheetOpen, setChartSheetOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const selectedSource = getMusicSource(source);

  const roll = useCallback(
    async (nextSource = source, nextMediaType = mediaType) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      const startedAt = performance.now();
      requestRef.current = controller;
      setLoading(true);
      setError("");

      try {
        const url = `/api/music/roll?source=${encodeURIComponent(nextSource)}&mediaType=${encodeURIComponent(nextMediaType)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as MusicRollResponse & ApiError;

        if (!response.ok) {
          throw new Error(payload.error ?? "This music chart could not be loaded.");
        }

        await waitForDrawMoment(startedAt, controller.signal);
        setItem(payload.item);
        setPoolSize(payload.poolSize);
        setArtistPoolSize(payload.artistPoolSize);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(
          caught instanceof Error
            ? caught.message
            : "This music chart could not be loaded.",
        );
      } finally {
        if (requestRef.current === controller) setLoading(false);
      }
    },
    [source, mediaType],
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

  function chooseSource(nextSource: MusicSourceId) {
    resetDraw();
    setSource(nextSource);
  }

  function chooseMediaType(next: MusicMediaType) {
    resetDraw();
    setMediaType(next);
  }

  return (
    <main className="pf-page pf-page-music min-h-screen pb-24 sm:pb-12">
      <div className="grain" />
      <SiteHeader current="music" />

      <section className="pf-container pb-12 pt-6 sm:pt-12">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_minmax(22rem,32rem)] lg:items-end">
          <div>
            <p className="pf-kicker text-[var(--coral)]">
              Global music rankings
            </p>
            <h1 className="display-serif mt-3 max-w-4xl text-[clamp(2.5rem,7vw,6.5rem)] font-bold leading-[0.85] tracking-[-0.05em] text-white">
              Draw your next
              <br />
              <em className="font-normal text-white/45">listening session.</em>
            </h1>
            <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-white/50">
              One standout album or track chosen from global charts, classics,
              and viral favorites.
            </p>
          </div>

          {/* Right control column: media-type pills + chart picker */}
          <div className="flex flex-col gap-3">
            {/* ── Media-type segmented pills ── */}
            <div>
              <span className="pf-field-label">Media Type</span>
              <div
                role="group"
                aria-label="Media type"
                className="mt-2 grid w-full grid-cols-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-1 gap-1"
              >
                {MEDIA_TYPE_PILLS.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    aria-pressed={mediaType === pill.id}
                    onClick={() => chooseMediaType(pill.id)}
                    className={
                      `min-w-0 flex items-center justify-center gap-1 px-1.5 sm:px-3 py-2.5 rounded-lg text-[11px] sm:text-xs font-bold tracking-wide transition-all duration-200 ` +
                      (mediaType === pill.id
                        ? "bg-[var(--coral)] text-black shadow-lg shadow-[var(--coral)]/30 scale-[1.03]"
                        : "text-white/50 hover:text-white hover:bg-white/10")
                    }
                  >
                    <span aria-hidden="true">{pill.icon}</span>
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Chart source picker ── */}
            <div className="pf-picker pf-picker-music">
              <span className="pf-field-label">Chart Source</span>
              <button
                type="button"
                onClick={() => setChartSheetOpen(true)}
                className="mt-2 w-full min-w-0 flex items-center justify-between gap-3 p-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {selectedSource.label}
                  </p>
                  <p className="text-[11px] text-white/50 truncate mt-0.5">
                    {selectedSource.description}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] sm:text-xs font-bold text-[var(--coral)] px-2.5 py-1 rounded-full border border-[var(--coral)]/30 bg-[var(--coral)]/10">
                  Change ▾
                </span>
              </button>
            </div>
          </div>
        </div>

        <ChartSheet
          isOpen={chartSheetOpen}
          onClose={() => setChartSheetOpen(false)}
          title="Music Charts"
          options={MUSIC_SOURCES.map((s) => ({
            id: s.id,
            label: s.label,
            description: s.description,
          }))}
          selectedId={source}
          onSelect={(id) => chooseSource(id as MusicSourceId)}
        />

        <div aria-live="polite" aria-busy={loading}>
          {loading ? (
            <DrawRitual
              tone="music"
              mediaSubtype={mediaType}
              selectionLabel={`${selectedSource.label} · ${mediaTypeLabel(mediaType)}`}
            />
          ) : error && !item ? (
            <MusicError message={error} retry={() => roll()} />
          ) : item ? (
            <MusicResult
              key={item.mediaKey}
              item={item}
              poolSize={poolSize}
              artistPoolSize={artistPoolSize}
              loading={loading}
              roll={() => roll()}
            />
          ) : (
            <DrawReady
              tone="music"
              mediaSubtype={mediaType}
              selectionLabel={`${selectedSource.label} · ${mediaTypeLabel(mediaType)}`}
              onDraw={() => roll()}
            />
          )}
        </div>

        {error && item && (
          <p className="pf-inline-error" role="alert">
            {error}
          </p>
        )}

        {/* Sticky Mobile Floating Action Bar */}
        <div className="pf-mobile-draw-dock sm:hidden">
          <button
            type="button"
            onClick={() => roll()}
            disabled={loading}
            className="pointer-events-auto pf-button pf-button-music shadow-2xl px-6 py-3.5 rounded-full text-xs font-black"
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Drawing…" : `Draw ${mediaTypeLabel(mediaType)} Now`}
          </button>
        </div>

        <footer className="pf-footer">
          <p>Live music charts · Server-side uniform draw</p>
          <p>Music data provided via Apple Music & Last.fm API attribution</p>
        </footer>
      </section>
    </main>
  );
}
