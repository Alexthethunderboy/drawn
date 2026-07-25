import { MediaSourceError } from "@/lib/media/errors";

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function fetchJson<T>(
  url: URL | string,
  init: NextFetchInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(12_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network request failed";
    throw new MediaSourceError(`Media provider could not be reached: ${reason}`);
  }

  const body = await response.text();

  if (!response.ok) {
    const compactBody = body.replace(/\s+/g, " ").slice(0, 180);
    throw new MediaSourceError(
      `Media provider returned ${response.status}${
        compactBody ? `: ${compactBody}` : ""
      }`,
      response.status === 429 ? 429 : 502,
      response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new MediaSourceError("Media provider returned invalid JSON.");
  }
}

export function finiteNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(/[^\d.-]/g, ""))
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
