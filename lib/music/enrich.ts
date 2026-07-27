import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { enrichTrackWithSpotify } from "@/lib/music/providers/spotify";
import type { TrackItem } from "@/lib/music/types";

interface ItunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
}

interface ItunesSearchResponse {
  results?: ItunesTrack[];
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function artworkUrl(value: unknown): string | undefined {
  return nonEmptyString(value)
    ?.replace("100x100bb", "700x700bb")
    .replace("100x100", "700x700");
}

function bestMatch(
  tracks: ItunesTrack[],
  item: TrackItem,
): ItunesTrack | undefined {
  const targetTitle = normalize(item.title);
  const targetArtist = normalize(item.artist);

  return (
    tracks.find(
      (track) =>
        normalize(track.trackName) === targetTitle &&
        normalize(track.artistName) === targetArtist,
    ) ??
    tracks.find(
      (track) =>
        normalize(track.trackName).includes(targetTitle) &&
        normalize(track.artistName).includes(targetArtist),
    ) ??
    tracks[0]
  );
}

/**
 * The iTunes Search API is metadata enrichment only, never a chart source.
 * Enriching just the selected song keeps requests beneath Apple's documented
 * rate guidance and gives no-key charts artwork and legal preview links.
 */
async function enrichTrackWithItunes(item: TrackItem): Promise<TrackItem> {
  if (item.artworkUrl && item.previewUrl && item.appleMusicUrl) return item;

  try {
    const country = (process.env.ITUNES_STOREFRONT || "US").toUpperCase();
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", `${item.artist} ${item.title}`);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("country", country);
    url.searchParams.set("limit", "5");

    const payload = await fetchJson<ItunesSearchResponse>(url, {
      next: { revalidate: 86_400 },
    });
    const match = bestMatch(payload.results ?? [], item);
    if (!match) return item;

    const appleMusicId = finiteNumber(match.trackId);
    const album = nonEmptyString(match.collectionName) ?? item.album;
    const appleMusicUrl = nonEmptyString(match.trackViewUrl);
    const genre = nonEmptyString(match.primaryGenreName);

    return {
      ...item,
      album,
      artworkUrl: artworkUrl(match.artworkUrl100) ?? item.artworkUrl,
      previewUrl: nonEmptyString(match.previewUrl) ?? item.previewUrl,
      appleMusicUrl: appleMusicUrl ?? item.appleMusicUrl,
      durationMs: finiteNumber(match.trackTimeMillis) ?? item.durationMs,
      genres: item.genres.length ? item.genres : genre ? [genre] : [],
      externalIds: {
        ...item.externalIds,
        appleMusicId: appleMusicId
          ? String(appleMusicId)
          : item.externalIds.appleMusicId,
      },
      synopsis: album
        ? `${item.title} by ${item.artist}, from ${album}.`
        : item.synopsis,
    };
  } catch {
    return item;
  }
}

export async function enrichTrack(item: TrackItem): Promise<TrackItem> {
  const spotifyItem = await enrichTrackWithSpotify(item);
  return enrichTrackWithItunes(spotifyItem);
}
