# DRAWN

**Drawn from the best.** A culture picker for films, series, anime, documentaries, music, and books.

Choose a category and ranking source, draw one result, and save it to a browser-local profile.

[Try DRAWN](https://drawn-eta.vercel.app/) · [Source](https://github.com/Alexthethunderboy/drawn) · [CI runs](https://github.com/Alexthethunderboy/drawn/actions)

![drawn — existing portfolio capture](https://raw.githubusercontent.com/Alexthethunderboy/Portfolio/b4c8f605bdb311f2be00d14855b4914a3d662cf9/public/projects/previews/drawn.jpg)

Existing portfolio capture, verified 8 October 2026; not evidence of current uptime or completed validation.

## What it does

- Draws film and television picks from curated snapshots and optional live chart providers.
- Offers dedicated [music](https://drawn-eta.vercel.app/music) and [book](https://drawn-eta.vercel.app/books) experiences.
- Enriches the selected result with artwork and available catalogue information.
- Saves picks under lightweight username/PIN profiles in the same browser.

Movies, anime, documentaries, music, and books have local catalogue sources that do not require API credentials. Television charts depend on configured providers. Optional services add more sources and richer result details.

## Status and limits

Profiles and saved picks are stored in the browser. They do not sync between devices, there is no email recovery, and clearing site data removes them. The profile system is intended for media lists, not sensitive personal information.

External providers can fail, omit artwork, or change availability. Supported categories have local fallback sources. The checked-in curated catalogue is a snapshot dated **27 July 2026**, not a continuously updated ranking.

A CI workflow is configured, but its [latest recorded run](https://github.com/Alexthethunderboy/drawn/actions/runs/30458348423), on commit `5527266`, is failed. The check-run annotation says: “The job was not started because your account is locked due to a billing issue.” No job steps ran; this is an account billing blocker, not a demonstrated code/test failure. Do not treat the presence of the workflow as proof that validation passes.

## Design and engineering choices

### A focused decision

The interface returns one pick rather than another endless catalogue. Ranking sources remain explicit so the basis of a result is visible.

### Provider isolation and fallbacks

For film and television rolls, the server validates the category/source pairing and queries relevant providers. “All charts” takes up to 25 candidates from each successful source before deduplication, so a larger response does not dominate solely through its page size.

Local lists keep supported categories usable when live charts are unavailable. A fallback result carries a source note.

### Random selection on the server

The final candidate pool is sampled with Web Crypto and rejection sampling to avoid modulo bias. Only the chosen item is enriched. This describes selection from the assembled pool, not a guarantee of equal representation across every title in every provider’s full catalogue.

### Lightweight local profiles

PINs are salted and PBKDF2-hashed before storage. This is a convenience boundary for browser-local lists; it does not provide cross-device accounts or a recovery service.

## Stack

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- Node test runner through tsx
- Optional server-side catalogue APIs

## Local setup

Use **Node.js 24** to match the checked-in CI configuration.

The commands below match the repository and CI declarations. They were not rerun as part of this documentation draft.

```bash
git clone https://github.com/Alexthethunderboy/drawn.git
cd drawn
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

For a no-key demo, keep provider credentials blank. The copy command above uses a POSIX shell; on other systems, copy .env.example to .env.local using the equivalent file operation.

## Optional configuration

The complete configuration reference is [.env.example](.env.example).

- **Film and TV:** Trakt, TMDb, and the selected RapidAPI IMDb provider add live sources. OMDb supplies optional rating enrichment.
- **Music:** local Rolling Stone data and credential-free ListenBrainz charts supply candidates. iTunes enriches selected results; Spotify credentials optionally add catalogue matches.
- **Books:** local lists supply candidates; Open Library and Google Books provide optional cover enrichment.
- **Canonical URL:** set NEXT_PUBLIC_SITE_URL for the intended deployment.

Keep server-only credentials out of client code and Git. Provider subscriptions, access restrictions, and data terms apply independently.

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The [CI workflow](.github/workflows/ci.yml) installs with npm ci and declares these checks for pull requests and pushes to main. See the status caveat above before assuming they are passing.

The [tests](tests) cover catalogue rank structure, random selection, profile/authentication helpers, saved lists, music behavior, and RapidAPI handling. These tests do not by themselves establish live-provider uptime or end-to-end browser accessibility.

No npm lint script is currently defined.

## Code map

| Path | Purpose |
| --- | --- |
| app/ | Pages and API route handlers |
| components/ | Picker interfaces, navigation, profiles, and saved-list controls |
| lib/media/ | Film/TV provider routing, blending, selection, and enrichment |
| lib/music/ | Music sources, selection, and enrichment |
| lib/books/ | Book catalogue and result handling |
| lib/auth/, lib/profile/, lib/watchlist/ | Browser-local profile and saved-list behavior |
| data/curated-lists.json | Dated catalogue snapshots with source references |
| tests/ | Automated unit-level checks |

## Further references

- [Media routing and fallback implementation](lib/media/index.ts)
- [Random selection implementation](lib/media/random.ts)
- [Catalogue rank tests](tests/catalog.test.ts)
- [Brand identity](docs/brand-identity.md)
- [Curated data and original source links](data/curated-lists.json)

No project-wide open-source license is currently included. Third-party source data, artwork, and service terms require their own attribution and rights review.

---

Built by [Thunderboy](https://thunderboy.vercel.app).
