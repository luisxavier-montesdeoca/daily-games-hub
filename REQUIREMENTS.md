# Daily Games Hub — Requirements (v0.2)

Status: **awaiting final approval**. No code yet.

## 1. Goal

One local web page, opened in a desktop browser, that:

1. Shows today's daily games and which ones I've already played.
2. Opens each game on its official site in a new tab.
3. Records each day's result for each game, by pasting the game's share text or entering it by hand.
4. Tracks streaks, win rates and history.
5. Creates a tall shareable image of today's results when I ask for one.
6. Suggests similar daily games I might like (Discover).

## 2. Out of scope (v1)

- Embedding or re-hosting the games. They always open on their own sites.
- Scraping game sites, or showing answers or hints.
- Accounts, multiple users, cloud sync, mobile layout, deploying online.
- Notifications and reminders.
- Pulling results from the game sites automatically. A browser extension could do this later (see §10).

## 3. Game catalog (initial)

| Game | URL | Lang | Result type | Parser in v1 |
|---|---|---|---|---|
| Wordle | https://www.nytimes.com/games/wordle | EN | win/loss, guesses 1–6 | yes (known format) |
| Connections | https://www.nytimes.com/games/connections | EN | win/loss, mistakes 0–4 | yes (known format) |
| Strands | https://www.nytimes.com/games/strands | EN | always solved; hints used | yes (known format) |
| La Palabra del Día | https://lapalabradeldia.com | ES | win/loss, guesses 1–6 (assumed) | best effort, Wordle-style |
| Minute Cryptic | https://minutecryptic.com | EN | solved/revealed; hints used | yes (real sample) |
| Krillion | https://krillion.io | EN | score 0–700 (7 prompts) | yes (real sample) |
| Noillirk | https://noillirk.com | EN | score: meters climbed | yes (real sample) |
| Farflung | https://farflung.game | EN | score: km, 0–500 | yes (real sample) |
| 301 (darts) | https://301juegodiario.com/301 | ES | score: points left 0–301, **lower is better** | yes (real sample) |
| Pop | https://301juegodiario.com/pop.html | ES | score: questions solved 0–5 | yes (real sample) |
| Atrapa la respuesta | https://301juegodiario.com/atrapa.html | ES | score 0–700 (7 × 100) | yes (real sample) |
| Magnitudle: Size It Up | https://magnitudle.com/size-it-up | EN | score 0–500 | yes (real sample) |

- The catalog lives in one data file (`src/games/catalog.ts`). Adding a game means adding one entry; the UI code doesn't change.
- Score games have no win/loss. They track play streak, average, best and score distribution instead. The 301 site is three games in one (301, Pop, Atrapa); each is its own card with its own streak and stats. If a score game's maximum is unknown (Noillirk), score buckets are worked out from my own history rather than from a fixed range.
- Games added later, from Discover or by hand, start with a generic result (played / won? / optional score / optional note). I can refine it later.
- **Parsers can be added later.** When I paste share text from a game that has no parser, the app saves the raw text anyway. Real samples can then be used to write the parser and its tests, with no change to the rest of the app.

## 4. Functional requirements

### 4.1 Today view (home)
- **FR-1** A grid of game cards. Each card shows the name, today's status (not played / played) and, once played, a short result (e.g. "3/6", "1 mistake", "540 pts").
- **FR-2** Clicking a card opens the game in a new tab.
- **FR-3** An "Open all unplayed" button.
- **FR-4** A progress counter: "5 / 9 done today".
- **FR-5** "Today" is the local calendar date and rolls over at local midnight.

### 4.2 Recording results
- **FR-6** Each card has a "Log result" action. It opens a dialog with a paste box and the manual-entry fields for that game.
- **FR-7** If the game has a parser, pasting text fills in the fields (puzzle number, outcome, value, emoji grid) and shows a preview before I save.
- **FR-8** Manual entry is always available. The raw pasted text is always saved.
- **FR-9** I can edit or delete any result, including results from past days (backfill).
- **FR-10** A global "paste anything" box detects which game a pasted text came from (for games that have parsers) and logs it.

### 4.3 Stats and history
- **FR-11** **Play streak**: consecutive days on which I logged any result for the game. This is the main streak shown on cards.
- **FR-12** **Win streak**: consecutive wins. Only shown for games with a win/loss outcome.
- **FR-13** For each game, also show:
  - best play streak and best win streak
  - win rate
  - games played
  - distribution: guesses, mistakes or score buckets
  - average score or value
- **FR-14** Across all games: an "all games done" day count and an all-games streak.
- **FR-15** History view: a calendar or heatmap. Clicking a day shows that day's results.

### 4.4 Shareable image
- **FR-16** A "Share today" button renders a **tall (portrait) PNG card**, about 1080×1920. It contains:
  - the header and date
  - one row per game, with its result and, where available, its emoji grid
  - a footer summary (e.g. "7/9 done · 🔥 longest streak: Wordle 42")
- **FR-17** Copy the image to the clipboard, or download it.
- **FR-18** Copy a plain-text version of the same summary.
- **FR-19** Choose which games appear in today's card.
- **FR-20** The card uses the current UI language.

### 4.5 Discover
- **FR-21** A Discover page with a hand-picked list of free daily games. Each entry has a name, URL, language, a short description and tags (word, geography, trivia, logic, cryptic, numbers, Spanish…).
- **FR-22** **"Similar to your games"**: suggestions ranked by how many tags they share with my enabled games. Games already in my hub are excluded.
- **FR-23** One click adds a Discover game to my hub with a generic result type. I can also dismiss a suggestion.
- **FR-24** The Discover list is a static data file that ships with the app. It can only change when I edit it or update the app; nothing is fetched from the internet.

### 4.6 Settings and data
- **FR-25** Enable, disable, reorder and add games. Custom games are added with name, URL and result type.
- **FR-26** Export all data to a JSON file and import it back (backup).
- **FR-27** Light and dark theme.
- **FR-28** **Language: English and Spanish.** All UI text comes from translation files. A toggle switches the language, and the app remembers my choice. Game names stay as they are.

### 4.7 Game editor and teaching share texts
- **FR-29** Any game (built-in or added) can be edited in the app: name, URL, icon, language, result type, maximum, unit (before/after the number), decimals, and "lower is better" for score games. Edits to built-in games can be reset to the default. Existing results keep their saved values.
- **FR-30** **Teach by example:** paste one share text, then mark what the score is (a number in the text, the count of an emoji, or the number of grid lines) and which number is the puzzle number. Optionally, "it's a loss/revealed when the text contains …". A live preview shows how the example (and an optional second text) is read. A taught format takes priority over a built-in parser.
- **FR-31** Teaching starts from a real paste: an unrecognized paste on Today offers "Teach it" with a game picker, and the result dialog links to the editor. After saving, the result is logged from the same text.
- **FR-32** **Setup codes:** a game's settings (never results) can be copied as a code and added by someone else in Settings. Codes are validated field by field; taught formats are stored as data (literal neighbouring words), not as regexes or code.

## 5. Non-functional requirements

- **NFR-1** Runs locally on a fixed port: the built app on 5173 (served in the background from login), development on 5174, both strict. No external server or database.
- **NFR-2** Data lives in the browser's IndexedDB. It's tied to `localhost:<port>` and that browser, so export/import (FR-26) is the backup.
- **NFR-3** If a game changes its share format, only that game's parser breaks. Manual entry keeps working.
- **NFR-4** Parsers have unit tests built from sample share texts.
- **NFR-5** The code stays readable: TypeScript, small modules, plain tooling.

## 6. Tech stack

| Concern | Choice |
|---|---|
| Build / dev server | Vite |
| UI | React + TypeScript |
| Styling | Tailwind CSS (dark mode via class) |
| Routing | React Router (Today / Stats / History / Discover / Settings) |
| Storage | IndexedDB via Dexie |
| i18n | react-i18next (`en.json`, `es.json`) |
| Share image | `html-to-image` (DOM → PNG) |
| Charts | Recharts |
| Tests | Vitest |

## 7. Data model (sketch)

```ts
type ResultKind = 'guesses' | 'mistakes' | 'score' | 'hints' | 'solved' | 'generic';

type Game = {
  id: string; name: string; url: string; lang: 'en' | 'es';
  resultKind: ResultKind;
  hasWinLoss: boolean;
  maxValue?: number;          // e.g. 6 guesses, 700 points
  tags: string[];
  enabled: boolean; order: number; custom?: boolean;
};

type Result = {
  id: string; gameId: string;
  date: string;               // local YYYY-MM-DD
  puzzleNumber?: number;
  outcome: 'win' | 'loss' | 'n/a';
  value?: number;
  grid?: string;
  note?: string;
  rawShareText?: string;
  createdAt: number; updatedAt: number;
};

// Parsers: src/games/parsers/<gameId>.ts
type Parser = (text: string) => Partial<Result> | null;
```

## 8. Screens

1. **Today**: game grid, progress counter, "Open all unplayed", paste-anything box, "Share today" button.
2. **Stats**: game picker, streaks, win rate, distribution chart.
3. **History**: calendar heatmap and day detail.
4. **Discover**: "similar to your games" plus the full list, filterable by tag and language.
5. **Settings**: games (enable/order/add), language, theme, export/import.

## 9. Milestones

1. **M1:** Project setup, catalog, Today view, open links, manual result entry, IndexedDB, EN/ES scaffolding.
2. **M2:** Parsers for Wordle, Connections, Strands and Palabra del Día, with tests; paste-anything box.
3. **M3:** Stats and History.
4. **M4:** Tall share card (PNG and text), export/import, Settings.
5. **M5:** Discover list and similarity suggestions.

## 10. Future ideas (not committed)

- A real La Palabra del Día sample, to confirm its parser.
- A browser extension that captures results automatically.
- Deploy online with sync, so the hub works on a phone.
