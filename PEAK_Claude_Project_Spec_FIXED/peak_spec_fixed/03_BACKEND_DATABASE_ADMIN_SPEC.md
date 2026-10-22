# PEAK JORDAN — BACKEND, DATABASE & ADMIN SPEC

## BACKEND GOAL

Build a real, secure data layer for the PEAK website. The public menu, prices, availability, featured items, and customer-facing settings must be controlled by the database and reflected in the storefront without code edits.

Inspect the existing repository first. Required stack: Next.js + React + TypeScript frontend; separate Node.js + Express + TypeScript API; local PostgreSQL; Prisma ORM and migrations. All backend, authentication, database, validation, and business logic must be code-owned. Do not use Supabase, Firebase, or another BaaS. If the current repository uses one, plan a deliberate migration away from it. Preserve unrelated working features when practical and document architecture decisions.

Do not build a frontend-only dashboard or hardcode the production menu in UI components.

## DATA MODEL

Design a normalized schema with migrations, constraints, indexes, timestamps, and appropriate foreign keys. Adapt names to the project's conventions.

### 1. `site_settings`
Editable single-store settings such as:
- Brand display name and logo asset reference.
- Hero heading, supporting text, CTA label/link.
- Currency code.
- Contact/social links.
- Address and map link, only if confirmed.
- Opening hours, only if confirmed.
- Enabled fulfilment modes.
- Enabled payment methods/provider configuration references (never secrets).
- Announcement banner.
- Default SEO title/description.
- Order instructions and policy text.
- Store timezone, defaulting only after confirming the business's actual timezone.

Use a predictable singleton/settings strategy. Do not hardcode business facts that have not been supplied.

### 2. `menu_categories`
Suggested fields:
- `id`
- `name`
- `slug` (unique)
- `description` (optional)
- `image_url` (optional)
- `sort_order`
- `is_active`
- `created_at`, `updated_at`

Example initial categories: Matcha, Iced Latte, Iced Tea, Desserts. These are inferred from the user's brief and must be editable; do not claim they are PEAK's confirmed official categories.

### 3. `menu_items`
Suggested fields:
- `id`
- `category_id`
- `name`
- `slug` (unique)
- `short_description`
- `description`
- `image_url`
- `base_price` using an exact decimal/numeric database type
- `currency_code` or store-level currency reference
- `is_active`
- `is_featured`
- `is_seasonal`
- `is_available`
- `sort_order`
- optional ingredient/allergen fields, only if verified and maintained responsibly
- timestamps

Prices, names, descriptions, categories, and visibility must be managed from the dashboard. Avoid putting prices or descriptions into frontend constants.

### 4. `menu_item_options` / `menu_item_option_values`
Support configurable choices where needed, such as size, milk choice, sweetness, ice level, or add-ons. Each option/value may carry an exact price adjustment and availability. Do not expose every possible customization by default; enable only options PEAK actually supports. Validate selections server-side.

### 5. `orders`
Suggested fields:
- Internal UUID and human-readable order reference.
- Customer name and necessary contact details.
- Fulfilment method and relevant details.
- Order status and payment status as separate fields.
- Subtotal, discount, fees, and total using decimal-safe numeric types.
- Promotion reference/snapshot where applicable.
- Customer notes with length limits.
- Created/updated timestamps.
- Idempotency key or another safe duplicate-submission strategy where appropriate.

Do not store unnecessary personal information. Restrict access to customer/order data.

### 6. `order_items`
Store an immutable purchase snapshot:
- Order ID.
- Menu item reference where appropriate.
- Item name and image/price snapshot at order time.
- Quantity.
- Selected options/modifiers snapshot.
- Unit price, adjustments, and line total.
- Any necessary notes.

Historical orders must remain intelligible if a menu item is renamed, edited, or archived.

### 7. `promotions` (only if enabled)
Support configurable code/name, discount type/value, active period, eligible items/categories, minimum subtotal, usage limits, and enabled state. Validate eligibility and recalculate discounts on the server. Do not let the client define discount values.

### 8. `admin_profiles` / roles
Use the application's own database user ID and a minimal role model. Admin privileges must be enforced in every protected API operation, not merely by hiding UI links. Use secure server-side sessions and HTTP-only cookies; hash passwords with a maintained modern algorithm.

### 9. `order_status_events`
Track status changes with actor, timestamp, previous status, next status, and optional internal note. Restrict notes to authorized staff.

### 10. Optional supporting tables
Add only when needed:
- `inventory` or `item_availability` if PEAK needs quantity-based stock tracking.
- `audit_logs` for important admin actions.
- `media_assets` if asset management warrants it.
- `newsletter_subscribers` only with consent and a real use case.

Do not invent an ingredient inventory system if the business only needs simple item availability. Keep the model proportionate to actual café operations.

## ORDER AND PRICE INTEGRITY

- Client sends item IDs, quantities, selected option IDs, and necessary customer/fulfilment data, not authoritative prices or totals.
- Server loads current menu data, validates active/available items and options, calculates each line, applies eligible promotions, computes totals, and creates the order transactionally.
- Reject invalid quantities, invalid option combinations, inactive products, stale prices, and unavailable items with clear errors.
- Prevent duplicate submissions and unsafe concurrent changes.
- Keep order state and payment state separate.
- Never let the browser mark an order paid or directly write privileged order statuses.
- If payment integration is not configured, clearly communicate that state and never simulate real payment success.

## ADMIN AUTHENTICATION & DATA SECURITY

- Create a dedicated admin area, separate from the public navigation.
- Implement application-owned authentication with secure server-side sessions and HTTP-only cookies; do not use a hosted auth provider.
- No public admin signup.
- Provide a safe first-admin provisioning command/script; never ship default public admin credentials.
- Protect all admin pages and every admin API operation server-side.
- Use PostgreSQL constraints and least-privilege database credentials. Since browser clients do not connect directly to PostgreSQL, enforce authorization in the API and database access layer.
- Public users may read only active public menu/settings fields.
- Customers must not be able to read another customer's orders.
- Only authorized admins may manage menu content, settings, promotions, and all orders.
- Do not expose private customer data through public queries.
- Add rate limiting to sensitive public endpoints where the stack supports it.
- Validate and sanitize uploads; restrict file types and sizes.
- Store secrets only in server environment variables; provide `.env.example` with placeholder values only.
- Use explicit CORS rules if relevant and safe error messages.

## ADMIN DASHBOARD UX

Create a distinct, polished admin dashboard with its own navigation and visual hierarchy. It can be more operational than the public storefront but must still be clean, fast, responsive, and coherent with PEAK's design language.

### Overview
- Today's orders and order value.
- Orders awaiting action.
- Current menu item availability / sold-out items.
- Recent orders.
- Top-selling menu items when enough real data exists.
- Order trend for a selectable date range when data supports it.
- Clear empty states for a new store with no orders.
- Metrics must be calculated from actual database records, never fabricated.

### Menu management
- List/search/filter menu items.
- Create, edit, archive, restore, and reorder items.
- Edit category, name, slug, description, image, price, active/featured/seasonal/available flags.
- Configure sizes, modifiers, and add-ons if enabled.
- Preview image before saving.
- Validate price and required fields.
- Confirm destructive actions.
- Display save progress and clear errors.
- Ensure changes appear on the public site after a successful save.

### Category management
- Create/edit/archive categories.
- Change display order and visibility.
- Prevent unsafe deletion when products still depend on a category; offer reassignment or archive.

### Order management
- Search/filter by reference, status, date, and fulfilment method.
- Open order details with item/options snapshots and totals.
- Change order status through valid transitions.
- Record status history.
- Show payment status separately.
- Confirm consequential actions.
- Reflect updates on the order list and detail view without stale state.
- Never fabricate a “live” update if polling/realtime is not actually configured.

### Promotions
- Create/edit/activate/deactivate promotions if included.
- Configure rules and eligibility.
- Validate on the server.
- Show active dates and usage state.

### Site content/settings
- Edit hero copy, announcement, featured items, contact/social links, and business details.
- Keep unknown details blank or marked pending confirmation.
- Ensure public pages reflect saved content.
- Do not allow arbitrary script injection through CMS fields.

### Team and permissions
- Only build multiple staff roles if PEAK needs them.
- If roles exist, clearly define permissions and enforce them server-side.
- Provide a secure logout.

### Activity and audit
- Log important changes where useful: price changes, item availability, order status, settings changes, and promotions.
- Avoid logging secrets or excessive personal data.

## REAL-TIME BEHAVIOR

The user wants the dashboard and site to respond promptly to changes.

- Use Socket.IO/WebSockets for meaningful live dashboard/store updates if appropriate; otherwise use dependable polling/refetch. Any live channel must be authenticated and authorized.
- Revalidate or invalidate caches after successful writes.
- Update local UI optimistically only when rollback on failure is handled.
- Prevent duplicate subscriptions and clean them up.
- Provide a reliable refetch/manual refresh fallback.
- Public menu changes must not remain stale due to an unexamined cache.
- Realtime is not a substitute for authorization or server-side validation.

## DATABASE QUALITY

- Version all schema changes with migrations.
- Add unique constraints for slugs and order references.
- Add indexes for common menu/order queries.
- Use foreign keys and deletion/archive policies deliberately.
- Use numeric/decimal for money.
- Use transactions for order creation and other multi-step critical writes.
- Seed only clearly fictional development examples.
- Keep seeds repeatable and safe to run in development.
- Never commit real customer data or credentials.

## REQUIRED LOCAL ARCHITECTURE & OPERATIONS

- Use Next.js + React + TypeScript for the web app and a separate Node.js + Express + TypeScript service for the API.
- Use local PostgreSQL with Prisma. Commit migrations and repeatable fictional seed data.
- Include a Docker Compose file for local PostgreSQL, API/frontend run scripts, and `.env.example`. Local startup must not depend on Supabase or a cloud account.
- Keep frontend API base URL, database URL, session secret, upload directory, and allowed origin configurable through environment variables.
- Include an explicit safe first-admin command and document it; never put credentials in source control.
- Local image uploads should be stored in a project-managed local uploads directory in development. Validate MIME type, extension, file size, and filename. Keep storage behind an interface so a production storage provider can be selected later.
- Make database/provider choices portable through environment configuration and migrations. Do not make a production database or hosting migration now; document options and required steps for later.
- Provide a root-level README or update the existing README with exact install, start, migrate, seed, test, and build commands. Do not create additional `.md` specification files; maintain the five supplied PEAK specification files.

## DEFINITION OF DONE

The backend/dashboard is not complete until:
- Admin login and logout work.
- Protected operations reject unauthorized requests.
- Menu CRUD persists to the database.
- Storefront reads current menu/settings from the backend.
- A menu edit appears publicly after save.
- Orders are created only after server validation.
- Order items preserve purchase-time snapshots.
- Order status transitions are validated and audited.
- Loading, error, and empty states are usable.
- Migrations and seeds run cleanly.
- Relevant automated tests and a production build pass.
