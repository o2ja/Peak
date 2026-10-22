# PEAK JORDAN — IMPLEMENTATION & QA CHECKLIST

Use this checklist throughout implementation. Mark items complete only after verifying the actual behavior, not merely creating the UI.

## 1. REPOSITORY, REQUIRED STACK & BRAND

- [x] Next.js + React + TypeScript frontend.
- [x] Separate Node.js + Express + TypeScript API backend.
- [x] Local PostgreSQL with Prisma ORM and checked-in migrations.
- [x] No Supabase, Firebase, or hosted BaaS dependency.
- [x] No direct browser-to-PostgreSQL connection.
- [ ] Docker Compose/local database instructions work where Docker is available. (partial: docker-compose.yml written but NOT run (Docker not installed here); scripts/local-db.mjs verified instead)
- [x] `.env.example`, repeatable seed command, and safe first-admin command exist.
- [x] Local filesystem uploads are validated and git-ignored; storage is abstracted for future production choice.

- [x] Existing repository and architecture inspected. (repo held only the spec and brand files)
- [x] All five PEAK specification files read.
- [x] Supplied brand identity PDF reviewed.
- [x] Actual installed Claude Code skills discovered and read. (no standalone Lenis skill is installed; the R3F skill's Lenis + GSAP recipe was used)
- [x] Existing logo/assets inspected; no logo distortion.
- [x] Source-derived colors stored as design tokens.
- [x] Approximate screenshot-derived colors and unconfirmed font documented.
- [x] Unknown menu/business details marked pending confirmation.
- [x] No existing working feature was rewritten without a reason.

## 2. PUBLIC WEBSITE

- [x] Home page.
- [x] Responsive navigation.
- [x] Clear menu CTA.
- [x] Featured items from database.
- [x] Brand/craft section uses approved or editable copy. (editable placeholder, labelled as such)
- [x] Footer and social/contact details from settings.
- [x] Menu categories from database.
- [x] Menu item cards and details.
- [x] Search/filter if implemented.
- [x] Sorting/order is configurable.
- [x] Active/inactive and available/sold-out states.
- [x] Image loading/fallback behavior. (PEAK's cut-out photos on colour tiles; without a photo, the item's dashboard colour as a cup seen from above, or the P mark)
- [x] ~~About/contact/policy pages only where content is available.~~ N/A: no verified content yet, so no such pages
- [x] Page titles and descriptions.
- [x] Open Graph metadata.
- [x] No broken links or dead buttons.
- [x] No unsupported claims, fake reviews, or invented business facts.

## 3. SIGNATURE HERO: MATCHA POUR

- [x] Bowl/vessel and whisking concept represented.
- [x] Pour sequence is coordinated and visually coherent.
- [x] Transparent cup and ice are visible.
- [x] Liquid level fills progressively.
- [x] Motion does not obscure hero text or CTA.
- [x] Hero does not block page interaction.
- [x] Responsive composition works on mobile and desktop.
- [x] ~~WebGL/3D failure fallback exists if using R3F.~~ N/A: R3F not used (SVG scene)
- [x] Heavy assets are lazy-loaded where possible.
- [x] Animation cleanup is implemented.
- [x] Reduced-motion version works.
- [ ] Performance checked on a representative mobile layout. (partial: layout checked at 390px; no device or Lighthouse profiling run)

## 4. HAND-HELD DRINK SELECTOR

- [x] Left/right controls work.
- [x] Keyboard interaction works.
- [ ] Touch/swipe works where implemented. (partial: swipe verified with pointer events in headless Chrome; not tested on a physical touch device)
- [x] Selected drink and related menu content stay synchronized.
- [x] Uses actual database content where available.
- [x] Seed examples are labelled as fictional/temporary.
- [x] Focus/selected state is visible without color alone.
- [x] No hover-only interaction is required.
- [x] Images/illustrations remain high quality at different sizes. (real cut-out photos in PEAK's hand photo; transparency and edges checked on dark, pink and light grounds)

## 5. MOTION & ACCESSIBILITY

- [x] Installed Lenis/GSAP/R3F/design/UI-UX skills were reviewed.
- [x] Each animated property has a clear owner.
- [x] Timelines, observers, and subscriptions clean up correctly.
- [x] No scroll hijacking.
- [x] Motion does not delay ordering.
- [x] `prefers-reduced-motion` is respected.
- [x] Semantic HTML and headings.
- [x] Keyboard navigation and visible focus.
- [x] Labels for all form controls.
- [x] Accessible dialogs/drawers. (native <dialog> for confirmations; there are no drawers)
- [ ] Contrast checked. (partial: the taste-skill inspector's contrast check passes on the home page at 1440/768/390; other pages checked by eye only)
- [x] Alt text for meaningful images.
- [x] Mobile tap targets are usable.
- [x] Main content remains usable without animation/WebGL.

## 6. MENU & DATA MODEL

- [x] Category schema and migration.
- [x] Menu item schema and migration.
- [x] Unique slugs and appropriate indexes.
- [x] Decimal-safe money fields.
- [x] Image storage strategy.
- [x] Active/featured/seasonal/available states.
- [x] Option/modifier schema only if needed.
- [x] Server-side validation of option selections.
- [x] Settings schema for configurable site content.
- [x] Order and order-item schemas.
- [x] Order snapshots preserve historical names/prices/options.
- [x] ~~Promotion schema only if included.~~ N/A: promotions not enabled (discountTotal stays 0)
- [x] Foreign keys and archive/delete behavior.
- [x] Repeatable development seeds.
- [x] No real customer data in seeds.
- [x] No secrets committed. (nothing committed yet; .env files are git-ignored)
- [x] Migrations run from a clean state. (a fresh peak_test database was migrated with migrate deploy)

## 7. CART & ORDER FLOW

- [x] Add item.
- [x] Remove item.
- [x] Change quantity.
- [x] Edit configured options.
- [x] Empty-cart state.
- [x] Current price and availability revalidated by server.
- [x] Invalid quantity rejected.
- [x] Inactive/sold-out item rejected.
- [x] Subtotal and total calculated authoritatively.
- [x] ~~Promotion validation server-side if enabled.~~ N/A: not enabled
- [x] Duplicate submission prevention.
- [x] Checkout only asks for necessary data.
- [ ] Fulfilment options are configurable and client-confirmed. (partial: configurable, but PEAK has not confirmed them (pickup on, delivery off))
- [x] Order creation is safe and transactionally consistent.
- [x] Customer receives a real order reference only after backend confirmation.
- [x] Error/pending/success states are honest.
- [x] Order status and payment status are separate.
- [x] No fake payment success.
- [x] ~~Payment provider/webhook verified if implemented.~~ N/A: no provider integrated
- [x] If provider is not configured, limitation is clearly documented.

## 8. ADMIN AUTH & SECURITY

- [x] Dedicated admin route/layout.
- [x] Secure login and logout.
- [x] No public admin signup unless intentionally required.
- [x] Safe first-admin provisioning documented.
- [x] No default public admin credentials.
- [x] Protected routes and operations.
- [x] Server-side authorization.
- [ ] API-side authorization and least-privilege database access verified. (partial: API authorization tested; the database runs as a single app role (no separate least-privilege role yet))
- [x] Public users cannot access private orders/customer records.
- [x] Client cannot change privileged order/payment status.
- [x] Environment variables documented without secrets.
- [x] Upload type/size validation.
- [x] Safe errors and no secret logging.
- [x] Rate limiting added where appropriate.
- [x] CORS restricted where relevant.

## 9. ADMIN DASHBOARD

- [x] Overview metrics from real records.
- [x] Useful zero-data state for new store.
- [x] Recent orders.
- [x] Search/filter orders.
- [x] Order details and snapshots.
- [x] Valid status transitions.
- [x] Status history.
- [x] Menu item list/search/filter.
- [x] Create/edit/archive/restore menu item.
- [x] Price and availability controls.
- [x] Category CRUD and ordering.
- [ ] Image upload/preview/failure handling. (partial: upload validation tested in the API tests; the browser upload form was not exercised with a real file)
- [x] Option/modifier management if enabled.
- [x] Site content/settings editor.
- [x] ~~Promotions only if supported.~~ N/A
- [x] Confirmation for destructive actions.
- [x] Loading, save, error, and empty states.
- [x] Changes appear on public site after save.
- [x] Authenticated Socket.IO/WebSocket updates or dependable polling/refetch behavior works as implemented. (polling every 15–20 s plus manual refresh; no WebSockets)
- [x] Duplicate realtime subscriptions are prevented. (one interval per view, cleared on unmount)
- [ ] Dashboard works on mobile/tablet/desktop. (partial: checked at 1440px and 390px before the redesign; after it only the login page was re-screenshotted, signed-in views not re-checked)
- [x] Admin actions audited where useful.

## 10. PERFORMANCE & PRODUCTION QUALITY

- [x] No obvious console errors.
- [x] No broken images.
- [x] Images optimized and lazy-loaded appropriately.
- [x] No unnecessary data fetching.
- [x] Caching does not leave stale menu/settings.
- [ ] Animation performance checked. (partial: only transform and opacity are animated; no profiler trace recorded)
- [ ] Layout shift checked. (partial: SVG and image sizes are reserved; CLS not measured)
- [ ] Mobile navigation/menu/cart/checkout tested. (partial: home and menu, including filter and search, exercised at 390px; the full checkout run was at desktop width)
- [x] Tablet layout tested. (home, menu and item pages at 768px; no horizontal overflow at 768/1024/1440)
- [x] Desktop layout tested.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Migrations/seeds verified.
- [x] Error states tested.
- [x] Keyboard/reduced-motion behavior tested.
- [ ] SEO and social metadata verified. (partial: metadata is defined; not validated with an external preview tool)

## 11. END-TO-END ACCEPTANCE FLOWS

### Customer flow
- [x] Visitor opens home page.
- [x] Visitor uses the drink selector.
- [x] Visitor opens the menu.
- [x] Visitor filters/browses categories.
- [x] Visitor opens an item.
- [x] Visitor selects valid options, if configured.
- [x] Visitor adds the item to cart.
- [x] Server validates current menu data and totals.
- [x] Visitor submits checkout/order.
- [x] Backend confirms the order.
- [x] Confirmation displays the real order reference/status.

### Admin flow
- [x] Admin logs in.
- [x] Admin creates or edits a menu item. (edited through the API proxy and with the UI's quick toggles; the full create form was not submitted in the browser)
- [x] Saved data persists in the database.
- [x] Public menu reflects the change.
- [x] Admin changes availability.
- [x] Public menu reflects unavailable/sold-out state.
- [x] Admin opens an order.
- [x] Admin updates its status through a valid transition.
- [x] Status history records the change.
- [x] Unauthorized user is rejected from protected actions.

## 12. FINAL HANDOFF

- [x] Document how to install and run locally with PostgreSQL, migrations, seeds, API, and frontend.
- [x] Production database/hosting/storage choices are documented as future decisions, not silently assumed.
- [x] Document migration/seed commands.
- [x] Provide `.env.example` with placeholders only.
- [x] List required external credentials by variable name, never value.
- [x] List menu, pricing, location, hours, fulfilment, and payment details needing PEAK confirmation.
- [x] State which tests actually ran and their results.
- [x] State any incomplete items honestly.
- [x] Do not claim deployment or production readiness unless verified.
