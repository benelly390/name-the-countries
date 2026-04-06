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

## Data scope and deterministic total

The game uses a curated, explicit playable list in `src/data/countries.ts` with a deterministic total count.

Each entry uses:

```ts
{
  id: string,
  displayName: string,
  acceptedAnswers: string[],
  rejectedCommonAmbiguities: string[]
}
```

## Alias and ambiguity policy implemented

Includes explicit curated coverage for:

- South Korea / Republic of Korea
- North Korea / Democratic People's Republic of Korea
- United States / USA / US / United States of America
- United Kingdom / UK / Britain
- Russia / Russian Federation
- Czechia / Czech Republic
- United Arab Emirates / UAE
- Democratic Republic of the Congo / DRC / Congo-Kinshasa
- Republic of the Congo / Congo-Brazzaville

With explicit ambiguity rejection examples (e.g. `Korea`, `SK`, `Congo` rejected in relevant contexts).

## Project structure

```text
src/
  components/
    GlobeCanvas.tsx
    HUD.tsx
    AnswerPanel.tsx
    FinalResults.tsx
  data/
    countries.ts
  lib/
    normalizeAnswer.ts
    validateAnswer.ts
    storage.ts
    geo.ts
    answerValidation.test.ts
  state/
    gameStore.ts
  types/
    country.ts
    game.ts
  App.tsx
  main.tsx
```

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
