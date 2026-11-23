# One-Prompt Startup Launcher — PLAN.md

## 1. Project brief
- **Name:** One-Prompt Startup Launcher
- **Type:** AI tool / SaaS (single-page web app, static hosting)
- **What it does (1 sentence):** Type one sentence describing a startup idea and get a named, branded landing page with a working waitlist in under two minutes.
- **Target user:** A founder at a hackathon or weekend builder with an idea and no designer, copywriter, or landing page yet.
- **Core promise:** One sentence in, a launchable startup out — name, brand, page, waitlist.
- **Tone:** Plain, direct, a little blunt. No marketing adjectives.
- **Identity:** Lime `#84CC16` on charcoal `#16181A`, Space Grotesk. One signature idea: the **launch rail** — a left-hand vertical timeline that shows each agent step ticking off (Name → Copy → Logo → Page → Waitlist), reused on every screen.
- **References (design-playbook):** Linear (dense, honest product layout, clear hierarchy), Raycast (one big command input that does the work), Land-book / SaaSFrame landing pages (editorial landing-page type, not centred-hero-plus-3-cards).
- **Platforms:** Web, static. Works from `file://`, GitHub Pages, or any static host. Optional local server for a shared waitlist file.

## 2. Stack (verified 23 Nov 2026)
- Plain HTML + CSS + vanilla JS. No build step, no framework to break on stage. Fonts: Space Grotesk via Google Fonts with system fallback (headless/ offline still renders cleanly).
- **Live AI:** Google Gemini API, `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent` with `response_mime_type: application/json`. Model verified against Google's own docs (ai.google.dev/gemini-api/docs/models): `gemini-3.8-flash` is the current Flash model for new projects; `gemini-2.5-flash` was deprecated 2 Nov 2026 and auto-routes to `gemini-3.5-flash-lite` from 1 Dec 2026, so it is **not** used. Fallback model if 3.8 returns 404: `gemini-3.5-flash-lite`. Key is pasted by the user in Settings, stored in `localStorage` only, never sent anywhere except Google's API.
- **No key, no problem:** deterministic offline generator (keyword → name, tagline, features, palette, SVG logo) always works. The UI says plainly which path produced each launch: "Made offline — no key" or "Made with Gemini 3.8 Flash".
- **Waitlist:** `localStorage` per launch slug by default (works on `file://` and Pages). Optional: `server.py` (Python stdlib only, no dependencies) serves the app and a JSON-file-backed `/api/waitlist` endpoint for a shared count when run locally. Optional Supabase config (URL + anon key in Settings) writes signups to a `waitlist` table instead — Supabase project does not exist here, so this is an opt-in, never the default, and no waitlist numbers are ever invented: every count starts at 0 and only counts real signups made in this browser (or in the JSON file / Supabase table).
- **Logo:** deterministic SVG generator (geometric mark from initials + palette) is the always-working path. Gemini image generation (`gemini-2.5-flash-image`, "Nano Banana") is **not** wired in: it needs a paid-tier key for most accounts and would fail silently on a free key on stage. README states this honestly.

## 3. Feature set (SaaS level, demoable in 24–48h)
1. **One-sentence input** — textarea, 280-char counter, empty / too-long / non-English handling (non-English is accepted and passed through; offline generator falls back to generic naming and says so). 3 pre-tested example prompts, one click each.
2. **Agent run with live steps** — 5 steps on the launch rail (Name, Copy, Logo, Page, Publish), each with real timing, streaming-style status text, and a 20-second live-call timeout that falls back to the offline generator and says so.
3. **Name + tagline + palette** — 3 name options from live AI (or 1 deterministic name offline), editable before publish. 3 palettes to pick from; each launch gets its own.
4. **3 landing-page templates** — Poster (editorial, big type), Split (hero left, signup right), Stack (centred, minimal). Rendered from structured JSON only — the model never writes raw HTML, so layouts cannot break. Template switcher re-renders instantly.
5. **Deterministic SVG logo** — geometric mark + wordmark from initials and palette; download as SVG/PNG (canvas export).
6. **Published page** — hash route `#/p/<slug>` (works on `file://` and Pages, no server routing needed). Copy link button. "Open live page" view is the real generated page, not a screenshot.
7. **Working waitlist** — email validation, duplicate-email handling ("You're already on the list"), confirmation state, live counter that ticks up on real signups, per-launch admin view listing signups with time, CSV export, clear-all (with confirm).
8. **Launch library** — every launch saved in `localStorage`; list, open, duplicate, delete. 3 pre-generated launches cached in the repo so the demo never starts blank: Mealwise, Shelfie, Tutorloop (see §6).
9. **Settings** — Gemini API key (localStorage only, show/hide, clear), model name shown, Supabase URL + anon key (optional), "test key" button that calls the API once and reports success/failure honestly.
10. **Copy/export** — copy page JSON, download launch as a standalone HTML file (self-contained, inline CSS + inline SVG logo), so a founder leaves with a file even with no hosting.
11. **Admin / demo view** — per-launch signup table; global "all signups" count is the sum of real signups only.

Out of scope (v2): real domain + deploy to Vercel, payments, email confirmation mails, analytics, team workspaces, AI image logos, multi-language copy.

## 4. Data model
```js
Launch = {
  id: string,            // "launch_" + base36 timestamp
  slug: string,          // url-safe, unique, e.g. "mealwise"
  prompt: string,        // the one sentence, verbatim
  name: string, tagline: string,
  nameOptions: string[], // live AI only; offline: [name]
  description: string,   // one-paragraph plain description
  features: [{title, text} x3],
  pricing: [{name, price, note} x3],   // price is "Free" / "₹X/mo" from AI or template; never invented as a real charge — labelled "sample pricing" when offline
  faq: [{q, a} x3],
  palette: {bg, ink, accent, muted, name},
  template: "poster" | "split" | "stack",
  logo: {svg: string, shape: string, source: "svg-generator" | "gemini-image"},
  source: "offline" | "gemini" | "cached",
  model: string | null,  // e.g. "gemini-3.8-flash"
  createdAt: ISO string
}
WaitlistEntry = { email: string, name?: string, slug: string, ts: ISO string, source: "local" | "server" | "supabase" }
Settings = { geminiKey?: string, model: "gemini-3.8-flash", supabaseUrl?: string, supabaseAnonKey?: string }
```
Storage keys: `opl_launches`, `opl_waitlist_<slug>`, `opl_settings`. Server file: `data/waitlist.json` (created on first signup, never committed with real emails — gitignored).

## 5. Complete user flow (end to end)
1. Land on the launcher. Headline says what it does in one sentence. The input is focused. Three example prompts sit under it.
2. Type (or pick) one sentence → press "Launch it" (or Cmd+Enter). Input validated: empty → inline error; >280 chars → counter turns red, trimmed on submit with a note.
3. Rail starts: **Naming…** (live: Gemini call, ≤20 s; offline: instant deterministic pick) → **Writing copy…** → **Drawing logo…** (SVG generator, labelled) → **Building page…** (template render) → **Publishing…** (save + route).
4. Result screen: rendered landing page preview (real template, switchable), name/tagline editable inline, palette swatches, logo with download buttons, source badge ("Made offline" / "Made with Gemini 3.8 Flash" / "Pre-made launch").
5. Press "Publish" (or it auto-publishes): URL becomes `#/p/<slug>`, copy-link button, "Open live page" opens the real page in the same tab's published view.
6. On the live page: visitor reads hero/features/pricing/FAQ, enters email (+ optional name) → "Join the waitlist". Validation errors inline. Success: confirmation line + counter increments (e.g. "You are #3 on the list" — only if 2 real signups already exist). Duplicate email: "You're already on the list — we'll write to <email>." (no second row).
7. Founder opens Admin (per launch): table of signups with timestamps, count, CSV export, clear-all. Library view lists all launches with their real signup counts.
8. Settings: paste Gemini key → "Test key" → green "Key works" or the real API error text. With a key, the next launch uses live AI; without one, the app says so on the run screen instead of pretending.
9. Download launch HTML: a standalone file with the page's CSS inlined and the SVG logo inline — opens anywhere, no server.

## 6. Pre-generated cached launches (hand-written, in `launches.js`)
1. **Mealwise** — "a meal-planning app for hostel students" — poster template, green palette. Slug `mealwise`.
2. **Shelfie** — "a pantry tracker that tells you what to cook with what you already have" — split template, amber palette. Slug `shelfie`.
3. **Tutorloop** — "a place where college students find a senior to clear one doubt in 15 minutes" — stack template, sky palette. Slug `tutorloop`.
Each is a complete `Launch` object with real copy (no lorem), sample pricing labelled as sample, and 0 signups — the waitlist starts empty.

## 7. Demo script (2 minutes)
- **0:00–0:20** — "Every founder starts with one sentence." Type "a meal-planning app for hostel students" live. Show the rail ticking: Naming, Writing copy, Drawing logo.
- **0:20–1:00** — Page builds on screen: name, tagline, logo, hero, features. Point out the palette and logo were generated, not picked from a gallery. Switch templates once to show the same content in a different layout.
- **1:00–1:30** — Publish, open `#/p/mealwise`, invite the audience to join the waitlist. The counter ticks up live as someone signs up.
- **1:30–2:00** — Open Admin, show the new signup row with its timestamp. Close: "One sentence in, a launchable startup out — name, brand, page, and waitlist." If the live call stalls past 20 seconds, the offline path takes over and you say so: "No key on this machine, so it built it offline — same page, same waitlist."

## 8. Risks + fallbacks
- Gemini slow / rate-limited / malformed JSON → 20 s timeout, one retry, then offline generator; UI labels the source honestly. Never fake a live generation.
- Model name changes → model is a setting (default `gemini-3.8-flash`, fallback `gemini-3.5-flash-lite` on 404), not hard-coded in one place.
- No network at venue → everything except live AI works from `file://`; cached launches + offline generator + localStorage waitlist all work offline.
- Supabase not configured → localStorage path is the default; Supabase is opt-in only.

## 9. Quality bar
- Node tests, 0 failures, exact count reported. Headless-Chrome screenshots at 1280px and 390px, zero horizontal overflow, read and fixed. README + MIT LICENSE. No gradients, glows, sparkle emoji, or cliché copy. No fake numbers. No dead controls.

## 10. Launch checklist
- [ ] Tests pass, screenshots read clean at both widths
- [ ] 3 cached launches open at `#/p/mealwise`, `#/p/shelfie`, `#/p/tutorloop`
- [ ] Offline launch works with no key; live launch works with a pasted key
- [ ] Waitlist signup → counter → admin row → CSV export, duplicate blocked
- [ ] Download HTML opens standalone; logo SVG downloads
- [ ] README honest limits section written; git init + human commits; no push
