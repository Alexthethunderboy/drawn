import { MediaSourceError } from "@/lib/media/errors";
import { finiteNumber, nonEmptyString } from "@/lib/media/http";
import type { TrackItem } from "@/lib/music/types";

interface SpotifyTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface SpotifyImage {
  url?: string;
  width?: number;
  height?: number;
}

interface SpotifyTrack {
  id?: string;
  name?: string;
  duration_ms?: number;
  external_ids?: { isrc?: string };
  external_urls?: { spotify?: string };
  artists?: { name?: string }[];
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
}

interface SpotifyAlbum {
  id?: string;
  name?: string;
  release_date?: string;
  external_urls?: { spotify?: string };
  artists?: { name?: string }[];
  images?: SpotifyImage[];
}

interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
  albums?: {
    items?: SpotifyAlbum[];
  };
}

function albumBestMatch(
  albums: SpotifyAlbum[],
  item: TrackItem,
): SpotifyAlbum | undefined {
  const targetTitle = normalize(item.title);
  const targetArtist = normalize(item.artist);
  const artistMatches = (album: SpotifyAlbum) =>
    (album.artists ?? []).some((artist) => {
      const candidate = normalize(artist.name);
      return (
        candidate === targetArtist ||
        candidate.includes(targetArtist) ||
        targetArtist.includes(candidate)
      );
    });

  return (
    albums.find(
      (album) =>
        normalize(album.name) === targetTitle && artistMatches(album),
    ) ??
    albums.find(
      (album) =>
        (normalize(album.name).includes(targetTitle) ||
          targetTitle.includes(normalize(album.name))) &&
        artistMatches(album),
    )
  );
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | undefined;

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function largestImage(images: SpotifyImage[] | undefined): string | undefined {
  if (!Array.isArray(images)) return undefined;
  return [...images]
    .sort(
      (left, right) =>
        (right.width ?? 0) * (right.height ?? 0) -
        (left.width ?? 0) * (left.height ?? 0),
    )
    .map((image) => nonEmptyString(image.url))
    .find(Boolean);
}

function bestMatch(
  tracks: SpotifyTrack[],
  item: TrackItem,
): SpotifyTrack | undefined {
  const targetTitle = normalize(item.title);
  const targetArtist = normalize(item.artist);
  const artistMatches = (track: SpotifyTrack) =>
    (track.artists ?? []).some((artist) => {
      const candidate = normalize(artist.name);
      return (
        candidate === targetArtist ||
        candidate.includes(targetArtist) ||
        targetArtist.includes(candidate)
      );
    });

  return (
    tracks.find(
      (track) =>
        normalize(track.name) === targetTitle && artistMatches(track),
    ) ??
    tracks.find(
      (track) =>
        (normalize(track.name).includes(targetTitle) ||
          targetTitle.includes(normalize(track.name))) &&
        artistMatches(track),
    )
  );
}

async function spotifyAccessToken(): Promise<string | undefined> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  let response: Response;
  try {
    response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    // Spotify is optional enrichment, so a temporary outage should not block a roll.
    return undefined;
  }

  if (!response.ok) {
    throw new MediaSourceError(
      response.status === 401
        ? "Spotify rejected the configured Client ID or Client Secret."
        : `Spotify authentication returned ${response.status}.`,
      502,
      "SPOTIFY_AUTH_ERROR",
    );
  }

  const payload = (await response.json()) as SpotifyTokenResponse;
  const token = nonEmptyString(payload.access_token);
  if (!token) {
    throw new MediaSourceError(
      "Spotify authentication returned no access token.",
      502,
      "SPOTIFY_AUTH_ERROR",
    );
  }

  const expiresIn = finiteNumber(payload.expires_in) ?? 3600;
  cachedToken = {
    value: token,
    // Refresh one minute early so a token cannot expire mid-request.
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };
  return token;
}

/**
 * Spotify does not expose a public top-tracks chart in the Web API. We use
 * Client Credentials only to match an already chart-ranked song against the
 * Spotify catalog and add canonical metadata and a Spotify deep link.
 */
export async function enrichTrackWithSpotify(
  item: TrackItem,
): Promise<TrackItem> {
  if (item.spotifyUrl) return item;

  try {
    const token = await spotifyAccessToken();
    if (!token) return item;

    const market = (process.env.SPOTIFY_MARKET || "US").toUpperCase();
    const url = new URL("https://api.spotify.com/v1/search");
    const isAlbum = item.mediaType === "album";
    url.searchParams.set(
      "q",
      `${isAlbum ? "album" : "track"}:${item.title} artist:${item.artist}`,
    );
    url.searchParams.set("type", isAlbum ? "album" : "track");
    url.searchParams.set("market", market);
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return item;

    const payload = (await response.json()) as SpotifySearchResponse;
    if (isAlbum) {
      const album = albumBestMatch(payload.albums?.items ?? [], item);
      const spotifyAlbumId = nonEmptyString(album?.id);
      const spotifyUrl = nonEmptyString(album?.external_urls?.spotify);
      if (!album || !spotifyAlbumId || !spotifyUrl) return item;

      return {
        ...item,
        artworkUrl: item.artworkUrl ?? largestImage(album.images),
        spotifyUrl,
        year:
          finiteNumber(album.release_date?.match(/^\d{4}/)?.[0]) ?? item.year,
        externalIds: {
          ...item.externalIds,
          spotifyAlbumId,
        },
      };
    }

    const match = bestMatch(payload.tracks?.items ?? [], item);
    if (!match) return item;

    const spotifyTrackId = nonEmptyString(match.id);
    const spotifyUrl = nonEmptyString(match.external_urls?.spotify);
    if (!spotifyTrackId || !spotifyUrl) return item;

    const album = nonEmptyString(match.album?.name) ?? item.album;
    return {
      ...item,
      album,
      artworkUrl: item.artworkUrl ?? largestImage(match.album?.images),
      spotifyUrl,
      durationMs: finiteNumber(match.duration_ms) ?? item.durationMs,
      externalIds: {
        ...item.externalIds,
        spotifyTrackId,
        isrc:
          nonEmptyString(match.external_ids?.isrc) ?? item.externalIds.isrc,
      },
      synopsis: album
        ? `${item.title} by ${item.artist}, from ${album}.`
        : item.synopsis,
    };
  } catch {
    // Catalog matching is optional; retain the original chart item on failure.
    return item;
  }
}
