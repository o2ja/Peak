# PEAK Jordan — storefront, ordering API and admin

Monorepo (npm workspaces):

| Path | What | Stack |
| --- | --- | --- |
| `apps/web` | Public storefront (`/`, `/menu`, `/menu/[slug]`, `/bag`, `/checkout`, `/order/[ref]`) and the separate admin dashboard (`/admin/*`) | Next.js 16 App Router, React 19, TypeScript, GSAP + @gsap/react, Lenis |
| `apps/api` | REST API, auth, business logic | Node 24, Express 5, TypeScript, Prisma 7, Zod 4, argon2, express-session + connect-pg-simple |
| `apps/api/prisma` | Schema, versioned migrations, fictional dev seed | PostgreSQL 17 |
| `scripts/local-db.mjs` | Runs a project-owned PostgreSQL cluster from installed binaries (no Docker needed) | |
| `docker-compose.yml` | Alternative PostgreSQL for machines with Docker | |

No Supabase, Firebase or other hosted service. The browser only talks to the Next.js origin; `next.config.ts` proxies `/api/*` and `/uploads/*` to the Express API, so session cookies are first-party and the browser never reaches PostgreSQL.

## Run it locally

Requirements: Node 22+ (built on 24), npm, and either PostgreSQL 17 binaries (e.g. `C:\Program Files\PostgreSQL\17\bin`, or set `PG_BIN`) or Docker.

```bash
npm install

# 1. Database — pick one
npm run db:init      # creates ./.pgdata (user "peak"), prints the DATABASE_URL to use
npm run db:start     # starts it on port 5433 (npm run db:stop to stop)
#   or: PEAK_PG_PASSWORD=... docker compose up -d   (also port 5433)

# 2. Environment
cp apps/api/.env.example apps/api/.env          # set DATABASE_URL and a random SESSION_SECRET
cp apps/web/.env.example apps/web/.env.local

# 3. Schema + sample data
npm run db:deploy -w apps/api        # applies migrations (use db:migrate when changing the schema)
npm run db:seed -w apps/api          # fictional sample menu + default settings; safe to re-run

# 4. First admin (no public sign-up, no default credentials)
npm run admin:create -w apps/api -- you@example.com "Your Name"   # prompts for a password (12+ chars)

# 5. Run (two terminals)
npm run dev:api      # http://localhost:4000
npm run dev:web      # http://localhost:3000  — dashboard at /admin
```

### Checks

```bash
npm run typecheck    # both apps
npm run lint         # web (ESLint, next/core-web-vitals + typescript)
npm test             # API: vitest + supertest against a separate `peak_test` database (migrated + seeded, never reset)
npm run build        # API (tsc → apps/api/dist) and web (next build)
```

Production start: `npm run start -w apps/api` and `npm run start -w apps/web` after building, with `NODE_ENV=production` (enables `Secure` cookies and `trust proxy`).

### Environment variables (names only)

- API (`apps/api/.env`): `DATABASE_URL`, `SESSION_SECRET` (32+ chars), `PORT`, `WEB_ORIGIN` (comma-separated allowed origins), `UPLOAD_DIR`, `PUBLIC_API_URL`, `NODE_ENV`; `ADMIN_PASSWORD` optional for non-interactive `admin:create`.
- Web (`apps/web/.env.local`): `API_URL` (server-side), `NEXT_PUBLIC_SITE_URL`.

## Deploy to Vercel

Two Vercel projects from this one repo, plus a Neon Postgres database and a Vercel Blob store.

1. **API project** — Import the repo, Root Directory `apps/api` (settings come from `apps/api/vercel.json`).
   - Storage tab: add **Neon** (sets `DATABASE_URL` + `DATABASE_URL_UNPOOLED`) and a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`).
   - Env: `SESSION_SECRET` (32+ random chars), `WEB_ORIGIN` = the web project's URL, e.g. `https://peak.vercel.app`.
   - Deploy. Migrations run during the build.
2. **Web project** — Import the same repo again, Root Directory `apps/web` (Next.js detected).
   - Env: `API_URL` = the API project's URL, `NEXT_PUBLIC_SITE_URL` = this project's URL.
3. **Seed + first admin** (once, from your machine, with the production URL):
   ```bash
   cd apps/api
   DATABASE_URL="<neon url>" SESSION_SECRET="<same as Vercel>" npx tsx prisma/seed.ts
   DATABASE_URL="<neon url>" SESSION_SECRET="<same as Vercel>" npx tsx scripts/create-admin.ts you@example.com "Your Name"
   ```

If you add a custom domain later, update `WEB_ORIGIN` and `NEXT_PUBLIC_SITE_URL`.

## How it works

- **Prices are server-side only.** The client sends item ids, quantities and option-value ids. `apps/api/src/services/pricing.ts` is the single place prices are computed (exact `Decimal`, 3 decimals for JOD). Orders are priced again inside a serializable transaction, so an item sold out a moment ago cannot slip through.
- **Duplicate submits:** each checkout attempt carries an idempotency key (unique in the DB); a retry returns the existing order.
- **Order privacy:** a customer reads their order only with the random access token returned at checkout (kept in the order URL and localStorage; the page sends no referrer). Wrong token and unknown reference both return 404.
- **Order lifecycle:** `PENDING → CONFIRMED → PREPARING → READY → COMPLETED`, or `CANCELLED` from any open stage. Transitions are validated server-side with a conditional update (two staff can't both move the same order), and each one writes an `order_status_events` row with the staff member and an optional note. Payment status (`UNPAID → PAID → REFUNDED`) is separate and recorded by staff.
- **Snapshots:** `order_items` keep name, image, base price, chosen options with their price deltas, unit price and line total, so history survives menu edits.
- **Admin auth:** argon2id hashes, server-side sessions in PostgreSQL, HttpOnly + SameSite=Lax cookies (Secure in production), session regeneration on login, login rate limit, and every `/api/admin` route behind `requireAdmin`. The dashboard layout also checks the session on the server before rendering. Writes from foreign `Origin`s are rejected (CSRF guard).
- **Uploads:** PNG/JPEG/WebP detected from file bytes (not the filename), 3 MB limit, random file names, served from `/uploads`. `apps/api/src/lib/storage.ts` is the only storage code; replace `saveImage` to move to object storage.
- **Freshness:** the storefront fetches menu and settings with `no-store`, so a dashboard save shows on the next page load. The dashboard polls: orders and Today every 15–20 s, paused while the tab is hidden, plus a "Refresh now" button. The customer order page refreshes every 15 s while the order is open. There are no WebSockets.
- **Audit:** item/category/settings changes and payment changes go to `audit_logs` (Activity page); order stage changes go to each order's history.

## Storefront design notes

- **Tokens** live at the top of `apps/web/src/app/globals.css`: colours, five type sizes, spacing, shape and motion. Colours are the screenshot-sampled brand values (approximate). `--pink-ink #B5336A` is a darker pink for small text, because Peak Pink on white fails contrast. `--field-1…4` are the tile grounds: the two brand pinks plus two quiet supporting neutrals, not brand colours. Type is Bricolage Grotesque (display) with Figtree (text), loaded with `next/font`; neither is PEAK's confirmed font.
- **Direction:** a specimen catalogue. Every drink is a cut-out photo on a flat colour tile, same angle, same scale, named plainly underneath. Media is square-cornered, controls are fully round.
- **Hand-held selector** (`components/HandSelector.tsx`): PEAK's own hand photo holds each cut-out drink. It lists items that have a PNG/WebP picture, from categories with the dashboard's "Show in the hand-held cup selector" box ticked. Arrow buttons, ←/→/↑/↓ on the name list and a horizontal swipe change the drink. The cup, name, price, category, description and link change together, and the tile colour crossfades. GSAP owns each cup's transform and visibility, so only one cup is ever visible. Reduced motion swaps instantly.
- **Pour scene** (`components/PourScene.tsx`): a drawn bowl and chasen pour into the real matcha-latte photograph. A pale, washed copy of the same photo stands in as the empty plastic cup, and the real photo is revealed from the bottom up as the level rises. One GSAP timeline starts once when the section scrolls into view (about 6 s), highlights Whisk → Pour → Settle beside it, and offers "Pour again". Without JS or with reduced motion the finished cup is shown. React Three Fiber was not used: there are no 3D assets, and this 2D/photo hybrid met the brief better.
- **Home sections:**
  - Hero with the selector.
  - Pour scene.
  - "Our picks" (featured items, lifted tile plus mosaic).
  - Story, from settings, with a slow crossfade of three photos.
  - "Ice, milk, matcha, pink", with the photo settling as you scroll.
  - The whole menu on a dark board, with a cut-out cup riding down the centre; seasonal items get a pink band.
  - The closing field with the hand (mirrored).
  - Footer of tiles.
- **Menu page:** category tiles and chips filter, search narrows, and items show as tiles (first item of a category double size). An item with no photo shows its dashboard drink colour as a cup seen from above, or the P mark for desserts, never a stand-in photo.
- **Motion:** Lenis smooth scroll runs on GSAP's ticker; `[data-reveal]` blocks stagger in once, and `[data-drift]` photos settle with the scroll. All of it is skipped under reduced motion, and content is visible without JS.
- **Photos:**
  - Source files are in `pics/` (untouched); the site's copies are in `apps/web/public/images/`.
  - Studio shots with "hand" in the name, plus `IMG_6913` (strawberry matcha) and `matcha 2` (pink cloud), had their backgrounds removed. This used rembg 2.0.86 (`isnet-general-use` model) in a throwaway venv. Exports are cropped and saved as WebP with alpha in `images/drinks/`, and checked for transparent corners and for halos on dark, pink and light grounds.
  - `pics/hand.PNG` was already transparent and is `images/hand.webp`.
  - The four scene photos are resized JPEGs in `images/photos/`.
  - The seed points matching items at these files and fills an item's picture only when it has none, so dashboard choices are never overwritten. The API accepts `/images/drinks/…` as well as uploads.
  - To add a drink to the selector from the dashboard, upload a cut-out PNG/WebP with a transparent background.
- **Installed skills used:**
  - `design-taste-frontend`: direction "The specimen catalogue", seed 449291436. Type was redrawn by hand to follow the brand spec's sans direction. Team and masonry sections were dropped because there are no team photos and not enough distinct images. The inspector reports 0 FAIL at 1440/768/390; the remaining warnings are no video, fonts differing from the sheet, and two measurement quirks.
  - `gsap-react`.
  - `react-three-fiber` was read earlier for its Lenis + GSAP sync recipe. No separate Lenis skill is installed.

## Needs PEAK's confirmation (placeholders are labelled on the site)

- The whole menu: items, prices, sizes, milks, extras. The seed is fictional, and the announcement bar says so.
- Currency (seeded `JOD`), store timezone (unset, so the dashboard counts "today" in UTC), address, map link, opening hours, phone, email. Empty fields stay hidden.
- Fulfilment: pickup on, delivery off until zones and fees are confirmed. Payment: pay at pickup only.
- Story copy (seeded placeholder), real brand font, vector logo and wordmark (the wordmark is set in Bricolage Grotesque as a placeholder; the P mark is the raster extraction).
- Draft copy written for the redesign (pour steps, "Ice, milk, matcha, pink" notes, closing line) describes the drinks, not PEAK's operations. Please rewrite or approve it.
- The supplied drink photos: please confirm PEAK may use them. `IMG_6913` has a small sparkle mark in its corner of the kind some AI image tools add (the cut-out drops it). Honey Matcha, Blueberry Matcha and Strawberry Shake were added to the fictional seed because photos of them were supplied.
- Online payments: not integrated. That needs a chosen provider, an account, credentials and webhook verification. Nothing on the site claims card payment.
- Production hosting, database and file storage are deliberately not chosen yet.
