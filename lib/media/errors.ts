export class MediaSourceError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly code = "UPSTREAM_ERROR",
  ) {
    super(message);
    this.name = "MediaSourceError";
  }
}

export function missingEnvironment(variable: string): MediaSourceError {
  return new MediaSourceError(
    `This chart needs ${variable}. Add it to .env.local, then restart the app.`,
    503,
    "MISSING_CONFIGURATION",
  );
}
