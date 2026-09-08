<div align="center">

<img src="public/icon.svg" width="88" height="88" alt="TeacherFolio logo" />

# TeacherFolio

### Your teaching website. Ready in minutes.

**Chat → Studio → Publish.** The portfolio platform for educators — no code, 1,000+ themes, PWA, SEO, and one-click Vercel deploy.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Postgres](https://img.shields.io/badge/Postgres-Neon-4169E1?logo=postgresql)](https://neon.tech/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa)](public/manifest.json)
[![CI](https://github.com/beebus-builds/automate/actions/workflows/ci.yml/badge.svg)](https://github.com/beebus-builds/automate/actions)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Live demo](https://teacherfolio.vercel.app) · [Report bug](https://github.com/beebus-builds/automate/issues) · [Changelog](#changelog)

</div>

---

## ✨ Why TeacherFolio?

> Teachers deserve a site that looks as good as their work — without learning to code.

- **💬 Chat builder** — answer natural questions (name, subject, years, bio, courses, quote, photo) and watch the preview build live.
- **🎨 Visual Studio** — Elementor-style sections & blocks (hero, about, courses, timeline, contact, gallery, booking, newsletter, file, video, FAQ, table, countdown, map, reviews) with drag-drop, undo/redo, and live canvas.
- **🖌️ 1,000+ themes** — 100 palettes × 29 layouts × 20 font pairs. Search, preview, and switch anytime.
- **📦 ZIP or Deploy** — download a standalone `HTML/CSS/JS` bundle **or** push to Vercel with your own `slug.vercel.app`.
- **📸 Photo-first** — upload in chat or Studio, auto `gallerySectionFromPhotos`, validated by magic bytes.
- **📊 Dashboard** — inbox, bookings, posts, subscribers, testimonials, domains, notify settings, per-path/day analytics (`site_views`).
- **✨ AI polish** — one-click rewrite for bio/quote/posts via local Ollama `qwen3:8b` (fallback regex parser).
- **📱 PWA** — installable, offline fallback, stale-while-revalidate, update toast.
- **🔍 SEO & a11y** — unique titles, OG, sitemap, robots, semantic headings, keyboard, focus, reduced-motion.

---

## 🖼️ Preview

| Desktop builder | Mobile PWA | Generated site |
|---|---|---|
| ![Desktop](public/screenshots/desktop-1.png) | ![Mobile](public/screenshots/mobile-1.png) | ![Icon](public/icon-512.png) |

> Screenshots are precached by the service worker (`public/sw.js:9`) and served offline via `/offline` (`app/offline/page.tsx:1`).

---

## 🧭 How it works — teacher journey

```
Landing (/) → Build (/build) → chat collects TeacherData → Studio (/studio) → Dashboard (/dashboard)
     │              │                     │                       │                      │
  marketing     AuthModal           parseMessage            drag-drop           publish / deploy
   hero         login/register      llmExtract →            theme/style         /api/data → /api/build
  features      SameSite=strict     sanitizeExtraction      section order       → /s/:id
   FAQ           rotateSession       teacherDataToContent    60-step history   → /api/deploy
                 CSRF cookie        (lib/sitePayload:48)    auditSite (100)   → /api/download ZIP
```

1. **Register / Login** — `POST /api/auth` (`lib/auth.ts:53` PBKDF2 210k, `httpOnly Strict` `tf_session` + readable `tf_csrf`).
2. **Chat** — `app/build/page.tsx:95` streams `runAssistant` (`lib/assistant/engine.ts:415`) + `extractTeacherFields` (`lib/extract.ts:155`) → `lib/sitePayload:48` → `LivePreview` (`components/chat/LivePreview.tsx:1`).
3. **Studio** — `app/studio/page.tsx:54` pick palette/preset/font, compose `CustomSection[]` (`lib/sections.ts:33`), `auditSite` (`lib/audit.ts:21`) scores 0-100.
4. **Publish** — `PUT /api/data` → `saveContent` (`lib/db.ts:315`) + `POST /api/build` → `ensureSiteBuild` (`lib/builder.ts:37` TTL 30s + in-flight coalesce) → `runBuild` (`lib/db.ts:1345`) writes `public/_site/:id`.
5. **Visit** — `GET /s/:id` (`app/s/[teacherId]/route.ts:10`) injects `<base href="/s/:id/">` + CSP, serves cached HTML. Visitor posts message/booking/testimonial → `POST /api/messages|bookings|testimonials` → teacher inbox + optional mail (`lib/mail.ts:1` via Resend/SMTP).

---

## 🧱 Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2 (App Router, `proxy.ts:4`, Turbopack) |
| UI | React 19, Tailwind 4.1 (`app/globals.css:1` `@theme` tokens), `next/font` Inter |
| Language | TypeScript 5.8 `strict` (`tsconfig.json:1`) |
| DB | `pg 8.22` **Neon Postgres** (`USE_POSTGRES=true`) **or** `better-sqlite3 13` WAL (`lib/db.ts:6` `c(sql)` rewrites `$n→?`/`NOW→strftime`) |
| Auth | PBKDF2-SHA512 210k (`lib/auth.ts:7`), `crypto.timingSafeEqual`, AES-256-GCM at-rest `lib/crypto.ts:14`, HMAC CSRF `lib/csrf.ts:16` |
| File | `archiver 8`, `qrcode 1.5`, `zod 4.4` validation, magic-byte `lib/security.ts:24` |
| AI | Ollama `qwen3:8b` `lib/llm.ts:27` (`OLLAMA_HOST`) + regex fallback `lib/conversation.ts:33` |
| PWA | `public/sw.js:1` `CACHE_VERSION tf-cache-v3`, `public/manifest.json:1`, `components/PwaRegister.tsx:10` |
| Infra | `Dockerfile:1` multi-stage `node:22-alpine`, `docker-compose.yml:1` `postgres:16-alpine`, `proxy.ts` + `next.config.ts:5` CSP/HSTS |

---

## 🏗️ Architecture

```
app/
  layout.tsx              — viewport, metadataBase, PwaRegister + CsrfInjector, noise overlay
  page.tsx                — marketing + FAQ (details)
  build/page.tsx          — chat builder (isComplete, llmExtract, uploadPhotoFile)
  studio/page.tsx         — blocks/sections/media/theme/design + StudioUtils hist
  dashboard/page.tsx      — SitesTab/DomainsCard/NotifyCard/Inbox/Bookings/Posts/Audience/Analytics
  directory/page.tsx      — listPublicSites(60) grid → /s/:id
  s/[teacherId]/route.ts  — ensureSiteBuild + CSP + base href + no-cache
  api/* (24 handlers)     — auth|chat|data|build|extract|ask|polish|deploy|media|history|messages|bookings|slots|posts|comments|newsletter|broadcast|testimonials|views|domains|settings|qr|og|download|health|ready
lib/
  db.ts (2462+)           — Pool, 18 tables, getContent/saveContent, getViewStats (SQL GROUP BY), listPublicSites
  auth.ts | crypto.ts | csrf.ts | csrfClient.ts | CsrfInjector.tsx
  builder.ts              — REBUILD_TTL 30s + inFlight coalesce
  sitePayload.ts          — TeacherData → content doc (single source of truth)
  themes.ts               — 100 palettes × 29 presets ≈ 1k+ themes
  sections.ts | sectionTemplates.ts | audit.ts | logger.ts | mail.ts | rate-limit.ts | validation.ts | security.ts
public/
  sw.js                   — nav network-first → cache → /offline, asset SWR, LRU trim 120, no /api intercept
  manifest.json           — id:scope:/, standalone, window-controls-overlay, 192/512 any+maskable, screenshots wide/narrow, shortcuts
  _site/:id/              — per-teacher static site (ignored in git, .gitkeep kept)
template.html / css/style.css / js/script.js / themes/*.json — tokens {{PRIMARY_COLOR}} etc.
```

**DB tables (18):** `users, sessions, user_content, chat_state, media, history, visitor_messages, site_views, booking_slots("start"/"end" quoted), bookings("date"/"time" quoted), posts, site_domains, teacher_settings, post_comments, subscribers, testimonial_submissions, rate_limits, content` — FK `users→sessions|user_content|chat_state CASCADE`, others loose `teacher_id` fan-out.

---

## 📲 PWA

- **Installable:** `id:/` `start_url:/?source=pwa` `scope:/` `display:standalone` + 5 icons (192/512 any+maskable + SVG) `public/manifest.json:19`.
- **Offline:** `app/offline/page.tsx` (`use client` retry) precached `public/sw.js:10`, nav fallback `handleNavigation` `public/sw.js:89` → `caches.match('/offline')`.
- **Update:** `CACHE_VERSION tf-cache-v3` `public/sw.js:8` bump deletes old `activate` `public/sw.js:43`, `PwaRegister` `updatefound` + `controllerchange` reload guard + hourly `registration.update()` + visibility `components/PwaRegister.tsx:40`.
- **Headers:** `Service-Worker-Allowed:/` + `no-cache` for `/sw.js`, `manifest+json` `max-age 3600` `next.config.ts:28` + `proxy.ts:9`.
- **Install UX:** deferred `beforeinstallprompt` + session-dismiss flag, offline banner, update toast `components/PwaRegister.tsx:125`.

---

## 🔍 SEO & Accessibility

- **Platform:** `metadataBase` `app/layout.tsx:17` `new URL(siteUrl)`, `alternates.canonical`, `robots index:true`, `openGraph` + `twitter summary_large_image`, Google Fonts `display=swap` preconnect.
- **Generated sites:** `{{SEO_TITLE}}` `{{SEO_DESC}}` `{{SEO_IMAGE}}` `{{GA_SCRIPT}}` `template.html:6`, `h1 hero__title` `lib/db.ts:958` → `h2 section__title` hierarchy, `og:url` via `siteBase` `lib/db.ts:1742`, multi-page `about.html/courses.html/blog.html` `lib/db.ts:2014`.
- **Robots:** `allow:/` `disallow:/api/,/site-preview` `app/robots.ts:6` (teacher sites **indexable**), `sitemap.xml` `app/sitemap.ts:3` enumerates `/, /build, /directory, /offline` + up to 200 ` /s/:id` + 500 `published` posts.
- **A11y:** `header/main/footer/section`, `focus-visible` `css/style.css:57`, `prefers-reduced-motion` `css/style.css:1552`, hamburger `aria-expanded` `js/script.js:57`, review/newsletter forms `maxlength` + labels.

---

## ⚡ Performance & Security quick wins shipped (Phase 1)

- **Security:** `lib/sections.ts:50` `safeUrl` + `sanitizeHtmlBlock`/`sanitizeCustomHead`/`isSafeBgColor`, `lib/db.ts:1280` `e(content)`, `lib/db.ts:968` raster-only `data:image`, `proxy.ts:4` HMAC `hmacHex` Web Crypto `timingSafeEqualStr` (was `header!==cookie` bypass), `app/s/*` CSP, `ENCRYPTION_KEY`/`CSRF_SECRET` rotated `06a8…/cb30…` (old `e2e23…/2ad01…` removed from `.env.example`).
- **Perf/SEO:** `lib/db.ts:509` `getViewStats` PG `GROUP BY to_char(day)` + SQLite fallback `cutoffIso`, `lib/sitePayload:80` `Array.from` initials + `slice` caps (500k→500), `lib/db.ts:1752` `layout-[object Object]` fix `themeLayout`, `lib/builder:8` `siteDir` traversal guard.

---

## 🚀 Quick start (local SQLite, no env)

```bash
git clone https://github.com/beebus-builds/automate.git
cd automate
npm ci
npm run dev          # http://localhost:8000 (proxy) or :3000 (layout)
# open /build → chat → preview
```

## 🔧 With Neon + Ollama (prod-like)

```bash
cp .env.example .env   # fill DATABASE_URL, ENCRYPTION_KEY, CSRF_SECRET, VERCEL_TOKEN
# .env:
USE_POSTGRES=true
DATABASE_URL=postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require
ENCRYPTION_KEY= # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CSRF_SECRET=    # same
NEXT_PUBLIC_SITE_URL=https://your-domain.com
OLLAMA_HOST=http://localhost:11434  # optional — fallback regex parser works

npm run dev
# health:   curl http://localhost:8000/api/health  → {"ok":true}
# ready:    curl http://localhost:8000/api/ready   → {"ok":true, checks:{db:"ok"}}
```

| Var | Required | What |
|---|---|---|
| `USE_POSTGRES` | `true` for Neon | `false` → `better-sqlite3` `data/teacher.db` WAL |
| `DATABASE_URL` | prod | Neon pooled `?sslmode=require` |
| `ENCRYPTION_KEY` | prod | 64 hex AES-256-GCM for `users.vercel_token` at-rest `lib/crypto:14` |
| `CSRF_SECRET` | prod | 64 hex HMAC for `lib/csrf:16` (fallback `DATABASE_URL`) |
| `NEXT_PUBLIC_SITE_URL` | prod SEO | `https://teacherfolio.vercel.app` → sitemap/OG |
| `VERCEL_TOKEN` | deploy | `vcp_…` for `POST /api/deploy` `app/api/deploy:74` |
| `OLLAMA_*` | optional | `OLLAMA_HOST`+ `OLLAMA_CHAT_MODEL=qwen3:8b` |

---

## 🐳 Docker

```bash
docker compose up --build   # app:3000 + postgres:16 healthchecks
# prod with Neon: comment `db:` in docker-compose.yml and set DATABASE_URL
docker compose exec app node scripts/backup.mjs   # pg_dump or SQLite copy → backups/
```

`Dockerfile:1` multi-stage `deps→builder→runner` (`node:22-alpine`, `nextjs 1001`, `HEALTHCHECK fetch /api/health`).

---

## ☁️ Deploy (Vercel)

1. Import `automate` on Vercel, framework **Next.js**, Node 22.
2. Env: `USE_POSTGRES=true`, `DATABASE_URL`, `ENCRYPTION_KEY`, `CSRF_SECRET`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_TOKEN` (optional).
3. Build `npm run build` (`CI: ubuntu 22, npm ci → lint → typecheck → test → build` `.github/workflows/ci.yml:1`), output `/.next` + `public/_site` (gitignored).
4. `GET /s/:id` is `force-dynamic` `app/s/[teacherId]/route.ts:8` — visitors never stampede (`lib/builder:52` inFlight).

---

## 🔒 Security model

- **Passwords** `lib/auth:9` `randomBytes(32)` salt + `PBKDF2 210k SHA512` `iterations:salt:hash`, `timingSafeEqual` + `dummyVerify` 50k for unknown email.
- **Sessions** `lib/auth:53` `randomBytes(48)` 7d `httpOnly Strict` `tf_session` + readable `tf_csrf=HMAC(session)` `lib/csrf:16`, `rotateSession` on login, `proxy.ts:23` HMAC verifies `x-csrf-token` for mutating `/api/*` (auto via `components/CsrfInjector.tsx:1` patching `window.fetch`).
- **Uploads** `lib/security:24` magic `PNG 89 50 4E 47 / JPG FF D8 FF / GIF8 / RIFF+WEBP / ICO 00 00 01 00` + `10MB` (`25MB` PDF `lib/security:32`), `public/uploads/*` ignored.
- **DB** all `pool.query("…$1…$2", [val])` parametrized `lib/db:17`, `rate-limit` DB window `lib/rate-limit:39` (30/10min media, 10/10min build, 5/10min deploy, 60/min chat/history).
- **Headers** `next.config:5` `default-src 'self'` `script-src 'self' 'unsafe-inline' + GTM` `worker-src 'self'` `HSTS` prod `proxy:56`, `X-Frame DENY` `proxy:46`.
- **Generated sites** `app/s/*:38` CSP `default-src 'self'; script-src 'self' 'unsafe-inline' GTM; frame-src youtube/vimeo/google; img-src 'self' data: https:`.

> Rotate `DATABASE_URL` + `VERCEL_TOKEN` in Neon/Vercel dashboards if repo ever public — `.env` is gitignored (`.gitignore:10`).

---

## 🔌 API (24 handlers `app/api/*`)

`auth (register/login/token/logout)` `chat` `data` `build` `extract` `ask` `polish` `deploy` `media/[id]` `history` `messages` `bookings|slots` `posts|comments` `newsletter|broadcast` `testimonials` `views` `domains` `settings` `qr` `og` `download` + `health` `ready` — all with `zod` `lib/validation:46` `MAX_CONTENT 1MB` + `rateLimit` + `sanitizeText` `lib/security:54`.

---

## 🧪 Test & build

```bash
npm run typecheck  # tsc --noEmit → 0
npm run lint       # eslint . → 0 errors, 10 warns (raw <img>, font)
npm test           # vitest 12 files 101 tests
npm run build      # turbopack → 15 static + Proxy, prints Routes
```

Coverage: `auth 6` `content 8` `deploy 6` `history 2` `rate-limit 3` `security 14` `validation 8` `extract 10` `photos 9` `studio 13` `engage 18` `growth 4` — add `tests/xss` `tests/idor` `tests/pwa` for Phase 2.

---

## 📁 Project structure

```
.
├─ app/            # (build, studio, dashboard, directory, s/:id, site-preview) + api/*
├─ components/     # Logo, AuthModal, PwaRegister, CsrfInjector, Skeleton, chat/*
├─ lib/            # db, auth, crypto, csrf, builder, sitePayload, themes, sections, audit, logger …
├─ public/         # sw.js, manifest.json, icon-*.png, screenshots/, _site/ (per-teacher, ignored)
├─ template.html / css/style.css / js/script.js
├─ themes/         # index.json (24) + fonts.json — expanded to 100×29 via lib/themes
├─ tests/          # 12 vitest suites
├─ scripts/        # backup.mjs / restore.mjs / generate-icons.cjs
├─ proxy.ts / next.config.ts / Dockerfile / docker-compose.yml
└─ .env.example    # copy to .env
```

---

## 🤝 Contributing

PRs welcome — `npm run lint && npm run typecheck && npm test && npm run build` must pass (`ci.yml:24`). Please keep `public/_site` and `data/` out of git.

## 📄 License

MIT — see [LICENSE](LICENSE) (add your file; defaults to MIT).

---

<div align="center">

Built with 💜 for teachers everywhere.  
**TeacherFolio** — *Your teaching website. Ready in minutes.*

</div>
