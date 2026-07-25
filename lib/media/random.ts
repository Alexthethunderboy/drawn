/**
 * Returns a uniform integer in [0, length).
 *
 * Rejection sampling avoids modulo bias while retaining a cryptographically
 * strong server-side random source. It is still the familiar random-index
 * formula after the rejected upper tail is removed.
 */
export function randomIndex(length: number): number {
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new RangeError("Random selection requires a non-empty array.");
  }

  const range = 0x1_0000_0000;
  const rejectionLimit = range - (range % length);
  const values = new Uint32Array(1);

  do {
    crypto.getRandomValues(values);
  } while (values[0] >= rejectionLimit);

  return values[0] % length;
}

export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new RangeError("Cannot select a random item from an empty array.");
  }
  return items[randomIndex(items.length)]!;
}

export function randomPage(maxPage: number): number {
  return randomIndex(maxPage) + 1;
}
