# Puzzler Website Asset Map v1.0

**Organization:** Puzzler Consulting & Advisory Services LLC  
**Status:** Implementation specification  
**Date:** September 8, 2026

## 1. Purpose

This asset map identifies the production assets required to implement the approved homepage architecture, Blueprint Puzzle visual system, and responsive behavior specification. It separates assets that are ready, assets that should be used only as references, assets that must be produced, and final media that still must be selected or copied into the website collection.

The website should not become a gallery of unrelated puzzle imagery. Its core consulting sections rely on Poppins typography, the approved brand palette, restrained blueprint geometry, and one master visualization of The Puzzler Method. Photography and cinematic media are reserved for About content and Pieces in Motion.

## 2. Locked asset rules

- Use the official four-piece Puzzler mark exactly as provided: coral top-left, yellow top-right, green bottom-left, teal bottom-right.
- Do not redraw, recolor, separate, rotate, animate, mirror, skew, or reinterpret the official mark.
- Signature Orange appears only in the five-color signature bar. It is never a piece in the four-piece mark.
- Use Poppins exclusively across the website.
- The animated Method illustration is an independent blueprint diagram. It is not the official logo.
- Do not bake headlines, navigation, buttons, or other website copy into hero imagery.
- Do not use stock photographs merely to fill space.
- Do not place ZIP files, multi-hour video masters, split video parts, production boards, or transfer packages on the public website.

## 3. Brand foundation

| ID | Asset | Current source | Status | Website use / required action |
|---|---|---|---|---|
| BR-01 | Four-piece mark, vector | `puzzler_logo_4piece.svg` | **Ready** | Primary web source for the mark and favicon derivatives. Use the file itself; do not reproduce its geometry in page code. |
| BR-02 | Four-piece mark, raster fallback | `puzzler_logo_4piece_1024.png` | **Ready** | PNG fallback for platforms or components that cannot display SVG. |
| BR-03 | Full lockup on transparent background | `puzzler_logo_300_transparent.png` and `puzzler_logo_300_transparent_1.png` | **Verify and select** | Compare both with the canonical full-lockup variant and select the approved file for the header. If neither is the canonical full lockup, obtain the original approved SVG/PDF rather than rebuilding it. |
| BR-04 | Five-color signature bar | Brand Standards v1.0 | **Ready in specification** | Render in code as five equal segments: Coral `#E94F4A`, Orange `#F39C4A`, Yellow `#F5CF48`, Green `#7ABF5F`, Teal `#30A396`. No raster file is needed. |
| BR-05 | Brand color and typography tokens | `Puzzler_Brand_Standards_v1_0.docx` | **Ready in specification** | Use Puzzler Navy `#1A1A2E`, Deep Navy `#0F0F1F`, Puzzler Teal `#30A396`, Pale Gray `#F4F4F8`, Accent Background `#EAF6F4`, and Poppins weights 300–800. |
| BR-06 | Existing social-preview image | `puzzler_social_preview_640.png` | **Replace for launch** | Retain only as historical reference. Create a new 1200×630 preview after the homepage design is final. |

## 4. Blueprint Puzzle system

| ID | Asset | Current source | Status | Website use / required action |
|---|---|---|---|---|
| BP-01 | Approved visual reference | `Puzzler Consulting Blueprint Hero.png` | **Reference only** | Source of truth for the approved visual direction and general composition. Do not embed it as the hero because it contains interface text and a complete page mockup. |
| BP-02 | Hero blueprint field | New `blueprint-hero.svg` | **Produce** | Create a clean, text-free vector containing only restrained blueprint grid, measurement marks, structural paths, and connection states. It must scale without cropping essential content. |
| BP-03 | Repeating blueprint grid | CSS or new `blueprint-grid.svg` | **Produce in implementation** | Use a very low-opacity grid on Navy. It may be generated in CSS or as a small repeatable SVG. No raster texture. |
| BP-04 | Blueprint connection overlay | New `blueprint-connections.svg` | **Produce** | Separate layered paths used for the one-time hero trace. Paths settle after the initial draw; there is no continuous glow or particle motion. |

## 5. The Puzzler Method system

The Method should be built from one master vector so the geometry remains consistent through all seven steps.

| ID | Production asset | State shown | Status |
|---|---|---|---|
| PM-00 | `puzzler-method-master.svg` | All blueprint geometry and labeled animation groups | **Produce** |
| PM-01 | `method-state-01-edge.svg` | Outside boundaries and corner relationships traced | **Produce** |
| PM-02 | `method-state-02-frame.svg` | Stable, complete perimeter | **Produce** |
| PM-03 | `method-state-03-sort.svg` | Interior areas organized into working groups without flying pieces | **Produce** |
| PM-04 | `method-state-04-visual-cues.svg` | Selected relationships and paths clarified | **Produce** |
| PM-05 | `method-state-05-take-breaks.svg` | Motion stopped at a visible checkpoint | **Produce** |
| PM-06 | `method-state-06-whole-picture.svg` | Entire diagram restored to equal visibility so no area dominates | **Produce** |
| PM-07 | `method-state-07-risk-correction.svg` | One unstable connection identified, corrected, and returned to a durable state | **Produce** |
| PM-08 | `method-complete-static.svg` | Final stable diagram | **Produce**; mobile and reduced-motion fallback |

The seven static exports can be produced from the grouped master file. They should not be separately redrawn.

## 6. Core consulting sections

No photographic assets are required for the following homepage sections:

- The Operator Gap
- Capable, Competitive, and Resilient
- Build It to Hold / five practice areas
- Ways to Begin
- Who We Serve
- Fit Call

These sections should use typography, layout, rules, restrained line icons, and blueprint geometry. Icons must describe the subject; they must not use detached puzzle pieces as decorative bullets.

## 7. Pieces in Motion

Use three launch cards: digital storytelling, functional audiovisual work, and a third current experiment only when there is a real project to feature. Do not create a filler card.

| ID | Feature | Available asset | Status | Website decision |
|---|---|---|---|---|
| PIM-01 | *The Falcon and the Shadow* | Final trailers were referenced in production threads, but no final video or poster is present in the current durable asset inventory | **Copy and select** | Select one final approved trailer, copy it into the website asset collection, and capture a clean 16:9 poster. Do not use a script or prompt document as the public media asset. |
| PIM-02 | LOCK — Engine of Focus | `Lock: Engine of Focus.png`; vertical master `PUZZLER_LOCK_Engine_of_Focus_V3_10min_9x16.mp4` | **Poster ready; destination link required** | Use the PNG as the card image after confirming its crop. Link to the published viewing destination instead of loading the full master on the homepage. |
| PIM-03 | QUIET MIND | `QUIET_MIND_Option_C_20s_Master_Loop.mp4` | **Web preview ready** | Use the 20-second loop as the lightweight preview and create a matching 1280×720 poster. `Quiet Mind: Three Visual Directions.png` is a development board and should not be the final card image. |
| PIM-04 | IGNITE | `PUZZLER_static_water_ripple_pulse_10min_LITE.mp4`; separate approved final referenced as `IGNITE.mp4` | **Final source must be confirmed/copied** | Do not use the rejected floating-chain version. Copy the approved final `IGNITE.mp4`; use the lightweight water-ripple file only if confirmed to match that final visual. Create a 1280×720 poster. |
| PIM-05 | Additional experiments | None required for launch | **Optional** | Add only when there is a named, presentable project with a real destination. |

## 8. About and founder assets

| ID | Asset | Status | Decision |
|---|---|---|---|
| AB-01 | Professional portrait of Mark D. Williams | **Not located in the current asset inventory** | Not required for the homepage launch. Required before a visually led About page is completed. Use a current business-formal portrait with a neutral background and no logo overlay. |
| AB-02 | Biographical copy | **Available in existing firm materials** | Copy is content, not an image asset. Do not substitute résumé screenshots or document pages. |

## 9. Browser, sharing, and media derivatives

| ID | Asset | Specification | Status |
|---|---|---|---|
| WEB-01 | Favicon set | Derive from the exact mark-only SVG: SVG favicon plus 32×32 and 16×16 PNG fallbacks | **Produce from BR-01** |
| WEB-02 | Apple touch icon | 180×180 PNG derived from the exact mark-only source | **Produce from BR-01** |
| WEB-03 | Social preview | 1200×630 PNG using the final homepage visual system and approved copy | **Produce after final page design** |
| WEB-04 | Pieces in Motion posters | 1280×720, consistent Navy frame and Poppins label treatment | **Produce after final media selection** |
| WEB-05 | Responsive raster derivatives | WebP/AVIF versions for non-vector images; preserve original PNG files as sources | **Produce during implementation** |

## 10. Files excluded from the public website

- `IMG_5127.png` — social-platform screenshot, not website brand media.
- `Luminescent Puzzle Path to the Portal.png`, `Puzzle Monoliths at Dawn.png`, and `Puzzle Path to a Clearer You.png` — not part of the Blueprint Puzzle consulting identity. They may appear only when directly representing the creative project that produced them.
- `PUZZLER_IGNITE_YouTube_10min_16x9_FLOATING.mp4` — rejected floating-chain execution.
- Nine-hour QUIET MIND split `.part` files and reassembly scripts — storage and transfer materials only.
- ZIP archives and transfer packages — never public website media.
- `Quiet Mind: Three Visual Directions.png` — development comparison board, not final project art.
- The logo polygons embedded in the previous `index.html` — replace with the canonical logo file rather than retaining a code-redrawn mark.

## 11. Recommended production folder

```text
website-assets/
  brand/
    logo/
    signature/
    favicon/
  blueprint/
    hero/
    method/
  pieces-in-motion/
    falcon-and-shadow/
    lock/
    quiet-mind/
    ignite/
  people/
  social-preview/
  source-reference/
```

Keep original masters in their project folders. The website collection should contain only approved, optimized derivatives plus a short record pointing back to the source master.

## 12. Launch-critical production queue

1. Verify and select the canonical full-lockup file for the header.
2. Produce the clean hero blueprint SVG layers.
3. Produce the grouped Method master and its seven static states.
4. Select and copy the final *The Falcon and the Shadow* trailer.
5. Copy or confirm the approved final IGNITE video.
6. Create consistent 16:9 posters for Falcon, LOCK, QUIET MIND, and IGNITE.
7. Derive favicon and touch-icon files from the exact mark-only source.
8. Produce the social-preview image after the final homepage design is approved.

## 13. Readiness decision

The website has enough approved source material to begin implementation. The logo mark, brand rules, blueprint concept, LOCK artwork, and QUIET MIND preview are available. The missing assets are bounded and should not delay page structure or interaction development. Final public launch should wait until the canonical full lockup, Method states, Falcon selection, IGNITE final, and media posters are resolved.
