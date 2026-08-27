# Visual thesis — Pocket signal console

## Direction and rationale

Walk & Talk is a **pixel/demoscene language tool**, styled as a tiny signal console carried through a city at dusk. The interface borrows the crisp hierarchy, stepped waveforms, scanline texture, and square indicators of an imaginary 16-bit field recorder—not nostalgia for its own sake, but a visual model of the product's cadence: prompt, quiet gap, response, replay. Large contemporary type and generous controls keep the console legible while walking.

The home screen is intentionally a functional dashboard, not a generic marketing hero. Cyan means the next audible action, apricot marks recorded voice, and chartreuse marks something safely saved or due. Pixel details stay at the edges so the learner's prompt remains dominant.

## Palette

The product is explicitly single-mode: a dark dusk console is safer for evening commutes and gives the signal colors reliable contrast.

| Token | Value | Role |
| --- | --- | --- |
| Ink / background | `#090D18` | night street / app canvas |
| Panel | `#11192A` | raised instrument surface |
| Panel high | `#18243A` | active or nested surface |
| Grid | `#2A3850` | dividers and inactive tracks |
| Paper | `#F4F7EA` | primary text |
| Muted | `#A9B8C8` | secondary text (7.1:1 on ink) |
| Signal cyan | `#44E6E1` | primary action (12.7:1 on ink) |
| Apricot | `#FF9A6C` | voice/recording/warning |
| Lime | `#C7F36B` | saved/success/due |
| Danger | `#FF6B7A` | destructive/error |

No gradients. Subtle CSS grid lines and hard one-pixel highlights establish depth. Shadows offset rather than blur, like a sprite displaced from its origin.

## Typography

- **Headings and display:** `Arial Black`, `Avenir Next`, system sans. Heavy, compressed-looking uppercase for instant wayfinding.
- **Interface and prose:** `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace. It reinforces timed rehearsal and makes elapsed values stable with tabular numerals.
- Type steps: 12, 14, 16, 20, 28, and fluid 40–64px. Body never below 16px. Reading measure max 68 characters.
- No downloaded font files: the paired system stacks eliminate a font request and work offline immediately.

## Spacing, shape, and depth

- 4px base rhythm; common spacing: 8, 12, 16, 24, 32, 48px.
- Corners are clipped with CSS polygon shapes or restrained 2–4px radii, never pill-shaped cards.
- Touch targets are at least 48px. Content max width is 1180px; phone layout at 390px stacks the control rail beneath the now/next signal.
- Cards are reserved for independent decks and saved takes. Major zones use proximity, rules, and background shifts.
- Focus uses a 3px cyan outline plus 3px ink offset so it remains visible on every surface.

## Interaction grammar

- The central **signal track** always shows NOW → SPEAK → SAVED/DUE. State is expressed with words, position, and color.
- Primary actions are cyan rectangles with an offset ink shadow. Pressing shifts them two pixels, like a physical console key.
- Add/edit flows use native dialogs with managed focus; destructive actions name their target and require confirmation.
- During rehearsal the prompt occupies almost the whole viewport. Space toggles pause/resume, Escape ends, and the visible controls use the same actions.
- Every write yields an inline status message. Offline status is persistent but quiet: “OFFLINE / all local”.

## Motion

- 180ms transform/opacity transitions for button press and panel entry.
- The speaking-gap meter changes width linearly because it represents elapsed time; there is no decorative looping animation.
- A short stepped equalizer animation runs only while speech playback is active and stops with it.
- Under `prefers-reduced-motion: reduce`, all transitions and the equalizer stop; the timer changes numerically and progress jumps without interpolation.
- No flashes above 3Hz.

## Asset plan and provenance

### Hero illustration: `signal-walk`

- Subject: an androgynous solitary commuter walking along a simplified night footpath, speaking toward a small phone; abstract prompt blocks travel forward and recorded waveform tiles return behind them.
- World/materials: 16-bit demoscene city, dark navy tilework, crisp pixel clusters, limited cyan/apricot/lime palette, no simulated UI text.
- Light/lens: orthographic side view, calm twilight, high-contrast rim light, wide landscape crop with open negative space.
- Negative list: no readable text, no logos, no brands, no watermark, no photoreal person, no unsafe road crossing, no headphones that imply isolation, no extra limbs, no gradients.

Generation prompt: “Use case: stylized-concept. Asset type: responsive landing dashboard illustration. Primary request: an original 16-bit demoscene pixel-art scene of a solitary androgynous language learner walking on a clearly separated safe footpath at night, speaking toward a small phone; cyan prompt blocks travel ahead and apricot waveform tiles return behind, visualizing prompt–speak–replay. Scene/backdrop: abstract navy city silhouettes, tiny lime wayfinding lights, starless dusk. Style/medium: hand-pixeled demoscene key art, crisp square pixels, limited color clusters, no anti-aliased vector look. Composition: wide orthographic side view, figure on the right third, clean breathing room on the left, strong readable silhouette. Palette: #090D18, #11192A, #44E6E1, #FF9A6C, #C7F36B, #F4F7EA. Constraints: person remains on the safe footpath and aware of surroundings; no text, no logo, no watermark. Avoid: photorealism, brand devices, cars near subject, headphones, readable glyphs, gradients, anatomical artifacts.”

- Generated with the factory image model (`factory-image`, Azure AI Foundry) on 2026-08-27 using `/opt/fleet/lib/gen-image.sh`.
- Generated imagery is original for this product. Source PNG and prompt sidecar live in `assets/src/`; optimized WebP ships in `public/assets/`.
- App icons and waveform marks are original hand-authored SVG/CSS geometry by the product builder, MIT-licensed with the repository.

## Accessibility checks built into the system

All semantic state has a written label, not color alone. Controls pair icons with verbs. The illustration is supplementary and has descriptive alt text. The single dark treatment is painted at the root to prevent white flashes. Reduced-motion, 200% zoom, safe-area insets, keyboard paths, and screen-reader live feedback are first-class constraints.
