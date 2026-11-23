# One-Prompt Startup Launcher

Type one sentence describing a startup idea. Get a name, a logo, a landing page, and a working waitlist — in under two minutes.

**One sentence in, a launchable startup out.**

## Demo in 30 seconds

No install, no key, no server:

```bash
# open index.html in any browser, or serve it:
python3 server.py   # http://localhost:8131
```

Then type `a meal-planning app for hostel students` and press **Launch it**. Or open a pre-made launch straight away:

- `index.html#/p/mealwise` — Mealwise, poster template
- `index.html#/p/shelfie` — Shelfie, split template
- `index.html#/p/tutorloop` — Tutorloop, stack template

`?demo=<sentence>` runs a launch on load — useful on stage and for screenshots.

## What it does

- **One-sentence input** — 280-character counter, empty/too-long handling, 3 pre-tested example prompts, Cmd/Ctrl+Enter to launch.
- **Launch rail** — five real agent steps (Naming → Writing copy → Drawing logo → Building page → Publishing) shown ticking off on the left rail.
- **Live AI or offline, honestly labelled** — paste a free Gemini API key in Settings and the copy is generated live by `gemini-3.8-flash` (verified against Google's docs, Nov 2026; `gemini-2.5-flash` was deprecated 2 Nov 2026, so it is not used — fallback on 404 is `gemini-3.5-flash-lite`). With no key, a deterministic offline builder does the whole job and the UI says "Made offline — no key". A live call that fails or takes over 20 seconds falls back to offline and says so. Nothing is ever faked as live.
- **3 landing-page templates** — Poster, Split, Stack — rendered from structured JSON only. The model never writes raw HTML, so layouts cannot break. Switch templates or palettes and the page re-renders instantly.
- **Deterministic SVG logo** — a geometric mark + wordmark from the startup's initials and palette. Always works, labelled `svg-generator`, downloadable as SVG.
- **Published pages** — hash routes `#/p/<slug>` work from `file://` and any static host. Copy link, open live page, or download the launch as a standalone `.html` file (CSS inlined, logo inline, waitlist working).
- **Working waitlist** — email validation, duplicate handling ("You're already on the list"), live counter that ticks up on real signups, per-launch admin table with timestamps, CSV export, clear-all. Every count starts at 0 and only counts real signups.
- **Launch library** — every launch saved in `localStorage`; open, edit, delete. 3 hand-written launches ship cached in `launches.js`.
- **Settings** — Gemini key (localStorage only, with a Test key button that reports the real result), optional Supabase URL + anon key.

## Waitlist storage

Default: `localStorage` per launch slug — works everywhere, including `file://`. Optional layers, in order:

1. `python3 server.py` — serves the app on port 8131 and stores signups in `data/waitlist.json` (gitignored, never commit real emails). The app detects it via `/api/health`.
2. Supabase — set URL + anon key in Settings; signups are also POSTed to your `waitlist` table (`email`, `slug`, `created_at`). No Supabase project exists for this repo; this is opt-in only.

No waitlist numbers are ever invented.

## Stack

Plain HTML + CSS + vanilla JS. No build step, no framework. Space Grotesk, lime `#84CC16` on charcoal `#16181A`. Design references: Linear (product layout), Raycast (one big command input), Land-book landing pages.

Files:

| File | What it is |
| --- | --- |
| `index.html` | App shell: launcher, published page, library, admin, settings |
| `styles.css` | Launcher UI styles |
| `generator.js` | Pure logic: offline generator, SVG logo, template rendering, validation (shared by browser + tests) |
| `launches.js` | 3 hand-written cached launches |
| `app.js` | Browser glue: rail, Gemini client, waitlist, routing |
| `server.py` | Optional stdlib-only local server + JSON waitlist endpoint |
| `tests/run-tests.mjs` | Node tests, no dependencies |

## Tests

```bash
node --test tests/run-tests.mjs
```

**17 tests, 17 pass, 0 fail.** Covers slugify, keyword extraction, offline naming, logo determinism, launch validation, email validation, all 3 template renders, HTML escaping, standalone export, cached-launch validity, and the no-cliché-copy rule.

## Screenshots

In `screenshots/` — desktop 1280px and mobile 390px, read and checked for overflow. See `screenshots/README.md` for the list.

## Honest limits

- **No AI image logos.** Gemini image generation (`gemini-2.5-flash-image`) is not wired in: it needs a paid-tier key for most accounts and would fail silently on a free key on stage. Logos are always the deterministic SVG generator, labelled as such.
- **No real deployment.** Published pages are hash routes in this app, not separate domains. Deploy to Vercel/Netlify/Pages and the same `#/p/<slug>` links keep working.
- **No email confirmation.** Waitlist signups are recorded, not emailed. Adding Resend/an email step is a v2 item.
- **Offline copy is templated.** Without a key, names come from a keyword map and copy from fixed templates — good enough for a demo, clearly labelled, and never presented as AI-written.
- **Live AI needs network + a key.** The key is the user's own free Gemini key, pasted in Settings, stored in localStorage only.
- **Shared waitlist needs the local server or Supabase.** On plain static hosting, each visitor's browser holds its own signups.

## v2 ideas

Real deploy + custom slug domains; email confirmation via Resend; AI image logo when a paid key is present; A/B template testing; analytics on page views; team workspaces; export to Vercel in one click; multi-language copy; waitlist referral links.

## License

MIT — Sivasai Boggu, 2026.
