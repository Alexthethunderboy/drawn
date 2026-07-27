import {
  constantTimeEqual,
  createRandomToken,
  hashPin,
} from "@/lib/auth/crypto";
import type { AuthUser } from "@/lib/auth/types";
import { normalizeUsername } from "@/lib/auth/validation";
import {
  isWatchlistItem,
  type WatchlistEntry,
} from "@/lib/watchlist/types";

const PROFILES_STORAGE_KEY = "drawn.profiles.v1";
const SESSION_STORAGE_KEY = "drawn.session.v1";
const MAX_WATCHLIST_ITEMS = 100;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60_000;

interface LocalProfile {
  id: string;
  username: string;
  usernameNormalized: string;
  pinHash: string;
  pinSalt: string;
  failedAttempts: number;
  lockedUntil?: string;
  entries: WatchlistEntry[];
}

function storage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Local profiles are available only in the browser.");
  }
  return window.localStorage;
}

function validEntry(value: unknown): value is WatchlistEntry {
  return Boolean(
    value &&
      typeof value === "object" &&
      "item" in value &&
      isWatchlistItem(value.item) &&
      "savedAt" in value &&
      typeof value.savedAt === "string",
  );
}

function validProfile(value: unknown): value is LocalProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LocalProfile>;
  return Boolean(
    typeof profile.id === "string" &&
      profile.id &&
      typeof profile.username === "string" &&
      profile.username &&
      typeof profile.usernameNormalized === "string" &&
      profile.usernameNormalized &&
      typeof profile.pinHash === "string" &&
      profile.pinHash &&
      typeof profile.pinSalt === "string" &&
      profile.pinSalt &&
      Array.isArray(profile.entries),
  );
}

function readProfiles(): LocalProfile[] {
  try {
    const raw = storage().getItem(PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validProfile).map((profile) => ({
      ...profile,
      failedAttempts: Number.isFinite(profile.failedAttempts)
        ? Math.max(0, profile.failedAttempts)
        : 0,
      entries: profile.entries.filter(validEntry).slice(0, MAX_WATCHLIST_ITEMS),
    }));
  } catch {
    return [];
  }
}

function writeProfiles(profiles: LocalProfile[]): void {
  try {
    storage().setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    throw new Error("This browser could not save the local profile.");
  }
}

function toUser(profile: LocalProfile): AuthUser {
  return { id: profile.id, username: profile.username };
}

function setSession(profileId: string): void {
  storage().setItem(SESSION_STORAGE_KEY, profileId);
}

export function readLocalSession(): AuthUser | null {
  try {
    const profileId = storage().getItem(SESSION_STORAGE_KEY);
    if (!profileId) return null;
    const profile = readProfiles().find((candidate) => candidate.id === profileId);
    if (!profile) {
      storage().removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return toUser(profile);
  } catch {
    return null;
  }
}

export async function registerLocalProfile(
  username: string,
  pin: string,
): Promise<AuthUser> {
  const profiles = readProfiles();
  const trimmedUsername = username.trim();
  const usernameNormalized = normalizeUsername(trimmedUsername);
  if (
    profiles.some(
      (profile) => profile.usernameNormalized === usernameNormalized,
    )
  ) {
    throw new Error("That username already exists on this device.");
  }

  const pinSalt = createRandomToken(16);
  const profile: LocalProfile = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    usernameNormalized,
    pinSalt,
    pinHash: await hashPin(pin, pinSalt),
    failedAttempts: 0,
    entries: [],
  };
  writeProfiles([...profiles, profile]);
  setSession(profile.id);
  return toUser(profile);
}

export async function loginLocalProfile(
  username: string,
  pin: string,
): Promise<AuthUser> {
  const profiles = readProfiles();
  const profileIndex = profiles.findIndex(
    (profile) =>
      profile.usernameNormalized === normalizeUsername(username),
  );
  if (profileIndex < 0) {
    throw new Error("Username or PIN is incorrect.");
  }

  const profile = profiles[profileIndex]!;
  if (profile.lockedUntil && Date.parse(profile.lockedUntil) > Date.now()) {
    throw new Error("Too many attempts. Try again in 15 minutes.");
  }

  const attemptedHash = await hashPin(pin, profile.pinSalt);
  if (!constantTimeEqual(attemptedHash, profile.pinHash)) {
    const attempts = profile.failedAttempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    profiles[profileIndex] = {
      ...profile,
      failedAttempts: locked ? 0 : attempts,
      lockedUntil: locked
        ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
        : undefined,
    };
    writeProfiles(profiles);
    throw new Error(
      locked
        ? "Too many attempts. Try again in 15 minutes."
        : "Username or PIN is incorrect.",
    );
  }

  profiles[profileIndex] = {
    ...profile,
    failedAttempts: 0,
    lockedUntil: undefined,
  };
  writeProfiles(profiles);
  setSession(profile.id);
  return toUser(profile);
}

export function logoutLocalProfile(): void {
  try {
    storage().removeItem(SESSION_STORAGE_KEY);
  } catch {
    // The in-memory session is still cleared by the provider.
  }
}

export function readLocalProfileEntries(profileId: string): WatchlistEntry[] {
  return (
    readProfiles().find((profile) => profile.id === profileId)?.entries ?? []
  );
}

export function writeLocalProfileEntries(
  profileId: string,
  entries: WatchlistEntry[],
): void {
  const profiles = readProfiles();
  const profileIndex = profiles.findIndex(
    (profile) => profile.id === profileId,
  );
  if (profileIndex < 0) {
    throw new Error("The local profile could not be found.");
  }
  profiles[profileIndex] = {
    ...profiles[profileIndex]!,
    entries: entries.filter(validEntry).slice(0, MAX_WATCHLIST_ITEMS),
  };
  writeProfiles(profiles);
}
