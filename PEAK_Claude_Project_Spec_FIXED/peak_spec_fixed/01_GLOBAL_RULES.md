# PEAK JORDAN — GLOBAL PROJECT RULES

## PROJECT MISSION

Build a production-minded, full-stack digital experience for **PEAK**, a Jordan-based matcha and café brand. The result should feel like a distinctive, polished brand experience rather than a generic café template.

The project includes:

1. A premium, highly interactive public storefront.
2. A real menu backed by a database.
3. A separate, protected admin dashboard.
4. A reliable order-management workflow, with payment and fulfilment options designed to be configurable.
5. A maintainable codebase with clear documentation and a repeatable verification process.

The public-facing website is the top priority. The dashboard and backend must be equally real, but must never compromise the speed, clarity, or visual quality of the storefront.

Do not stop at a visual mockup. Do not present buttons that do nothing. A feature is complete only when its UI, data flow, validation, loading/error/empty states, authorization, and relevant tests are addressed.

---

## FIRST ACTION: INSPECT BEFORE BUILDING

Before changing anything:

1. Inspect the complete existing repository, package manager, framework, routes, components, styling system, database setup, environment files, and installed dependencies.
2. Read all available project instructions and relevant Claude Code skills before implementation. The user has installed skills for **Lenis, GSAP, design taste, UI/UX, React Three Fiber, and related frontend work**. Discover the actual available skill names and read their instructions; do not assume a skill exists or invent its API.
3. Review the supplied PEAK brand identity PDF and any supplied logo/assets. Treat the PDF as an observational extraction from social screenshots, not an official complete brand guide.
4. Review this five-file specification before coding. Keep these files as the source of truth.
5. Preserve working code where sensible. Do not replace an existing project with a fresh template without a clear technical reason.
6. Required default stack for a new build: **Next.js + TypeScript for the frontend, a separate Node.js + Express + TypeScript API backend, PostgreSQL running locally for development, and Prisma ORM with checked-in migrations**. Use npm unless the existing repository clearly uses another package manager. This is a code-owned architecture: do not use Supabase, Firebase, or another hosted Backend-as-a-Service. Do not use hosted database/auth/storage services during local development.
7. If an existing project currently uses Supabase or another BaaS, inspect it, then replace that dependency with the required code-owned backend/database architecture; do not preserve Supabase merely because it already exists. Preserve unrelated working features where sensible. Document migration decisions.
8. Use local PostgreSQL (for example via Docker Compose) and local filesystem uploads during development. Keep connection strings and file-storage implementation configurable behind environment variables/interfaces so deployment choices can be made later without rewriting business logic. Do not deploy or migrate data unless explicitly asked.

Do not ask the user to restate information already present in the brand PDF or these specifications. If a real business decision is genuinely unknown, use a clearly labelled configurable placeholder and list it for client confirmation.

---

## BRAND IDENTITY: SOURCE-DERIVED DETAILS

The supplied brand extraction identifies:

- Brand name: **peak / PEAK Jordan**
- Primary accent: **Peak Pink `#F078A2`**
- White: `#FFFFFF`
- Near black: `#111417`
- Soft pink: `#F4A5BF`
- Warm gray: `#A7A0A2`
- Personality: playful, youthful, friendly, social-first
- Typography direction: rounded, friendly geometric sans-serif; Nunito or a similar rounded family is a recommendation, not a confirmed official font.
- Visual language: bold pink against white, soft pink, or near-black; rounded typography; simple bold compositions; casual, hand-drawn accents used sparingly.

The PDF says these colors are approximate samples from compressed screenshots, and the supplied P monogram extraction is raster, not a verified vector logo. Do not claim otherwise. Preserve supplied assets; do not redraw or distort the logo. If the original logo asset is available, use it. If not, use a clean temporary wordmark and document that it is a placeholder.

Use pink with restraint and confidence. The site should feel fresh, tactile, and premium, not childish, cluttered, or like a generic pink Shopify theme. Build a cohesive palette using the source colors plus carefully chosen accessible neutrals. Do not invent additional official brand colors.

---

## CREATIVE NORTH STAR

The experience should communicate the pleasure and craft of a well-made drink: ice, glass, matcha powder, whisking, pouring, foam, texture, and dessert details.

Visual direction:
- Clean white / warm-white surfaces with PEAK pink as a signature accent.
- Dark near-black sections where contrast improves storytelling.
- Rounded, friendly typography and deliberate editorial layouts.
- High-quality drink photography or carefully art-directed visuals.
- Large confident type, generous whitespace, crisp alignment, and consistent spacing.
- Smooth, purposeful transitions and small tactile interactions.
- A distinctive visual moment that people remember and want to share.

Avoid:
- Generic café templates.
- Generic SaaS visuals on the storefront.
- Too many pink panels competing with each other.
- Random floating blobs, meaningless parallax, excessive glassmorphism, or gratuitous gradients.
- Over-rounded cards everywhere.
- Animation that makes the site slow, disorienting, or difficult to use.
- Fake testimonials, fake awards, unsupported health claims, invented business history, or unverified store details.

Use creative judgement. The user explicitly welcomes unexpected ideas if they remain clean, polished, coherent, and usable.

---

## NON-NEGOTIABLE ENGINEERING RULES

1. Database-backed content must come from the backend, not duplicated hardcoded production data.
2. Use fictional, clearly labelled seed data until PEAK confirms the actual menu, prices, sizes, ingredients, allergens, hours, location, and fulfilment policy.
3. Never present estimated menu details as confirmed facts.
4. Keep UI, data access, business logic, validation, and database responsibilities separated.
5. Use reusable components and typed data contracts.
6. Avoid giant components, giant route files, duplicated business logic, and unexplained magic values.
7. Use database migrations for schema changes and repeatable seed scripts for development.
8. Validate all important inputs on the server, even if the UI also validates them.
9. Never expose service-role keys, private API keys, admin credentials, or payment secrets in browser code.
10. Enforce admin permissions server-side and with database policies/RLS where supported.
11. Do not trust client-submitted prices, discounts, availability, totals, stock, or payment status.
12. Do not fake successful payments, orders, emails, or database saves.
13. Use decimal-safe numeric types for money; never use floating-point arithmetic for authoritative totals.
14. Make asynchronous actions resilient to duplicate requests and race conditions.
15. Every meaningful async UI must have loading, success, failure, and empty states as applicable.
16. Support mobile, tablet, desktop, keyboard navigation, visible focus, semantic markup, contrast, and reduced motion.
17. Respect `prefers-reduced-motion`. Core content and navigation must remain usable without animation.
18. Use environment variables for secrets and provide a safe `.env.example` containing names and placeholders only.
19. Do not log passwords, tokens, payment secrets, or unnecessary customer data.
20. Do not mark a feature complete merely because a screen exists.

---

## REQUIRED TECHNICAL ARCHITECTURE

- Frontend: Next.js App Router + React + TypeScript.
- Backend: separate Node.js + Express + TypeScript REST API. Keep route handlers thin; use service/business-logic and repository/data-access layers.
- Database: PostgreSQL running locally for development, managed through Prisma ORM and versioned Prisma migrations.
- Local development: provide Docker Compose for PostgreSQL where Docker is available, `.env.example`, repeatable migration/seed commands, and clear run instructions. The application must not require a cloud account to run locally.
- Authentication: implement secure server-side sessions using a maintained, compatible library and HTTP-only, Secure-in-production, SameSite cookies. Store admin password hashes using a modern password-hashing algorithm. Do not create public admin signup or ship default credentials. Document a safe first-admin creation command.
- Uploads: local filesystem in development with strict type/size validation and generated safe filenames. Keep an adapter/interface so storage can be changed for production later.
- Dashboard updates: use Socket.IO/WebSockets for relevant live order/menu changes if stable in the repository; otherwise use reliable refetch/polling. Any realtime channel must be authenticated/authorized and cleaned up correctly.
- Validation: use a shared typed validation approach (for example Zod) at API boundaries. Never trust browser input for price, permissions, stock, or order status.
- Testing: include backend tests for auth, validation, money/order calculations, and critical workflows.

**Hard prohibitions:** no Supabase (including Supabase Auth, Storage, Realtime, Edge Functions, or hosted Postgres), no Firebase, no BaaS dependency, and no secret or database credential in frontend code. Do not switch to SQLite as a shortcut unless the user explicitly approves it.

## DATA SOURCE OF TRUTH

The backend/database is authoritative for:
- Menu items and categories.
- Prices and currency.
- Sizes, add-ons, modifiers, and availability.
- Product visibility and featured status.
- Promotions and eligibility.
- Order contents and totals.
- Order status and payment status.
- Store settings and customer-facing content.
- Admin permissions.

The client may calculate previews for responsiveness, but the server must recalculate and validate authoritative values before an order is accepted.

---

## PAYMENT AND ORDERING RULES

PEAK's exact payment and fulfilment policies have not been supplied. Keep them configurable and do not claim an integration is live unless it is actually implemented and tested.

Design for a clear order lifecycle:
Menu → Item customization → Cart → Checkout/order submission → Server validation → Order record → Admin fulfilment workflow → Customer confirmation.

Support only the fulfilment modes PEAK confirms. Until then, make pickup/delivery options configurable and visibly label them as pending client confirmation. Do not invent delivery zones, fees, opening hours, ETA promises, or phone numbers.

If online payment is configured:
- Use a real supported provider and server-side verification/webhooks.
- Keep payment status separate from order status.
- Never mark an order paid based on a browser redirect alone.
- If credentials/provider setup is unavailable, provide a clearly labelled development mode that cannot be mistaken for live payment; do not simulate a successful real charge.

If cash on pickup or another offline method is enabled by PEAK, represent it honestly as that method and record the actual status.

---

## WORKING METHOD

For every phase:
1. Inspect relevant existing code and dependencies.
2. Identify dependencies and risks.
3. Implement the actual feature, not just a plan.
4. Run appropriate lint, typecheck, tests, migrations, and build.
5. Exercise the complete workflow touched by the phase.
6. Fix actual failures where possible.
7. Update docs and the implementation checklist.
8. Report what is implemented, what was verified, and what still needs credentials or a real client decision.

Never claim a test, deployment, payment, integration, or visual inspection happened unless it actually happened.
