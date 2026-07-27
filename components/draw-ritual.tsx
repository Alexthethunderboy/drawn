"use client";

import type { CSSProperties } from "react";

export type DrawTone = "watch" | "music" | "books";
export type DrawShape = "portrait" | "square";

interface DrawPanelProps {
  tone: DrawTone;
  shape?: DrawShape;
  selectionLabel: string;
}

interface DrawReadyProps extends DrawPanelProps {
  onDraw: () => void;
}

type DrawCardStyle = CSSProperties & {
  [property: `--draw-card-${string}`]: string;
};

const CARD_STYLES: DrawCardStyle[] = [
  {
    "--draw-card-x": "-0.7rem",
    "--draw-card-y": "0.15rem",
    "--draw-card-rotate": "-6deg",
    "--draw-card-delay": "0ms",
  },
  {
    "--draw-card-x": "-0.2rem",
    "--draw-card-y": "-0.15rem",
    "--draw-card-rotate": "-2deg",
    "--draw-card-delay": "70ms",
  },
  {
    "--draw-card-x": "0.2rem",
    "--draw-card-y": "1.15rem",
    "--draw-card-rotate": "2deg",
    "--draw-card-delay": "140ms",
  },
  {
    "--draw-card-x": "0.7rem",
    "--draw-card-y": "0.05rem",
    "--draw-card-rotate": "6deg",
    "--draw-card-delay": "210ms",
  },
];

function DrawDeck({
  active,
  shape,
}: {
  active: boolean;
  shape: DrawShape;
}) {
  return (
    <div
      className={`draw-deck draw-deck--${shape}${active ? " is-drawing" : ""}`}
      aria-hidden="true"
    >
      {CARD_STYLES.map((style, index) => (
        <span
          key={index}
          className="draw-deck__card"
          style={style}
        >
          <i />
          <i />
          <i />
        </span>
      ))}
    </div>
  );
}

export function DrawReady({
  tone,
  shape = "portrait",
  selectionLabel,
  onDraw,
}: DrawReadyProps) {
  return (
    <section
      className={`draw-panel draw-panel--${tone} pf-feature-card`}
      aria-labelledby={`${tone}-draw-ready-title`}
    >
      <div className="draw-panel__stage">
        <DrawDeck active={false} shape={shape} />
        <p className="draw-panel__stage-note">One card. Drawn fairly.</p>
      </div>

      <div className="draw-panel__content">
        <p className="pf-kicker draw-panel__kicker">The stack is ready</p>
        <h2
          id={`${tone}-draw-ready-title`}
          className="display-serif mt-5 max-w-[11ch] text-[clamp(3rem,7vw,5.8rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white"
        >
          Make the draw.
        </h2>
        <p className="mt-6 max-w-lg text-sm leading-7 text-white/52 sm:text-base">
          {selectionLabel}. We’ll pull one recommendation from the selected
          ranking pool.
        </p>
        <button
          type="button"
          onClick={onDraw}
          className="pf-button draw-panel__button mt-9"
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
}: DrawPanelProps) {
  return (
    <section
      className={`draw-panel draw-panel--${tone} pf-feature-card`}
      role="status"
      aria-label={`Drawing from ${selectionLabel}`}
    >
      <div className="draw-panel__stage">
        <DrawDeck active shape={shape} />
        <p className="draw-panel__stage-note">One card is being pulled.</p>
      </div>

      <div className="draw-panel__content">
        <p className="pf-kicker draw-panel__kicker">Drawing now</p>
        <h2 className="display-serif mt-5 max-w-[12ch] text-[clamp(3rem,7vw,5.8rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white">
          Shuffling the stack.
        </h2>
        <p className="mt-6 max-w-lg text-sm leading-7 text-white/52 sm:text-base">
          Pulling one result from {selectionLabel}.
        </p>
        <div className="draw-progress mt-10" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
