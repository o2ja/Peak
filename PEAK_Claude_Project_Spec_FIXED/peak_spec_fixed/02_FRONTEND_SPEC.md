# PEAK JORDAN — FRONTEND & EXPERIENCE SPEC

## PRIMARY GOAL

Create a standout, premium-quality PEAK storefront: clean, fast, playful, tactile, and memorable. It should look art-directed for this specific matcha/café brand, not assembled from a generic template.

The storefront is the user's highest priority. The frontend must communicate with the separately running Node.js API; do not access PostgreSQL directly from browser code. Spend the most design attention on its opening viewport, drink storytelling, menu interactions, transitions, responsive behavior, and performance.

## DESIGN SYSTEM

Use the supplied brand extraction as the starting point:

- Peak Pink: `#F078A2`
- Soft Pink: `#F4A5BF`
- White: `#FFFFFF`
- Near Black: `#111417`
- Warm Gray: `#A7A0A2`

The source says these values are approximate and the font is not verified. Keep colors and typography in central tokens so they can be adjusted when PEAK supplies official assets.

Use a rounded geometric sans-serif direction (Nunito or a similar family is a suggested starting point, not an asserted official font). Establish:
- Display, heading, body, label, and price typography tokens.
- A reusable spacing scale.
- A consistent radius scale.
- Accessible text and control colors.
- Focus, hover, active, disabled, loading, and error states.
- Motion timing/easing tokens.

Use white or warm white as the primary canvas. Use pink to guide attention and establish brand recognition, with near-black for contrast and selected story sections. Avoid pink overload.

## SITE STRUCTURE

Build a complete public experience, adapting routes to the existing project:

1. **Home**
   - Brand-led hero with a memorable drink visual.
   - Short headline and clear CTA to explore the menu.
   - Featured drinks / popular picks sourced from the database.
   - Brand story or craft section, only with confirmed copy or clearly editable placeholder copy.
   - Menu preview and seasonal/featured content controlled by admin.
   - Dessert / pairing feature if supported by real menu data.
   - Location, opening hours, contact, and social links only when confirmed in settings.
   - Footer with essential navigation and editable business details.

2. **Menu**
   - Categories driven by database, for example Matcha, Iced Latte, Iced Tea, and Desserts. These are initial assumptions based on the user's brief and must remain editable.
   - Search and category filtering where useful.
   - Sort/order controlled by admin rather than arbitrary hardcoded arrays.
   - Featured, seasonal, unavailable, and sold-out states.
   - Strong product photography and consistent image ratios.
   - Responsive grid/list behavior with excellent mobile usability.

3. **Menu item detail or customization panel**
   - Name, description, price, image, category, availability, and ingredients only when supplied.
   - Size choices and add-ons/modifiers if configured.
   - Optional sweetness/ice/milk customizations only if PEAK confirms these are supported.
   - Clear price changes, validation, quantity, and add-to-cart feedback.
   - Allergen information only when verified by the business. Never infer that an item is allergen-free.

4. **Cart**
   - Add/remove items, update quantities, edit customizations, and show line totals.
   - Clear subtotal and any configured fee/discount.
   - Empty-cart, loading, and error states.
   - Revalidate item availability and pricing on the server during checkout.

5. **Checkout / order submission**
   - Collect only the information necessary for the enabled fulfilment mode.
   - Display a review of items and customizations.
   - Use server-calculated totals.
   - Show clear submitting, accepted, failed, and pending states.
   - Do not show a fake payment success page.
   - Keep pickup, delivery, cash, and online payment configurable until the client confirms policy.

6. **Order status / confirmation**
   - Show an order reference and status only after the backend confirms creation.
   - Display realistic, database-backed statuses.
   - Do not promise live tracking unless implemented.

7. **Optional pages**
   - About / brand story, contact, and policy pages if enough verified content exists.
   - Do not add empty pages just to inflate the scope.

## SIGNATURE HERO INTERACTION: MATCHA POUR

Create a memorable, premium opening sequence inspired by matcha preparation. The user's desired concept:

- A bowl or vessel of matcha is whisked.
- The vessel moves or tilts into a pouring position.
- Matcha visibly pours downward into a transparent cup containing ice.
- The cup fills progressively with matcha and finishes with a polished visual state.
- The sequence feels smooth, tactile, cinematic, and intentional, not like a cartoon loading animation.
- The animation should be part of the hero's storytelling and not block access to the headline, menu CTA, or navigation.

Implementation guidance:
- First inspect installed skills and choose the best approach from GSAP, React Three Fiber, CSS/SVG, or a hybrid.
- Prefer a high-quality 3D scene with React Three Fiber only if it can meet performance, responsive, and asset-quality goals. A carefully crafted 2D/SVG/CSS scene is preferable to a poor or heavy 3D scene.
- Animate liquid level, stream, cup tilt/position, ice visibility, and scene transitions coherently. Avoid obvious clipping or physically impossible motion.
- Use GSAP timelines for choreographed sequences when appropriate. Avoid multiple competing animation systems controlling the same properties.
- The animation must not hold up page interactivity or create a long blocking intro. Provide a skip/replay interaction only if it adds value.
- On low-power/mobile devices, or when WebGL is unavailable, gracefully use a lightweight fallback.
- Honor `prefers-reduced-motion`: show a beautiful static hero or a very short non-motion transition.
- Lazy-load heavy 3D assets when possible and avoid layout shift.

## SIGNATURE MENU INTERACTION: HAND-HELD DRINK SELECTOR

Above or at the start of the menu, create an interactive drink selector based on the user's concept:

- A stylized hand holds a cup.
- The visitor can move left/right using clear arrow controls, keyboard arrows, or a mobile-friendly swipe.
- Each change swaps the drink shown in the hand, for example matcha, iced latte, or iced tea.
- The selected drink name and related menu items update in sync.
- The selected state is obvious, with subtle motion and tactile feedback.
- The interaction must remain usable without hover, on touch screens, and with keyboard navigation.
- Use actual menu categories/products from the database when available. Any example drink types are development seed data, not confirmed products.
- Avoid using a single generic cup image for every product if the art direction promises distinct drinks.
- Use a well-designed SVG/illustration, layered image, or 3D object depending on quality and performance. Do not generate a clumsy hand illustration merely to tick the box.

## ANIMATION SYSTEM & SKILLS

The user has installed skills for Lenis, GSAP, design taste, UI/UX, and React Three Fiber. At project start, discover and read the actual available skill files and follow their instructions. Do not assume skill names, APIs, or installed packages without checking.

Use tools intentionally:
- **Lenis**: smooth scrolling only if it improves the experience; preserve native scroll expectations, anchor links, keyboard navigation, and reduced-motion behavior.
- **GSAP**: hero timelines, coordinated section reveals, and specific complex motion.
- **React Three Fiber**: hero/product scene only when it provides meaningful visual value and remains performant.
- **CSS/SVG**: preferred for lightweight UI motion, icons, simple line art, and fallback scenes.
- **Design/UI/UX skills**: use for layout critique, hierarchy, consistency, accessibility, and refinement.

Rules:
- Establish one clear owner for each animated property.
- Clean up timelines, observers, event handlers, and animation contexts on unmount.
- Avoid scroll hijacking, perpetual heavy animation, and motion that reduces readability.
- Use transforms and opacity where possible.
- Test touch and keyboard interaction.
- Keep content readable if all animation is disabled.

## MOTION QUALITY BAR

Use motion to express ingredients, craft, selection, and transitions:
- Hero pour choreography.
- Gentle image reveals and section entrances.
- Small button/cart feedback.
- Drink selector transitions.
- Subtle menu-item hover/focus feedback.
- Smooth drawer/modal transitions.
- Loading skeletons only when needed.

Avoid:
- Constant movement everywhere.
- Bouncy, game-like effects.
- Long scroll-jacking sequences.
- Animations that delay ordering.
- Scroll effects that cause jank on mid-range phones.
- Animating large expensive 3D scenes when off-screen.

## RESPONSIVE & ACCESSIBLE UX

Design mobile-first, not as a shrunken desktop:
- Compact, reliable navigation.
- Easy-to-tap controls.
- Menu cards and item customizations that work on small screens.
- Cart and checkout that do not overflow.
- Admin is specified separately and must also be responsive.
- Semantic HTML, labels, keyboard access, focus rings, contrast, alt text, and accessible dialogs.
- Avoid conveying selected/unavailable states through color alone.
- Respect reduced motion and ensure content is available if WebGL fails.

## QUALITY BAR

Before considering the storefront complete, verify:
- All navigation links and CTAs work.
- Menu content is served by the Node.js API from the local PostgreSQL database; the browser must never connect directly to PostgreSQL.
- Category selection, drink selector, customization, cart, and checkout flow work.
- Responsive layouts work at narrow and wide sizes.
- Loading, error, empty, sold-out, and success states exist where relevant.
- No layout shift from hero assets.
- No console errors or broken images.
- Reduced-motion and keyboard behavior work.
- Performance remains acceptable on mobile.
- SEO metadata and social preview metadata are present where appropriate.
