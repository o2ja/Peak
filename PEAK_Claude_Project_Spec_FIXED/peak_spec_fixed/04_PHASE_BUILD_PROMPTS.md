# PEAK JORDAN — FOUR-PHASE BUILD PROMPTS FOR CLAUDE CODE

## HOW TO USE THIS FILE

Read all five PEAK specification files and inspect the repository before coding. Discover the actual installed Claude Code skills and read the relevant ones (GSAP, Lenis, design taste, UI/UX, React Three Fiber, and related skills only if present). Never invent a skill or API. Use the skills to improve the result, not as a reason to add unnecessary libraries.

The user prefers a small number of meaningful phases. Complete these **four phases** in order. Each phase means implementation plus verification, not just planning. Do not claim a test or visual check passed unless it actually ran. Do not create additional project-spec `.md` files: keep these five PEAK specification files as the source of truth, and update the existing README/checklist where appropriate.

## NON-NEGOTIABLE STACK

- Frontend: **Next.js + React + TypeScript**.
- Backend: **separate Node.js + Express + TypeScript API**.
- Database: **local PostgreSQL + Prisma ORM + versioned migrations**.
- Admin auth: code-owned secure server-side sessions, password hashing, HTTP-only cookies, protected API routes, and a documented first-admin setup command.
- Local uploads: validated filesystem storage behind an abstraction.
- Live updates: Socket.IO/WebSockets for useful order/menu changes if appropriate; otherwise reliable polling/refetch.
- No Supabase of any kind, no Firebase, no hosted BaaS, and no direct browser-to-database connection. Do not switch to SQLite for convenience.
- Include Docker Compose for local PostgreSQL where available, `.env.example`, repeatable seeds, and exact local run instructions. Production hosting/database/storage decisions are deferred until the user chooses to deploy.

If the existing repository uses a prohibited BaaS, inspect it carefully and replace that integration with this architecture. Preserve unrelated working features where sensible.

---

## PHASE 1 — REPOSITORY AUDIT, BRAND SYSTEM & PROJECT FOUNDATION

1. Inspect the complete repository, current implementation, package manager, dependencies, scripts, routes, environment setup, assets, and tests before editing.
2. Read all five PEAK specification files and the supplied brand identity PDF. Inspect available logo/image files and their dimensions/formats.
3. Discover and read actual installed design/motion skills. Record which relevant skills were found and used in the existing project documentation; do not create a sixth spec file.
4. Set up or refactor the required Next.js + TypeScript frontend, separate Express + TypeScript API, local PostgreSQL, Prisma, migrations, Docker Compose, `.env.example`, and safe development seeds. Make sure local startup does not require a cloud account.
5. Establish reusable brand tokens using the approximate extracted colors: `#F078A2`, `#F4A5BF`, `#FFFFFF`, `#111417`, `#A7A0A2`. Use a rounded font direction such as Nunito only as a suggestion, not a confirmed official font.
6. Preserve the provided logo without distortion. Do not invent business facts. Clearly label fictional menu seed data and leave actual prices, currency, location, hours, contact details, fulfilment, and payment settings pending confirmation.
7. Set up public/admin route separation, shared typed validation/contracts where useful, API error handling, and lint/typecheck/test scripts.

**Exit criteria:** architecture runs locally; migrations and seed scripts are repeatable; design tokens and base routes exist; brand assets and unknown business decisions are documented; lint/typecheck pass where configured.

## PHASE 2 — TOP-TIER PUBLIC WEBSITE & SIGNATURE ANIMATIONS

1. Prioritize the public storefront's visual quality. Build a bespoke, clean, premium PEAK experience—not a generic café template or SaaS-looking storefront.
2. Build responsive Home and Menu experiences with strong typography, whitespace, polished imagery, accessible navigation, featured products from the API/database, editable content, and clear menu CTA.
3. Build the signature matcha animation: bowl/vessel and whisk preparation, a coherent tilt/pour, visible stream into a transparent cup with ice, and a progressively filling cup. Use the best actual approach after inspecting skills (GSAP + SVG/CSS or React Three Fiber only if quality/performance justify it). It must be smooth and memorable, not cartoonish or a blocking intro.
4. Build the hand-held drink selector above/near the menu: left/right controls change the drink shown in the hand (matcha, iced latte, iced tea as provisional examples). Add keyboard/touch support and keep selected drink, category, and related menu content synchronized with API data where available.
5. Implement item details/customizations only for options configured in data. Add functional cart, quantity edits, remove/update actions, checkout/order submission, clear confirmation, and honest error/pending states. Server must revalidate availability and calculate authoritative prices/totals.
6. Use fictional, clearly marked development seed items only until PEAK supplies its menu. Do not invent actual menu items/prices, allergens, reviews, awards, opening hours, address, delivery promises, or health claims.
7. Apply responsive behavior deliberately for phones, tablets, laptops, and large desktop screens. Add SEO/social metadata, image optimization, loading/empty/error/sold-out states, keyboard/focus behavior, and `prefers-reduced-motion` support.
8. Keep motion purposeful: no scroll hijacking, no constant motion everywhere, no heavy animation that delays ordering. Provide graceful static/lightweight fallbacks for WebGL failure or reduced motion.

**Exit criteria:** public pages and controls actually work; menu comes from the API/database; selector and matcha pour are usable and responsive; cart/order flow is real; no dead buttons; core content remains usable without animation.

## PHASE 3 — REAL BACKEND, DATABASE, ADMIN DASHBOARD & LIVE DATA

1. Implement/verify Prisma schema and migrations for site settings, categories, menu items, configured item options, orders/order items with immutable price/name snapshots, admin users/roles, order status history, and promotions only if implemented. Add constraints, indexes, foreign keys, and sensible archive behavior.
2. Implement API validation and business logic in the Express backend. Never trust client prices, discounts, totals, availability, permissions, or requested privileged status transitions. Use exact decimal/numeric money handling and transactions for order creation.
3. Implement secure admin login/logout, password hashing, HTTP-only sessions, authorization on every protected API operation, rate limits for sensitive public endpoints where appropriate, safe first-admin provisioning, and secure upload validation. No public admin signup and no default credentials.
4. Build a separate, polished, responsive admin dashboard with real data: overview metrics, recent orders, order search/filter/details, status transitions/history, menu CRUD, categories, image upload, availability/featured/seasonal controls, configurable options where needed, site content/settings, and promotions only if included.
5. Make all dashboard actions persist to PostgreSQL and reflect on the public website after successful saves. Implement authenticated Socket.IO/WebSocket updates for relevant changes or dependable polling/refetch if realtime adds unjustified complexity. Prevent duplicate subscriptions and handle reconnects/stale data.
6. Use local filesystem uploads for development behind an adapter; do not require cloud storage. Do not use Supabase Auth/Storage/Realtime/Functions or any hosted BaaS.
7. Keep payment and fulfilment policies configurable. Do not claim online payments are active without a real provider and verified server-side webhook flow. If credentials are unavailable, document the integration as pending and do not simulate a real successful payment.
8. Ensure public requests cannot access private orders/customer records, and browser code never connects directly to PostgreSQL. No secret belongs in client bundles or source control.

**Exit criteria:** secure admin login works; menu CRUD persists; storefront reflects saved changes; order creation is server-validated and transactional; order status history works; unauthorized requests are rejected; local DB/migrations/seeds work; meaningful live update/refetch behavior is verified.

## PHASE 4 — DESIGN POLISH, FULL QA & HANDOFF

1. Conduct a deliberate visual critique using actual design/UI skills. Refine spacing, typography, hierarchy, image quality, responsive layout, motion timing, and dashboard consistency. The storefront is the highest visual priority; the dashboard must still feel smooth and complete.
2. Test the full customer path: home → drink selector → menu → item/customization → cart → checkout → backend-confirmed order reference → admin order view/status update.
3. Test the admin path: login → create/edit category/product → upload image → save → verify public site update; change availability; inspect order history; verify unauthorized access is rejected.
4. Run actual available lint, typecheck, unit/integration tests, migrations from a clean database, seed repeatability, production builds, API security/validation tests, money calculation tests, duplicate-submit tests, and relevant end-to-end checks. Fix failures where possible.
5. Check desktop/tablet/mobile layouts, touch and keyboard interactions, focus visibility, contrast, labels, dialogs, reduced-motion behavior, broken links/images, console errors, layout shifts, image loading, caching, and animation performance.
6. Verify `.env.example` contains placeholder names only, `.gitignore` excludes secrets/uploads/build outputs, and no credentials or customer data are committed.
7. Update the existing implementation checklist and README with verified outcomes and exact local install/run/migrate/seed/test/build commands. Keep the five supplied `.md` files; do not add another project-spec file.
8. Final report must clearly separate completed and tested features from unverified or blocked items. List environment variable names (never values), required PEAK decisions (menu, prices, currency, hours, location, fulfilment, payment), and how to run locally. Do not claim deployment or production readiness without verification.

**Exit criteria:** checks have real results; known gaps and client decisions are explicit; the app can be run locally from the handoff instructions; no unsupported claim of production readiness.
