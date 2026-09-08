# Puzzler Website — Claude Code Handoff v1.0

**Organization:** Puzzler Consulting & Advisory Services LLC  
**Date:** September 8, 2026  
**Purpose:** Controlled handoff for reviewing the approved website materials and implementing the website without inventing brand assets or overriding locked decisions.

## 1. Read this first

Download the entire `Puzzler Website Implementation Bundle v1.0` folder before opening it in Claude Code. Filenames in the asset map are references; Claude Code must have the corresponding files on disk.

If an existing website repository is available, place the downloaded bundle at the repository root and preserve its folder structure. If no repository exists, open the downloaded bundle as the working directory and allow Claude Code to complete its preflight review before selecting or initializing a technical stack.

The bundle contains the verified materials currently available. Missing or unresolved assets are intentionally documented instead of being replaced with unapproved substitutes.

## 2. Bundle contents and status

| Relative location | Asset | Status | Authorized use |
|---|---|---|---|
| `docs/Puzzler_Website_Asset_Map_v1_0.md` | Asset implementation specification | Approved | Binding implementation source |
| `docs/Puzzler_Brand_Standards_v1_0.docx` | Brand standards | Approved | Binding brand source |
| `docs/Puzzler_Website_Claude_Code_Handoff_v1_0.md` | This handoff and execution prompt | Approved | Begin here |
| `public/assets/brand/puzzler_logo_4piece.svg` | Official four-piece mark | Ready | Primary web logo source; do not redraw |
| `public/assets/brand/puzzler_logo_4piece_1024.png` | Official raster mark | Ready | Fallback only |
| `public/assets/pieces-in-motion/Lock - Engine of Focus.png` | LOCK poster | Ready | Card/poster after crop verification |
| `public/assets/pieces-in-motion/QUIET_MIND_Option_C_20s_Master_Loop.mp4` | QUIET MIND lightweight loop | Ready | Muted preview; generate a poster derivative |
| `references/Puzzler Consulting Blueprint Hero.png` | Approved Blueprint Puzzle concept | Reference only | Do not use as the production hero |
| `review-required/full-lockup-candidates/puzzler_logo_300_transparent.png` | Full lockup candidate A | Review required | Do not place in production until selected |
| `review-required/full-lockup-candidates/puzzler_logo_300_transparent_1.png` | Full lockup candidate B | Review required | Do not place in production until selected |
| `review-required/IGNITE_keyframe_E_bronze_fall_16x9_candidate.png` | Possible IGNITE poster | Review required | Do not assume it represents the final video |
| `source-masters-do-not-publish/IGNITE.mp4` | Approved IGNITE source master located in Drive | Source only | Never load the 131 MB master directly on the homepage; create a lightweight preview/poster or link to its published destination |

## 3. Items that remain unresolved or must be produced

- Select the canonical full lockup from the two supplied candidates, or obtain the approved original vector/PDF.
- Create clean production Blueprint Puzzle SVG/CSS layers from the reference direction.
- Create one grouped Puzzler Method master vector and derive all seven states plus the static fallback.
- Create the QUIET MIND 1280×720 poster.
- Verify the IGNITE keyframe against the final video and create an optimized poster and lightweight preview if appropriate.
- Select the final approved *The Falcon and the Shadow* trailer and create a clean 16:9 poster. No Falcon video is included because a canonical selection has not been locked.
- Create the final 1200×630 social-sharing image after the homepage design is approved.
- Add a founder portrait only when completing a visually led About page; it is not required for homepage structure.
- Confirm form destination, scheduling destination, analytics, privacy/legal copy, and production domain workflow before launch.

Do not create filler media, invent destinations, or represent unresolved items as approved.

## 4. Locked website decisions

### Official identity

- Use the official four-piece square mark exactly as supplied: coral top-left, yellow top-right, green bottom-left, and teal bottom-right.
- Do not redraw, recolor, separate, rotate, animate, mirror, skew, approximate, or reinterpret the logo.
- Signature Orange appears only in the five-color signature bar. It is not a piece of the official logo.
- Use Poppins exclusively.

### Approved color tokens

- Puzzler Navy: `#1A1A2E`
- Deep Navy: `#0F0F1F`
- Coral: `#E94F4A`
- Signature Orange: `#F39C4A`
- Yellow: `#F5CF48`
- Green: `#7ABF5F`
- Teal: `#30A396`
- Pale Gray: `#F4F4F8`
- Accent Background: `#EAF6F4`

### Approved visual direction

The approved website visual system is **Blueprint Puzzle**: restrained blueprint grids, measurement marks, structural paths, and connection states in navy, teal, and steel-like tones. Official logo colors appear only as small accents.

Avoid flying pieces, constant glow, fast movement, a rotating logo, particles, strobing, glitch effects, or a neon cyber aesthetic. The hero connection paths may trace once and must then settle into a stable state. Mobile and reduced-motion experiences must reduce or remove decorative motion.

### The Puzzler Method

The seven canonical steps are:

1. Start With The Edge
2. Build The Frame
3. Sort The Pieces
4. Use Visual Cues
5. Take Breaks
6. Avoid Common Mistakes / Don’t Get Stuck On One Piece
7. Risk Correction

The three client-facing phases are:

- **Start With The Edge:** Steps 1–3
- **Sort and Build:** Steps 4–6
- **Activate and Sustain:** Step 7

The three organizational outcomes are **Capable, Competitive, and Resilient**.

Locked names include **The Puzzler Method**, **Build It to Hold**, and **Pieces in Motion**. The Pieces in Motion subtitle is: **“What we’re building, testing & learning.”**

### Approved homepage section inventory

The approved homepage work includes:

- Hero
- The Operator Gap
- The Puzzler Method
- Capable, Competitive, and Resilient
- Build It to Hold / five practice areas
- Ways to Begin
- Who We Serve
- Pieces in Motion
- Fit Call

If a more detailed approved architecture or copy document is present in the repository, it controls exact order, content, and calls to action. Do not invent claims or present temporary copy as approved final copy.

## 5. Claude Code execution prompt

Copy everything below this line into Claude Code from the website repository or downloaded bundle root.

---

You are the senior web engineer and implementation lead for the official website of Puzzler Consulting & Advisory Services LLC.

Your assignment is to review and execute the complete `Puzzler Website Implementation Bundle v1.0`. This is a controlled implementation project, not an open-ended redesign.

### Primary objective

Build the strongest production-ready implementation supported by the approved specifications and verified assets while preserving the Puzzler brand exactly.

Work autonomously through this loop:

**Inspect → Understand → Plan → Implement → Test → Visually Review → Correct → Re-test → Document**

Continue until every supported acceptance gate passes or a genuine missing-input blocker remains.

### Source-of-truth order

Use this hierarchy when materials conflict:

1. Locked decisions in `docs/Puzzler_Website_Claude_Code_Handoff_v1_0.md`
2. Any more detailed approved homepage architecture, responsive, interaction, or copy specification found in the repository
3. `docs/Puzzler_Website_Asset_Map_v1_0.md`
4. `docs/Puzzler_Brand_Standards_v1_0.docx`
5. Approved original brand and media assets
6. Existing website code
7. Your own judgment

Never let existing code override an approved brand or content decision.

### Preflight review

Before editing:

1. Read every document in `docs/` completely.
2. Inspect the complete repository and bundle structure.
3. Identify the framework, build system, routes, styling method, components, dependencies, tests, and deployment configuration.
4. Verify each asset physically exists at the expected location.
5. Classify each asset as production-ready, reference-only, review-required, source-only, missing, or excluded.
6. Inspect existing code for recreated logos, unapproved colors, duplicate assets, baked-in text, inaccessible interactions, obsolete imagery, and broken media.
7. Preserve unrelated work and functional integrations.

Create or update `IMPLEMENTATION_STATUS.md` with available files, missing files, conflicts, non-blocked work, launch blockers, and the planned implementation sequence.

Do not stop merely because some media is missing. Continue all non-blocked structural and technical work.

### Implementation rules

- Use the existing technical stack when viable. Do not migrate frameworks merely from preference.
- If no viable application exists, document the recommended minimal maintainable stack before initializing it.
- Use the supplied logo file itself. Remove any logo recreated with HTML, CSS, canvas, or inline polygons.
- Use Poppins exclusively and implement the approved colors as centralized design tokens.
- Render the five-color signature bar as equal Coral, Orange, Yellow, Green, and Teal segments.
- Create clean, scalable, text-free SVG/CSS layers for the Blueprint Puzzle system.
- Never use the blueprint reference image as the production hero.
- Build the Method from one grouped master vector and derive all seven states; do not redraw seven unrelated diagrams.
- Keep the official logo separate from the animated Method illustration.
- Never fabricate or silently replace a missing approved asset.
- Preserve source masters and create optimized web derivatives separately.
- Never load the IGNITE master directly on the homepage.
- Do not create a filler Pieces in Motion card.
- Do not expose ZIP files, multi-hour masters, split video parts, production boards, transfer packages, or source masters publicly.
- Use temporary development placeholders only when unavoidable. Label them in code and prevent them from appearing as completed production content.
- Do not invent form destinations, email addresses, analytics identifiers, third-party services, privacy language, legal claims, testimonials, client names, outcomes, or performance claims.

### Responsive, motion, and accessibility requirements

Implement and verify:

- Semantic page structure, headings, and landmarks
- Keyboard navigation and visible focus indicators
- Meaningful alternative text
- Sufficient color contrast
- Appropriate mobile touch targets
- No horizontal overflow
- Stable image and media dimensions to prevent layout shift
- Responsive behavior across mobile, tablet, laptop, and large desktop
- `prefers-reduced-motion` support
- A static Method fallback for reduced-motion users
- Reduced decorative motion on small screens
- No autoplay audio
- Pausable video where video is used
- A one-time blueprint trace that settles into a stable state
- No continuous glow, rapid movement, rotating logo, particle effects, or distracting animation

### Verification loop

For every section or asset group:

1. Implement the smallest complete unit.
2. Run formatting, linting, type checking, tests, and the production build available in the repository.
3. Start the local site.
4. Inspect the rendered result in a browser.
5. Review representative mobile, tablet, laptop, and large-desktop widths.
6. Check console errors, network failures, navigation, focus behavior, media controls, reduced-motion behavior, and horizontal overflow.
7. Compare the result against the source-of-truth files.
8. Correct each material problem.
9. Re-run the relevant tests.
10. Record the result and evidence in `IMPLEMENTATION_STATUS.md`.

Do not declare a section complete from code inspection alone. Do not disable tests, suppress errors, remove accessibility checks, or weaken configuration just to produce a passing result.

After three unsuccessful attempts at the same issue, document the failure, probable cause, attempted corrections, and exact decision or missing input needed. Then continue other non-blocked work.

### Acceptance gates

Do not describe the implementation as complete until:

- The production build succeeds.
- No critical runtime or console errors remain.
- The exact approved logo file is used without modification.
- Brand colors, Poppins, and the signature bar are accurate.
- All seven Method steps and three phases are accurate.
- Blueprint Puzzle behavior is restrained and responsive.
- Reduced-motion behavior works.
- Missing or unapproved media is handled honestly.
- Source-only and excluded assets do not appear in public output.
- Navigation and interactive elements work with mouse, keyboard, and touch.
- Mobile layouts have no clipped content or horizontal scrolling.
- Images and media are optimized.
- Metadata uses only approved information.
- The production build has been visually inspected.

### Final handoff

Provide:

1. A concise implementation summary.
2. Files created, changed, or removed.
3. Test, build, accessibility, and visual-verification results.
4. Assets resolved and derivatives produced.
5. Remaining missing assets or decisions.
6. Launch blockers.
7. Exact local run commands.
8. The recommended next action.

Do not deploy, publish, push commits, modify DNS, connect the production domain, or overwrite the live website unless separately instructed.

Begin with the preflight review, then execute all work fully supported by the bundle.

