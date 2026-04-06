# Name the Countries 3D

A complete React + TypeScript + Vite web app for a 3D country-guessing game inspired by Globle.

## Features

- Interactive 3D globe with drag rotate + zoom.
- Clickable country polygons (including multipolygons) with hover and selection states.
- Tiny-country hotspot helpers to improve clickability.
- Country answer panel with:
  - free text guessing
  - Enter-to-submit
  - autofocus input
  - explicit **I don't know** skip flow
- Gameplay rules:
  - a country is only finalized when guessed correctly or skipped
  - incorrect guesses do not consume attempts
  - attempted countries cannot be answered again
- Explicit visual states:
  - unattempted (neutral)
  - hovered
  - selected (darkened + slightly raised)
  - correct (green)
  - skipped (red)
- Always-visible progress HUD:
  - Correct: X
  - Attempted: Y / Total
  - Remaining: Z
- Final results view with:
  - correct/skipped/total/percentage
  - missed countries list
  - start new game action
- localStorage persistence with versioning + stale state reset handling.
- Dedicated normalization + validation modules and unit tests.

## Country data pipeline (195-country target)

- **Curated playable list:** `src/data/countries.ts` now defines a UN-style 195-country set (193 UN members + Palestine + Vatican City).
- **Geometry source:** `world-atlas/countries-50m.json` is used for improved country boundary detail and multipolygon support.
- **Mapping strategy:** Geometry features are matched to the curated game list via normalized country names and alias fallbacks.
- **Validation logging:** On load, `src/lib/geo.ts` logs raw feature count, mapped feature count, and playable-mapped count so you can verify coverage quickly.

### Why only 36 countries appeared before

The old pipeline filtered geometry by `COUNTRY_BY_ID`, but that map only contained 36 hard-coded entries in `GAME_COUNTRIES`, so only those 36 countries could render or be played.

## Setup and run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Notes

- Country geometries come from `world-atlas` TopoJSON and are converted at runtime.
- Local storage key is versioned (`name-the-countries-v1`) to safely discard stale schema versions.
