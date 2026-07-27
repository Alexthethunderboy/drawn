# DRAWN brand identity

Status: working production identity, July 2026
Name: DRAWN
Pronunciation: “drawn”
Tagline: **Drawn from the best.**

## Strategic foundation

DRAWN is for people who want something worthwhile to watch, hear, or read but
do not want another infinite recommendation feed. It sits between ranking
authority and serendipity: credible lists narrow the field, then one fair draw
makes the decision.

- **Positioning:** the anti-browse culture picker.
- **Promise:** one credible next choice without the decision fatigue.
- **Proof:** named global rankings, visible source attribution, ratings,
  uniform random selection, and resilient local catalogs.
- **Desired perception:** cultured, decisive, transparent, and pleasantly
  surprising.
- **Category behavior to reject:** dense streaming grids, faux-personal AI
  claims, casino-style chance cues, and generic play-button branding.

## Governing idea

Bring one proven piece of culture out of the stack and into focus.

Every part of the identity follows four behavioral principles:

1. **One thing at a time.** Give a single result visual authority.
2. **Show the source.** Chance is useful because the pool is credible.
3. **Editorial, not elitist.** Pair cultural confidence with plain language.
4. **A system with range.** Watch, music, and books use distinct signals while
   remaining recognizably DRAWN.

## Logo system

### Recognition device

The symbol contains four upright cards. The third card is pulled down from the
set: one choice visibly drawn from many. The geometry is intentionally simple
enough for a favicon and avoids dice, roulette, shuffle arrows, and generic
play icons.

### Family

- **Primary lockup:** symbol + DRAWN wordmark + tagline. Use in the product
  header and high-attention brand moments.
- **Compact lockup:** symbol + DRAWN. Use below 640 px or where the tagline
  would become noise.
- **Standalone symbol:** use for the favicon, app icon, social avatar, and
  constrained square placements.
- **Wordmark:** use alone only when the symbol already appears nearby.
- **Monochrome:** render the symbol as solid black on white or white on black;
  preserve the pulled-card spacing.

The code-native master is `components/brand-mark.tsx`; its geometry and lockup
rules live in `app/globals.css`. Metadata icons use the same construction in
`app/icon.tsx` and `app/apple-icon.tsx`.

### Clear space and minimum size

Let **x** equal the width of one internal card.

- Keep at least `3x` clear around the standalone symbol.
- Keep at least `4x` around the full lockup.
- Minimum digital symbol size: 32 px.
- Minimum primary-lockup width with tagline: 132 px.
- Below 132 px, remove the tagline; below 96 px, use the symbol alone.

Do not rotate individual cards, close the space beneath the drawn card,
reorder the four cards, outline the symbol, or recolor cards independently.

## Color

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Core background | Ink | `#080A08` | Primary canvas and reversed lockups |
| Core foreground | Paper | `#F4F1E9` | Editorial text and light surfaces |
| Brand signal | Draw | `#D8FF4F` | Core symbol, watch actions, focus moments |
| Music signal | Pulse | `#FF765F` | Music actions and chart cues |
| Books signal | Margin | `#A9C3FF` | Books actions and editorial covers |
| Raised surface | Charcoal | `#171B15` | Cards and utility surfaces |

Ink should occupy roughly 70–80% of a typical product screen, Paper 15–20%,
and signal colors 5–10%. Never use signal colors for long body copy. Use Ink on
Draw, Pulse, or Margin for compact labels; use Paper on Ink for reading text.

## Typography

- **Display:** Iowan Old Style, Baskerville, Times New Roman, serif. Use for
  names, decisive headlines, and the DRAWN wordmark.
- **Interface:** Arial, Helvetica Neue, Helvetica, sans-serif. Use for controls,
  body copy, ratings, and metadata.
- **Evidence:** ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
  monospace. Use for source labels, ranks, and short technical facts.

The stacks use system fonts so the product carries no external font license or
render-blocking dependency. Platform shapes will vary slightly; hierarchy,
spacing, and weight carry the identity consistently.

## Graphic and image language

- Crop posters and covers assertively; one image owns the result card.
- Use ranked-source chips as small evidence labels rather than decoration.
- Use the four-card rhythm for dividers, loading moments, or motion only when
  it reinforces a selection being drawn.
- Texture may feel printed, archival, or tactile in campaign imagery, but
  routine product UI stays clean and high contrast.
- Avoid generic neon streaming gradients, entertainment collages with
  copyrighted characters, and gambling cues.

## Motion

When motion is used, the third card may slide down once by no more than one card
height, then settle. Keep it under 240 ms with a firm ease-out. Do not loop it,
spin the symbol, or make the entire lockup bounce. Respect reduced-motion
preferences.

## Voice

DRAWN speaks like a decisive, well-read friend:

- lead with the result;
- use short, active sentences;
- name the ranking or source;
- make the action feel light, never high-stakes;
- distinguish “ranked” from “popular” and avoid unsupported “best” claims
  outside the brand tagline.

Use:

- “Draw something else.”
- “Drawn from 500 albums.”
- “Your book draw.”
- “The chart came up empty.”

Avoid:

- “Our revolutionary algorithm knows you.”
- “The objectively best movie.”
- “Try your luck.”
- “Jackpot,” “winner,” or other gambling language.

## Applied system

The identity is proven across four different constraints:

1. **High attention:** the `og.png` social card uses the editorial type,
   printed cultural collage, full palette, and pulled-card motif.
2. **Routine product UI:** the header lockup and Draw actions carry the name
   without competing with media artwork.
3. **Small format:** the 64 px favicon and 180 px app icon reduce to the
   standalone four-card symbol.
4. **Missing imagery:** book-cover fallbacks become branded DRAWN Editions,
   turning an upstream failure into a coherent editorial object.

## Production and governance

- Brand component owner: `components/brand-mark.tsx`
- Interface tokens and construction: `app/globals.css`
- Social preview: `public/og.png`
- Metadata and structured data: `app/layout.tsx`
- Web-app icons: `app/icon.tsx`, `app/apple-icon.tsx`
- Manifest, robots, and sitemap: `app/manifest.ts`, `app/robots.ts`,
  `app/sitemap.ts`

The name received a preliminary creative screen for obvious direct-category
conflicts. That is not trademark clearance. Before public commercial launch,
run a professional search in relevant software, entertainment, recommendation,
and media-service classes, then confirm the production domain and social
handles.
