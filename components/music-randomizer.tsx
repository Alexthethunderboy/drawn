"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthControl } from "@/components/auth-control";
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
        alt={`${item.title} artwork`}
        className="absolute inset-0 size-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className="music-art-fallback absolute inset-0 grid place-items-center"
      aria-label="Artwork unavailable"
    >
      <div className="music-record">
        <span />
      </div>
    </div>
  );
}

function MusicLoadingCard() {
  return (
    <div className="music-card grid overflow-hidden border border-white/12 bg-[#181817] lg:grid-cols-[minmax(19rem,0.86fr)_1.14fr]">
      <div className="poster-skeleton aspect-square min-h-80 lg:min-h-[38rem]" />
      <div className="flex min-h-[32rem] flex-col p-7 sm:p-10">
        <div className="loading-line mb-10 h-5 w-28 opacity-30" />
        <div className="loading-line mb-3 h-14 w-5/6 opacity-30" />
        <div className="loading-line mb-10 h-8 w-1/2 opacity-30" />
        <div className="loading-line mb-3 h-3 w-11/12 opacity-30" />
        <div className="loading-line h-3 w-3/5 opacity-30" />
        <div className="loading-line mt-auto h-14 w-44 opacity-30" />
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
    <div className="music-card grid min-h-[32rem] place-items-center border border-white/12 bg-[#181817] p-8 text-center text-white">
      <div className="max-w-lg">
        <span className="mb-6 inline-grid size-14 place-items-center rounded-full bg-[var(--music-accent)] text-2xl text-black">
          ♪
        </span>
        <h2 className="display-serif mb-3 text-3xl font-bold">
          The chart went quiet.
        </h2>
        <p className="mb-7 text-sm leading-7 text-white/55">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="bg-[var(--music-accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-black"
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
  loading,
  roll,
}: {
  item: TrackItem;
  poolSize: number;
  loading: boolean;
  roll: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setSaved(false);
    setSaveMessage("");
  }, [item.mediaKey]);

  async function saveTrack() {
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      const payload = (await response.json()) as ApiError;
      if (!response.ok) throw new Error(payload.error ?? "Could not save.");
      setSaved(true);
      setSaveMessage("Saved to your watchlist.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Could not save this track.",
      );
    } finally {
      setSaving(false);
    }
  }

  const trackFacts = [
    item.album,
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
    <article className="music-card grid overflow-hidden border border-white/12 bg-[#181817] text-white lg:grid-cols-[minmax(19rem,0.86fr)_1.14fr]">
      <div className="relative aspect-square min-h-80 overflow-hidden bg-black lg:aspect-auto lg:min-h-[38rem]">
        <TrackArtwork item={item} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-5">
          <span className="bg-[var(--music-accent)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-black">
            {item.sourceLabel}
          </span>
          {item.rank && (
            <span className="text-xs font-black tracking-wide">#{item.rank}</span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-7 sm:p-10 lg:p-12">
        <div className="mb-8 flex items-center justify-between gap-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
            Your next repeat
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
            1 of {poolSize}
          </p>
        </div>

        <h1 className="display-serif max-w-[16ch] text-[clamp(2.8rem,7vw,5rem)] font-bold leading-[0.9] tracking-[-0.05em]">
          {item.title}
        </h1>
        <p className="mt-4 text-lg font-bold text-[var(--music-accent)]">
          {item.artist}
        </p>

        {trackFacts.length > 0 && (
          <p className="mt-4 text-[11px] font-bold uppercase leading-6 tracking-[0.14em] text-white/40">
            {trackFacts.join("  /  ")}
          </p>
        )}

        {statFacts.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-2">
            {statFacts.map((fact) => (
              <span
                key={String(fact)}
                className="border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/65"
              >
                {fact}
              </span>
            ))}
          </div>
        )}

        {item.previewUrl ? (
          <div className="mt-8 border-y border-white/10 py-5">
            <audio
              key={item.previewUrl}
              controls
              preload="none"
              src={item.previewUrl}
              className="h-10 w-full"
            >
              Your browser does not support audio previews.
            </audio>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-white/30">
              Preview provided courtesy of iTunes
            </p>
          </div>
        ) : (
          <div className="music-wave mt-9" aria-hidden="true">
            {Array.from({ length: 36 }, (_, index) => (
              <span
                key={index}
                style={{
                  height: `${12 + ((index * 17) % 52)}px`,
                  opacity: 0.35 + (index % 5) * 0.12,
                }}
              />
            ))}
          </div>
        )}

        <p className="mt-7 border-l-2 border-[var(--music-accent)] pl-3 text-[11px] leading-5 text-white/40">
          {item.sourceNote}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
          <button
            type="button"
            onClick={roll}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[var(--music-accent)] px-5 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-55"
          >
            <span className="text-lg leading-none">↻</span>
            {loading ? "Spinning…" : "Spin again"}
          </button>
          <button
            type="button"
            onClick={saveTrack}
            disabled={saving || saved}
            className="border border-white/20 px-5 py-3.5 text-xs font-black uppercase tracking-[0.12em] transition hover:bg-white/7 disabled:opacity-50"
          >
            {saved ? "Saved" : saving ? "Saving…" : "+ Watchlist"}
          </button>
          <div className="ml-0 flex gap-4 pt-2 sm:ml-auto sm:pt-0">
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45 hover:text-white"
              >
                Source ↗
              </a>
            )}
            {item.appleMusicUrl && (
              <a
                href={item.appleMusicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45 hover:text-white"
              >
                Apple Music ↗
              </a>
            )}
            {item.spotifyUrl && (
              <a
                href={item.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-black uppercase tracking-[0.13em] text-[#1ed760] hover:text-white"
              >
                Spotify ↗
              </a>
            )}
          </div>
        </div>
        {saveMessage && (
          <p
            className={`mt-3 text-xs ${saved ? "text-[var(--music-accent)]" : "text-[#ff8b72]"}`}
            role="status"
          >
            {saveMessage}
          </p>
        )}
      </div>
    </article>
  );
}

export function MusicRandomizer() {
  const [source, setSource] = useState<MusicSourceId>("all");
  const [item, setItem] = useState<TrackItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const roll = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/music/roll?${new URLSearchParams({ source })}`,
        { signal: controller.signal, cache: "no-store" },
      );
      const payload = (await response.json()) as MusicRollResponse & ApiError;
      if (!response.ok) {
        throw new Error(payload.error ?? "This music chart could not be loaded.");
      }
      setItem(payload.item);
      setPoolSize(payload.poolSize);
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
    <main className="music-page min-h-screen bg-[#0d0d0c] text-white">
      <div className="grain" />
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-[86rem] items-center justify-between px-4 py-4 sm:px-7">
          <a href="/" className="flex items-center gap-3" aria-label="Pickfilm home">
            <span className="grid size-8 place-items-center bg-[var(--music-accent)] text-lg font-black text-black">
              ♪
            </span>
            <span className="text-sm font-black uppercase tracking-[0.22em]">
              Pickfilm
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-1 rounded-full border border-white/10 p-1 text-[10px] font-black uppercase tracking-[0.13em]"
            >
              <a href="/" className="rounded-full px-3 py-1.5 text-white/45 hover:text-white">
                Watch
              </a>
              <a
                href="/music"
                aria-current="page"
                className="rounded-full bg-white px-3 py-1.5 text-black"
              >
                Music
              </a>
            </nav>
            <div className="music-auth">
              <AuthControl />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[86rem] px-4 pb-12 pt-9 sm:px-7 sm:pt-12">
        <div className="mb-9 grid gap-7 border-b border-white/10 pb-9 lg:grid-cols-[1fr_29rem] lg:items-end">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.21em] text-[var(--music-accent)]">
              Global charts · one random track
            </p>
            <h2 className="display-serif max-w-4xl text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[0.86] tracking-[-0.05em]">
              Find your next
              <br />
              <em className="font-normal">repeat.</em>
            </h2>
          </div>

          <div>
            <label
              htmlFor="music-source"
              className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em] text-white/40"
            >
              Spin from
            </label>
            <select
              id="music-source"
              value={source}
              onChange={(event) =>
                setSource(event.target.value as MusicSourceId)
              }
              className="w-full appearance-none border border-white/20 bg-transparent px-4 py-3.5 text-sm font-bold text-white"
            >
              {MUSIC_SOURCES.map((candidate) => (
                <option
                  key={candidate.id}
                  value={candidate.id}
                  className="bg-[#181817]"
                >
                  {candidate.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs leading-5 text-white/40">
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
              loading={loading}
              roll={roll}
            />
          ) : null}
        </div>

        {error && item && (
          <p
            className="mt-4 border border-[#ff8b72]/20 bg-[#ff8b72]/8 px-4 py-3 text-sm text-[#ffac9a]"
            role="alert"
          >
            {error}
          </p>
        )}

        <footer className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/25 sm:flex-row sm:justify-between">
          <p>ListenBrainz works without a key · Every spin is server-randomized</p>
          <p>Spotify and Apple links open the matched track</p>
        </footer>
      </section>
    </main>
  );
}
