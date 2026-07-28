"use client";

import { useEffect, useState, type CSSProperties } from "react";

export type DrawTone = "watch" | "music" | "books";
export type DrawShape = "portrait" | "square";

interface DrawPanelProps {
  tone: DrawTone;
  shape?: DrawShape;
  selectionLabel: string;
  /** Optional media subtype used to refine the icon shown on card backs */
  mediaSubtype?: "album" | "track" | "all";
}

interface DrawReadyProps extends DrawPanelProps {
  onDraw: () => void;
}

type DrawCardStyle = CSSProperties & {
  [property: `--draw-card-${string}`]: string;
};

// 6-card 3D perspective deck stack configuration
const DECK_CARDS: DrawCardStyle[] = [
  {
    "--draw-card-x": "-3.8rem",
    "--draw-card-y": "0.3rem",
    "--draw-card-z": "-40px",
    "--draw-card-rotate": "-12deg",
    "--draw-card-delay": "0ms",
  },
  {
    "--draw-card-x": "-2.2rem",
    "--draw-card-y": "-0.2rem",
    "--draw-card-z": "-20px",
    "--draw-card-rotate": "-7deg",
    "--draw-card-delay": "80ms",
  },
  {
    "--draw-card-x": "-0.7rem",
    "--draw-card-y": "-0.5rem",
    "--draw-card-z": "0px",
    "--draw-card-rotate": "-2deg",
    "--draw-card-delay": "160ms",
  },
  {
    "--draw-card-x": "0.7rem",
    "--draw-card-y": "-0.3rem",
    "--draw-card-z": "20px",
    "--draw-card-rotate": "3deg",
    "--draw-card-delay": "240ms",
  },
  {
    "--draw-card-x": "2.2rem",
    "--draw-card-y": "0.1rem",
    "--draw-card-z": "40px",
    "--draw-card-rotate": "8deg",
    "--draw-card-delay": "320ms",
  },
  {
    "--draw-card-x": "3.8rem",
    "--draw-card-y": "0.6rem",
    "--draw-card-z": "60px",
    "--draw-card-rotate": "14deg",
    "--draw-card-delay": "400ms",
  },
];

const TICKER_MESSAGES: Record<DrawTone, string[]> = {
  watch: [
    "Querying IMDb Top 1000 & Trakt 8.0+...",
    "Filtering Rotten Tomatoes 80%+...",
    "Balancing TMDb & Metacritic ratings...",
    "Evaluating film & series catalog...",
    "Selecting winning pick...",
  ],
  music: [
    "Scanning Rolling Stone 500 & ListenBrainz...",
    "Analyzing global stream counts...",
    "Filtering high-rated albums & singles...",
    "Balancing artist diversity...",
    "Selecting winning record...",
  ],
  books: [
    "Searching global literary rankings...",
    "Matching Open Library & Google Books...",
    "Filtering acclaimed bestsellers...",
    "Evaluating Goodreads 4.0+ reviews...",
    "Selecting winning book...",
  ],
};

function CardIcon({
  tone,
  mediaSubtype,
}: {
  tone: DrawTone;
  mediaSubtype?: "album" | "track" | "all";
}) {
  if (tone === "music") {
    // Album → vinyl disc  |  Track → musical note  |  All → both layered
    if (mediaSubtype === "track") {
      return (
        <div className="card-back-icon card-back-icon--music">
          <span className="note-stem" />
          <span className="note-flag" />
          <span className="note-head" />
        </div>
      );
    }
    // default (all) or album: show vinyl
    return (
      <div className="card-back-icon card-back-icon--music">
        <span className="vinyl-ring" />
        <span className="vinyl-center" />
      </div>
    );
  }
  if (tone === "books") {
    return (
      <div className="card-back-icon card-back-icon--books">
        <span className="book-spine" />
        <span className="book-leaf" />
      </div>
    );
  }
  return (
    <div className="card-back-icon card-back-icon--watch">
      <span className="film-hole" />
      <span className="film-aperture" />
      <span className="film-hole" />
    </div>
  );
}

function DrawDeck({
  active,
  shape,
  tone,
  mediaSubtype,
}: {
  active: boolean;
  shape: DrawShape;
  tone: DrawTone;
  mediaSubtype?: "album" | "track" | "all";
}) {
  return (
    <div
      className={`draw-deck-3d draw-deck-3d--${tone} draw-deck--${shape}${
        active ? " is-shuffling" : ""
      }`}
      aria-hidden="true"
    >
      <div className="draw-deck-3d__inner">
        {DECK_CARDS.map((style, index) => {
          const isCenterWinner = index === 3;
          return (
            <div
              key={index}
              className={`draw-card-3d ${
                isCenterWinner ? "draw-card-3d--winner" : ""
              }`}
              style={style}
            >
              <div className="draw-card-3d__face draw-card-3d__face--back">
                <div className="draw-card-3d__holo-sheen" />
                <div className="draw-card-3d__border" />
                <CardIcon tone={tone} mediaSubtype={mediaSubtype} />
                <div className="draw-card-3d__brand">DRAWN</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveTicker({ tone }: { tone: DrawTone }) {
  const messages = TICKER_MESSAGES[tone];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 450);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <div className="draw-ticker">
      <span className="draw-ticker__dot" />
      <span className="draw-ticker__text">{messages[index]}</span>
    </div>
  );
}

export function DrawReady({
  tone,
  shape = "portrait",
  selectionLabel,
  mediaSubtype,
  onDraw,
}: DrawReadyProps) {
  return (
    <section
      className={`draw-panel draw-panel--${tone} pf-feature-card`}
      aria-labelledby={`${tone}-draw-ready-title`}
    >
      <div className="draw-panel__stage">
        <DrawDeck active={false} shape={shape} tone={tone} mediaSubtype={mediaSubtype} />
        <p className="draw-panel__stage-note">Unified random draw · No bias</p>
      </div>

      <div className="draw-panel__content">
        <p className="pf-kicker draw-panel__kicker">The stack is ready</p>
        <h2
          id={`${tone}-draw-ready-title`}
          className="display-serif mt-4 max-w-[11ch] text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white"
        >
          Make the draw.
        </h2>
        <p className="mt-5 max-w-lg text-xs sm:text-sm leading-relaxed text-white/55">
          {selectionLabel}. We'll pull one recommendation from the selected
          ranking pool.
        </p>
        <button
          type="button"
          onClick={onDraw}
          className="pf-button draw-panel__button mt-8"
        >
          <span className="draw-button-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Draw now
        </button>
      </div>
    </section>
  );
}

export function DrawRitual({
  tone,
  shape = "portrait",
  selectionLabel,
  mediaSubtype,
}: DrawPanelProps) {
  return (
    <section
      className={`draw-panel draw-panel--${tone} pf-feature-card`}
      role="status"
      aria-label={`Drawing from ${selectionLabel}`}
    >
      <div className="draw-panel__stage">
        <DrawDeck active shape={shape} tone={tone} mediaSubtype={mediaSubtype} />
        <p className="draw-panel__stage-note">Selecting 1 title fairly...</p>
      </div>

      <div className="draw-panel__content">
        <p className="pf-kicker draw-panel__kicker">Drawing now</p>
        <h2 className="display-serif mt-4 max-w-[12ch] text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white">
          Shuffling stack.
        </h2>
        <p className="mt-3 max-w-lg text-xs sm:text-sm leading-relaxed text-white/55">
          Filtering from {selectionLabel}.
        </p>

        <LiveTicker tone={tone} />

        <div className="draw-progress mt-8" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
