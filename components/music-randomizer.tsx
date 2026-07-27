"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatchlist } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";
import { MUSIC_SOURCES, getMusicSource } from "@/lib/music/config";
import type {
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
        alt={`${item.title} ${item.mediaType === "album" ? "album" : "track"} cover`}
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

function MusicLoadingCard() {
  return (
    <div className="pf-feature-card grid overflow-hidden lg:grid-cols-[minmax(20rem,0.9fr)_1.1fr]">
      <div className="poster-skeleton aspect-square min-h-80 lg:min-h-[42rem]" />
      <div className="flex min-h-[34rem] flex-col p-7 sm:p-10 lg:p-12">
        <div className="loading-line mb-10 h-4 w-32" />
        <div className="loading-line mb-3 h-14 w-5/6" />
        <div className="loading-line mb-10 h-8 w-1/2" />
        <div className="flex gap-2">
          <div className="loading-line h-8 w-28" />
          <div className="loading-line h-8 w-24" />
        </div>
        <div className="loading-line mt-auto h-12 w-44" />
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
    <div className="pf-feature-card grid min-h-[34rem] place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl text-[var(--coral)]">
          ♪
        </span>
        <h2 className="display-serif mt-6 text-4xl font-bold text-white">
          The chart went quiet.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/50">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="pf-button pf-button-music mt-7"
        >
          Try another spin
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
    <article className="pf-feature-card relative overflow-hidden">
      {item.artworkUrl && (
        <img
          src={item.artworkUrl}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover opacity-15 blur-3xl"
        />
      )}
      <div className="pf-feature-wash absolute inset-0" />

      <div className="relative grid lg:grid-cols-[minmax(20rem,0.9fr)_1.1fr]">
        <div className="relative aspect-square min-h-80 overflow-hidden bg-black lg:aspect-auto lg:min-h-[42rem]">
          <TrackArtwork item={item} />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-5">
            <span className="pf-source-chip pf-source-chip-music">
              {item.sourceLabel}
            </span>
            {item.rank && <span className="pf-rank">Chart #{item.rank}</span>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-7 sm:p-10 lg:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="pf-kicker text-[var(--coral)]">Your next listen</p>
            <p className="pf-kicker text-white/30">
              {poolSize} tracks · {artistPoolSize} artists
            </p>
          </div>

          <h2 className="display-serif mt-7 max-w-[15ch] text-[clamp(3rem,7vw,5.7rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white">
            {item.title}
          </h2>
          <p className="mt-4 text-xl font-semibold text-[var(--coral)]">
            {item.artist}
          </p>

          {trackFacts.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.13em] text-white/48">
              {trackFacts.map((fact) => (
                <span key={String(fact)} className="pf-fact">
                  {fact}
                </span>
              ))}
            </div>
          )}

          {statFacts.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {statFacts.map((fact) => (
                <span key={String(fact)} className="pf-stat">
                  {fact}
                </span>
              ))}
            </div>
          )}

          {item.mediaType === "track" && item.previewUrl ? (
            <div className="pf-audio mt-9">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="pf-kicker text-white/40">Listen before you commit</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
                  iTunes preview
                </p>
              </div>
              <audio
                key={item.previewUrl}
                controls
                preload="none"
                src={item.previewUrl}
                className="h-10 w-full"
              >
                Your browser does not support audio previews.
              </audio>
            </div>
          ) : (
            <div className="music-wave mt-10" aria-hidden="true">
              {Array.from({ length: 42 }, (_, index) => (
                <span
                  key={index}
                  style={{
                    height: `${12 + ((index * 17) % 52)}px`,
                    opacity: 0.25 + (index % 5) * 0.12,
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-auto pt-9">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={roll}
                disabled={loading}
                className="pf-button pf-button-music"
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Finding another…" : "Spin something else"}
              </button>
              <button
                type="button"
                onClick={saveTrack}
                disabled={saving || saved}
                className="pf-button pf-button-secondary"
              >
                <span aria-hidden="true">{saved ? "◆" : "◇"}</span>
                {saved
                  ? "Saved"
                  : saving
                    ? "Saving…"
                    : `Save ${item.mediaType}`}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
              {item.spotifyUrl && (
                <a
                  href={item.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link text-[#1ed760]"
                >
                  Open in Spotify ↗
                </a>
              )}
              {item.appleMusicUrl && (
                <a
                  href={item.appleMusicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  Open in Apple Music ↗
                </a>
              )}
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pf-text-link"
                >
                  Chart source ↗
                </a>
              )}
            </div>

            {saveMessage && (
              <p
                className={`mt-4 text-xs ${
                  saved ? "text-[var(--coral)]" : "text-[var(--danger)]"
                }`}
                role="status"
              >
                {saveMessage}
              </p>
            )}
            <p className="mt-6 max-w-3xl border-l border-[var(--coral)]/60 pl-3 text-[10px] leading-5 text-white/35">
              {item.sourceNote}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function MusicRandomizer() {
  const [source, setSource] =
    useState<MusicSourceId>("rolling-stone-500");
  const [item, setItem] = useState<TrackItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [artistPoolSize, setArtistPoolSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const recentTracksRef = useRef<string[]>([]);
  const recentArtistsRef = useRef<string[]>([]);

  const roll = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({ source });
      recentTracksRef.current.forEach((mediaKey) =>
        searchParams.append("exclude", mediaKey),
      );
      recentArtistsRef.current.forEach((artist) =>
        searchParams.append("excludeArtist", artist),
      );
      const response = await fetch(
        `/api/music/roll?${searchParams}`,
        { signal: controller.signal, cache: "no-store" },
      );
      const payload = (await response.json()) as MusicRollResponse & ApiError;
      if (!response.ok) {
        throw new Error(payload.error ?? "This music chart could not be loaded.");
      }
      setItem(payload.item);
      setPoolSize(payload.poolSize);
      setArtistPoolSize(payload.artistPoolSize);
      recentTracksRef.current = [
        payload.item.mediaKey,
        ...recentTracksRef.current.filter(
          (mediaKey) => mediaKey !== payload.item.mediaKey,
        ),
      ].slice(0, 10);
      recentArtistsRef.current = [
        payload.item.artist,
        ...recentArtistsRef.current.filter(
          (artist) =>
            artist.localeCompare(payload.item.artist, undefined, {
              sensitivity: "base",
            }) !== 0,
        ),
      ].slice(0, 5);
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
  }, [source]);

  useEffect(() => {
    roll();
    return () => requestRef.current?.abort();
  }, [roll]);

  const selectedSource = getMusicSource(source);

  return (
    <main className="pf-page pf-page-music min-h-screen">
      <div className="grain" />
      <SiteHeader current="music" />

      <section className="pf-container pb-12 pt-10 sm:pt-14">
        <div className="mb-9 grid gap-8 lg:grid-cols-[1fr_minmax(22rem,32rem)] lg:items-end">
          <div>
            <p className="pf-kicker text-[var(--coral)]">
              Worldwide music canon
            </p>
            <h1 className="display-serif mt-4 max-w-4xl text-[clamp(3.3rem,8vw,7rem)] font-bold leading-[0.82] tracking-[-0.06em] text-white">
              Find the track
              <br />
              <em className="font-normal text-white/45">you won’t skip.</em>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/48 sm:text-base">
              A single global pick from ranked songs and albums, enriched with
              cover art and direct listening links.
            </p>
          </div>

          <div className="pf-picker pf-picker-music">
            <label className="pf-field">
              <span>Choose a chart period</span>
              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as MusicSourceId)
                }
              >
                {MUSIC_SOURCES.map((candidate) => (
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
            <MusicLoadingCard />
          ) : error && !item ? (
            <MusicError message={error} retry={roll} />
          ) : item ? (
            <MusicResult
              item={item}
              poolSize={poolSize}
              artistPoolSize={artistPoolSize}
              loading={loading}
              roll={roll}
            />
          ) : null}
        </div>

        {error && item && (
          <p className="pf-inline-error" role="alert">
            {error}
          </p>
        )}

        <footer className="pf-footer">
          <p>500 ranked albums stored locally · Live charts fail over safely</p>
          <p>Spotify and Apple links open the matched recording</p>
        </footer>
      </section>
    </main>
  );
}
