const MINIMUM_DRAW_DURATION_MS = 950;

/**
 * Keeps quick API responses from cutting off the draw ritual before it lands.
 * Slow providers are not delayed—the network request and animation run together.
 */
export async function waitForDrawMoment(
  startedAt: number,
  signal: AbortSignal,
): Promise<void> {
  const remaining = Math.max(
    0,
    MINIMUM_DRAW_DURATION_MS - (performance.now() - startedAt),
  );
  if (remaining === 0) return;

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("The draw was cancelled.", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, remaining);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
