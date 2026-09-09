# Puzzler Website — Implementation Status

**Specification:** `Puzzler_Website_Asset_Map_v1_0.md` (September 8, 2026)
**Branch:** `claude/puzzler-website-implementation-m2rdqp`
**Last updated:** 2026-09-08 (cycle 3: Pieces in Motion embeds)

This file is the working record for the controlled implementation of the
homepage architecture, the Blueprint Puzzle visual system, and the responsive
behavior specification. It is updated at the end of every implementation
cycle. Sections marked **Complete** have been built, tested, and visually
inspected in a browser at mobile, tablet, laptop, and large-desktop widths.

---

## 1. Preflight findings

### 1.1 Stack

| Item | Finding |
|---|---|
| Framework | None. Static HTML with inline CSS per page. No build step. |
| Hosting | Vercel via GitHub auto-deploy (`vercel.json` holds two clean-URL rewrites). |
| Styling | Inline `<style>` blocks per page; CSS custom properties for the palette. |
| Fonts | Poppins self-hosted (`/fonts/*.woff2`, weights 400–800) on the legal pages; the homepage additionally loaded Poppins from Google Fonts. |
| Routes | `/` (index.html), `/privacy.html`, `/terms.html`, `/making-the-pieces-fit`, `/capability-brief`, `/puzzler_card.html`. `about.html`, `services.html`, `contact.html` are dormant (noindex, robots-disallowed, off-brand typography and palette). |
| Tests / lint / type checks | None existed. Added under `tools/` (see §5). |
| Analytics | Fathom (`data-site="LHOTKOPA"`) and Vercel Web Analytics already integrated on the homepage and legal pages. Preserved as existing integrations; not invented here. |
| Conversion | Calendly Fit Call link already live. Preserved. |

The existing stack is viable for a controlled implementation and has been kept.
No framework was introduced.

### 1.2 Available source files (present in the repository)

| Asset map ID | File | Notes |
|---|---|---|
| BR-04 | Five-color signature bar | Rendered in code; no file needed. |
| BR-05 | Color and type tokens | Values taken from the asset map and the prompt. The `.docx` itself is not present (see §1.3). |
| BR-06 | `puzzler_social_preview_640.png` (640×320, historical) | Superseded 2026-09-09 by WEB-03 (`social-preview.png`, 1200×630, rendered from `website-assets/social-preview/social-preview.html` by `tools/build-social-preview.mjs`). Not kept in the repo. |
| — | `puzzler_logo_teal_1024.png` | Single teal piece. Former source of the favicon / touch icons; no longer referenced by anything (icons now derive from BR-01). Not the four-piece mark. |
| — | `fonts/poppins-*.woff2` | 400–800 regular were present. 300 regular and 300–600 italic latin subsets added during preflight so the homepage no longer depends on Google Fonts. |
| — | `making-the-pieces-fit.mp4` + poster | Existing video page (not homepage media). Video untouched; poster regenerated 2026-09-09 (see §5). |
| — | `capability-brief.html` | Existing HeyGen embed page. Untouched. |

### 1.3 Missing source files (referenced by the asset map, not in repo or upload)

| Asset map ID | File | Impact |
|---|---|---|
| BR-01 | `puzzler_logo_4piece.svg` | **Resolved mid-session.** Retrieved byte-exact from the Drive bundle (6,345 bytes) to `assets/brand/`. Now used, unmodified, in the homepage header. |
| BR-02 | `puzzler_logo_4piece_1024.png` | Present in Drive. Binary transfer through the Drive connector corrupted the file (size mismatch), so it was discarded rather than kept. Copy manually to `assets/brand/`. Not required by any page yet. |
| BR-03 | `puzzler_logo_300_transparent.png`, `_1.png` | Present in Drive under `review-required/full-lockup-candidates/`. Same transfer problem; not on disk. Selection still pending (§4). |
| — | `Puzzler_Brand_Standards_v1_0.docx` | **Read in full from Drive.** Its rules were applied (pillar definitions, naming rule, logo-on-background matrix, closing block treatment). Copy the file to `docs/` when the bundle is dropped in. |
| BP-01 | `Puzzler Consulting Blueprint Hero.png` | Viewed in-session (supplied as an image) and present in Drive `references/`. Used for composition direction only; not on disk, not embedded. |
| PIM-01 | *The Falcon and the Shadow* trailer + poster | Not in the bundle (no canonical selection). |
| PIM-02 | `Lock - Engine of Focus.png` | In Drive `assets/pieces-in-motion/` (1.6 MB). Too large for the connector channel; copy manually. Destination link confirmed (§3). |
| PIM-03 | `QUIET_MIND_Option_C_20s_Master_Loop.mp4` | In Drive (3.8 MB). Copy manually; then produce the 1280×720 poster. |
| PIM-04 | `IGNITE.mp4` (131 MB, source master) + `IGNITE_keyframe_E_bronze_fall_16x9_candidate.png` (review) | Stay in Drive. Never load the master on the homepage. |
| — | Mono-white mark variant | Required by Brand Standards §8.1 for any logo on a Navy surface (secondary page headers). Not in the bundle. |
| AB-01 | Founder portrait | Not required for homepage launch. |
| — | Approved homepage architecture / responsive behavior specification documents | Not in repo, upload, or bundle. Section inventory and order follow `docs/Puzzler_Website_Claude_Code_Handoff_v1_0.md` §4. Section copy that is not present in existing approved firm materials is marked `<!-- DRAFT COPY -->` in the HTML and listed in §4. |

No missing asset was fabricated, approximated, or silently replaced.

### 1.4 Conflicts discovered in existing code

| # | Conflict | Resolution |
|---|---|---|
| C1 | `index.html`, `privacy.html`, `terms.html`, `making-the-pieces-fit.html`, `puzzler_card.html` draw the four-piece mark with inline `<polygon>` geometry (excluded by asset map §10). `puzzler_card.html` also flew and rotated it 720° in an intro animation. | Code-drawn marks removed everywhere; card intro removed. Homepage header now uses the approved SVG file on a white surface. Secondary pages have Navy headers, so their slots stay commented until the mono-white variant is supplied. |
| C2 | `index.html` head is duplicated (two charsets, two titles, two OG blocks). | Rebuild head once with a single approved metadata set. |
| C3 | Homepage hero used drifting, rotating puzzle pieces, a continuously pulsing signature bar, and a bobbing scroll cue (violates "no flying pieces / continuous motion"). | Replaced with the Blueprint Puzzle system: static grid, one-time trace that settles. Signature bar is static. |
| C4 | `--teal-glow: #4FC0B3`, `--teal-dark: #287F76`, `--navy-mid: #2E3450`, `--navy-light: #2A2A45` used widely; none are in the approved palette. | Replaced with approved tokens only. Teal `#30A396` on Navy measures 5.5:1 (AA for body text). On white / Pale Gray / Accent Background teal measures 2.8–3.1:1, so on light sections teal is used only for rules, icons, and large headings; body text is Navy. |
| C5 | Homepage loaded Poppins from Google Fonts in addition to the self-hosted files. | Self-hosted only. |
| C6 | `files short video.zip` (transfer package) and `scripts/build-favicons.ps1` live in the web root and are publicly served. | ZIP removed from the repo (its contents were already extracted). Non-web files excluded from deployment via `.vercelignore`. The PowerShell script was later retired in favour of `tools/build-favicons.mjs` (2026-09-09). |
| C7 | Favicon / touch icons are derived from the single teal piece, not from BR-01. | Regenerated from BR-01 on 2026-09-09 (`tools/build-favicons.mjs`); see §5. |
| C8 | Dormant pages `about.html`, `services.html`, `contact.html` use Fraunces / DM Sans and a different palette. | Out of scope for this asset map (they are noindex and unlinked). Recommend removal or rebuild in a later release (§6). |
| C9 | `puzzler_card.html` links Google Fonts and uses email `markdwilliams@…` not used elsewhere. | Only the code-drawn mark, the Google Fonts dependency, and the naming rule were changed. Contact details left as found. |
| C10 | Brand Standards §3 forbids "Puzzler Consulting & Advisory" without "Services". `capability-brief.html`, `making-the-pieces-fit.html`, and `puzzler_card.html` (including its vCard ORG line) used the forbidden form. | Corrected to "Puzzler Consulting & Advisory Services". |
| C11 | Brand Standards §8.1 permits the four-colour mark only on white or pale gray. The original design put the header on Navy. | Header moved to a white sticky surface with Navy text. |
| C13 | A root `public/` folder makes Vercel serve only that folder for build-less projects, producing a site-wide 404. | Bundle assets live at `assets/` instead; `check:assets` fails if a root `public/` directory reappears. |
| C12 | Handoff §4 lists the homepage sections with The Puzzler Method before Capable/Competitive/Resilient. | Sections reordered to match. |

### 1.5 Work that can proceed immediately

- Homepage rebuild with the locked section system, Poppins, approved palette, and signature bar.
- Blueprint Puzzle system: `blueprint-hero.svg`, `blueprint-grid.svg`, `blueprint-connections.svg` (BP-02/03/04).
- Puzzler Method master vector and the seven derived states plus the static fallback (PM-00..08), derived by script from the master.
- Pieces in Motion section shell with the locked title and subtitle and named cards without media or controls.
- Responsive layouts, keyboard navigation, focus indicators, reduced-motion behavior.
- Verification tooling (HTML validation, axe accessibility audit, console/network/overflow checks, screenshot review).
- Removal of code-drawn logos and excluded files.

### 1.6 Work blocked by missing approvals or assets

- Placing the mark in the header (BR-01/BR-03) — resolved once BR-01 arrived.
- Favicon set, touch icon, social preview (WEB-01/02/03) — resolved 2026-09-09.
- Pieces in Motion media, posters, and destination links (PIM-01..04, WEB-04).
- Founder portrait (AB-01).
- Final approval of draft section copy (§4).

### 1.7 Planned implementation sequence

1. Tooling and hygiene: `.vercelignore`, remove ZIP, verification scripts.
2. Brand foundation: tokens, fonts, signature bar, header/nav, footer.
3. Blueprint system SVG layers and the hero.
4. Method master + derived states + interactive stepper with static fallback.
5. Core consulting sections (Operator Gap; Capable/Competitive/Resilient; Build It to Hold; Ways to Begin; Who We Serve; Fit Call).
6. Pieces in Motion shell.
7. About / founder note.
8. Secondary pages: remove code-drawn marks.
9. Full verification pass, screenshots, status update.

---

## 2. Section completion log

Every row below was built, passed `npm test` in `tools/` (asset guard, HTML validation, browser verification), and was visually inspected at 375 / 768 / 1280 / 1920 px. Screenshots: `tools/output/screens/` (not committed).

| Unit | Status | Evidence |
|---|---|---|
| Tokens, fonts, signature bar | **Complete** | Approved palette only (`check:assets` fails on any unapproved hex). Poppins 300–800 + italics self-hosted; no Google Fonts. Bar = five equal static segments in locked order. |
| Header / navigation | **Complete** | Approved mark file on white; Poppins wordmark; anchor nav; mobile disclosure with `aria-expanded`, Escape closes; 44 px targets; sticky. |
| Hero + Blueprint Puzzle field (BP-02/03/04) | **Complete** | Generated layers (`tools/build-hero-layers.mjs`); one-time trace settles in ~2.6 s; hidden on ≤760 px; settled instantly under reduced motion (verified). Aspect box reserves space (CLS 0.005). |
| The Operator Gap | **Complete** (draft copy) | See §4 for draft sentences. |
| The Puzzler Method (PM-00..08) | **Complete** | One master, seven derived states + static fallback + generated CSS. Stepper: mouse, touch, keyboard (arrows/Home/End), `aria-current`, prev/next. Inline animated master ≥720 px without reduced motion; static state images otherwise; no-JS shows all descriptions and state 1. All seven names and three phases verbatim. |
| Capable, Competitive, and Resilient | **Complete** | Pillar questions verbatim from Brand Standards §2.4; supporting lines are draft (§4). |
| Build It to Hold | **Complete** | Five practice areas with approved blurbs; native `<details>`; line icons describe the subject. |
| Ways to Begin | **Complete** | Four real destinations only: Calendly, `/capability-brief`, `/making-the-pieces-fit`, `mailto:info@…` (approved inquiry address). |
| Who We Serve | **Complete** | Approved audience list and "not the right firm" filter line. |
| Pieces in Motion | **Complete** | Locked title and subtitle. Three named cards (Falcon, LOCK, QUIET MIND), each a click-to-play YouTube facade (thumbnail + play control, `youtube-nocookie` player loads only on activation, plain link without scripting). Destinations confirmed by the founder. No filler card. |
| A Note from Mark | **Complete** (retention to confirm) | Existing approved founder note and record. Not in the handoff's homepage inventory; see §4. |
| Fit Call | **Complete** | Approved copy, Calendly, email, phone, LinkedIn. |
| Close + footer | **Complete** | Positioning line in Teal, brand line in Poppins Light faded white (Brand Standards §10.2); legal links. |
| Secondary pages (privacy, terms, making-the-pieces-fit, capability-brief, card) | **Brand-compliant** | Code-drawn marks removed, unapproved tokens removed, Google Fonts removed, contrast fixed, naming rule applied, card intro animation removed. Layout otherwise untouched. |
| Metadata | **Complete** | Single head; approved title/description; canonical; OG/Twitter use the WEB-03 preview (1200×630) on every public page. |

### Verification results (final run)

```
index@mobile/tablet/laptop/desktop: overflow none, axe violations 0, console errors 0, failed requests 0
privacy, terms, making-the-pieces-fit, capability-brief, card @mobile/laptop: overflow none, console errors 0, axe serious/critical 0
reduced-motion: hero trace settled immediately, Method used static fallback, step swap OK
keyboard: first Tab = skip link; visible 3 px focus ring
mobile (touch): decorative animation hidden, nav toggle + Escape OK, no targets under 44 px
layout: CLS 0.0051
html-validate: 0 errors across six public pages
check:assets: passed
```
Non-failing notes: `privacy`/`terms` keep one `<section>` outside a landmark and the card page has a toast outside a landmark (axe "moderate", pre-existing). The HeyGen embed logs two benign warnings on the capability-brief page.

---

## 3. Assets resolved

| ID | Produced / resolved | Location |
|---|---|---|
| BR-01 | Approved four-piece mark, byte-exact from Drive | `assets/brand/puzzler_logo_4piece.svg` |
| BR-04 | Signature bar in code | `index.html` and secondary pages |
| BR-05 | Tokens | `:root` in `index.html` |
| BP-02 | `blueprint-hero.svg` (text-free field, generated) | `website-assets/blueprint/hero/` |
| BP-03 | `blueprint-grid.svg` (80 px tile, used as CSS background) | `website-assets/blueprint/hero/` |
| BP-04 | `blueprint-connections.svg` + inline copy in `index.html` (parity enforced by `check:assets`) | `website-assets/blueprint/hero/` |
| PM-00 | `puzzler-method-master.svg` (14 labeled groups) | `website-assets/blueprint/method/` |
| PM-01..07 | `method-state-01-edge.svg` … `method-state-07-risk-correction.svg`, derived by script | `website-assets/blueprint/method/` |
| PM-08 | `method-complete-static.svg` | `website-assets/blueprint/method/` |
| — | `method-states.css` (generated page stylesheet) | `website-assets/blueprint/method/` |
| — | Poppins 300 regular and 300–600 italic latin subsets (OFL) | `fonts/` |
| — | Bundle docs | `docs/Puzzler_Website_Asset_Map_v1_0.md`, `docs/Puzzler_Website_Claude_Code_Handoff_v1_0.md` |
| PIM-02 | LOCK — Engine of Focus published destination, confirmed by the founder 2026-09-08 | `https://youtu.be/fJ6mfYTrP5s` (LOCK card, `index.html`) |

Removed: `files short video.zip` (transfer package in the web root).

---

## 4. Open items, missing assets, decisions needed

**Bundle path mapping.** This site is served from the repository root with no build step, so Vercel would treat a root `public/` directory as the whole site (this caused a 404 after PR #11). The bundle's `public/assets/…` therefore lives at `assets/…` in the repo and is served at `/assets/…`.

**Assets to copy manually from Drive** (`PUZZLER — SYSTEM OF RECORD/02_BRAND & MARKETING/Website/Puzzler Website Implementation Bundle v1.0`), preserving the bundle paths; `.vercelignore` already excludes `docs/`, `references/`, `review-required/`, and `source-masters-do-not-publish/`:
1. `assets/brand/puzzler_logo_4piece_1024.png` (BR-02, fallback only).
2. `assets/pieces-in-motion/Lock - Engine of Focus.png` (PIM-02) → confirm crop, then create a 1280×720 WebP/AVIF derivative for the LOCK card.
3. `assets/pieces-in-motion/QUIET_MIND_Option_C_20s_Master_Loop.mp4` (PIM-03) → muted, pausable preview + 1280×720 poster.
4. `docs/Puzzler_Brand_Standards_v1_0.docx`, `references/Puzzler Consulting Blueprint Hero.png`, `review-required/*` for the record.

**Founder edits applied 2026-09-08 (cycle 2)**
- The "Not the right firm for…" filter line was removed from Who We Serve.
- The audience phrase "mission-driven organizations" was replaced site-wide with "nonprofits, small businesses, and organizations doing meaningful work" (homepage, metadata, manifest, video/brief pages, card vCard note). "Mission-driven for-profits" in the Who We Serve list became "Small businesses". The legal pages were left untouched (their copy is legal language). The social-preview image was regenerated with the current audience line (WEB-03, 2026-09-09).
- Social links added to the Fit Call "Follow" column: LinkedIn (existing), Threads `@puzzler_consulting_advisory`, TikTok `@puzzlerconsulting`, YouTube `@puzzlerconsulting`. Profile URLs were built from the supplied handles and could not be fetched from this environment; confirm they resolve.
- LOCK and *The Falcon and the Shadow* artwork was supplied as inline images, which never reach the repository. Drop the files into `assets/pieces-in-motion/lock/source/` and `assets/pieces-in-motion/falcon-and-shadow/source/`, run `python3 tools/build-posters.py`, and the cards pick up the 1280×720 derivatives on the next edit (poster CSS is already in place).

- Pieces in Motion destinations confirmed: Falcon `https://youtu.be/MdvX8wE0pCw`, LOCK `https://youtu.be/fJ6mfYTrP5s`, QUIET MIND `https://youtu.be/LAh9TsDHnTc`. Cards embed the videos as click-to-play facades. The card thumbnail is YouTube's own frame; drop approved artwork into `assets/pieces-in-motion/<project>/source/` and run `tools/build-posters.py` to replace it with a branded poster.
- The site now loads YouTube thumbnails and, on click, the `youtube-nocookie.com` player. Confirm whether the Privacy Notice should mention embedded YouTube content (legal copy is not edited here).

- Positioning line changed by the founder on 2026-09-09: "Practitioners, not vendors." is replaced by "Making the pieces fit" everywhere in page copy and metadata (homepage title, hero, social tags, video and brief pages, card page and vCard note). Where the old line sat next to the brand line, the duplicate was collapsed. All three raster files that carried the old line were regenerated on 2026-09-09: `social-preview.png` (WEB-03), `making-the-pieces-fit-poster.jpg`, and `capability-brief-poster.jpg`.
- WEB-03 produced 2026-09-09: `social-preview.png` is now 1200×630, rendered by `tools/build-social-preview.mjs` from `website-assets/social-preview/social-preview.html` (white surface so the exact BR-01 mark file may be used per Brand Standards §8.1; Poppins 500/600/800 + 600 italic self-hosted; signature bar top and bottom; copy: "Consulting & Advisory Services", "PUZZLER", "Making the pieces fit.", "For nonprofits, small businesses, and organizations doing meaningful work."). `og:image:width`/`height` updated to 1200×630 on `index.html`, `privacy.html`, `terms.html`, `puzzler_card.html`. Re-render with `cd tools && npm run build:social`.
- Video posters regenerated 2026-09-09 (same pipeline, 1920×1080 JPEG, sources in `website-assets/posters/`, excluded from deployment): Navy blueprint surface (BP-03 grid), signature bar top and bottom, Poppins only. The previous posters used a single teal piece (not the approved mark), a non-Poppins face on the brief poster, and the short name "Puzzler Consulting & Advisory"; both now use the full legal descriptor. No mark appears on the Navy posters because Brand Standards §8.1 restricts the full-colour mark to white / pale gray and the mono-white variant has not been supplied; add it to the poster sources when it arrives.
- WEB-01 / WEB-02 produced 2026-09-09 from BR-01 by `tools/build-favicons.mjs` (`cd tools && npm run build:icons`): `favicon.svg` (the mark's four polygons copied verbatim on a white tile, per Brand Standards §8.1), `favicon-32.png`, `favicon-16.png`, `favicon.ico` (16/32/48), `apple-touch-icon.png` (180, 10% padding), `icon-192.png`, `icon-512.png` (manifest). Rasters are Chromium renders of the unmodified SVG file. Every public page now links the SVG, PNG, and ICO icons; the video and brief pages previously linked no icon at all. `check:assets` fails if `favicon.svg` drifts from BR-01. `scripts/build-favicons.ps1` (which derived icons from the single teal piece) was removed.

**Decisions needed**
- **Earlier link.** `https://youtu.be/v64HNRW10ZM` was supplied in-session before the LOCK link was confirmed and is no longer used anywhere. Say which project it belongs to if it should appear on the site.
- **Full lockup (BR-03).** Choose candidate A or B, or supply the original vector.
- **Mono-white mark variant.** Needed for the Navy headers on privacy, terms, making-the-pieces-fit, and the card page (slots are ready and commented).
- **Founder note on the homepage.** Retained from the approved release; not in the handoff §4 inventory. Keep or move to a future About page.
- **Draft copy to approve or replace** (each marked `<!-- DRAFT COPY -->` in `index.html`): Operator Gap heading and bridging paragraph; outcomes intro line and the three one-sentence pillar elaborations; Method intro sentence; the seven Method step descriptions; Who We Serve heading; Ways to Begin heading.
- **Falcon and the Shadow** trailer selection and poster; **IGNITE** keyframe verification and preview.

---

## 5. Verification tooling

All tooling lives in `tools/` and is excluded from deployment.

```
cd tools
npm install                 # playwright 1.56.1, axe-core, html-validate (Chromium expected via PLAYWRIGHT_BROWSERS_PATH)
npm run build               # regenerate hero layers + Method states/CSS from the masters
npm run check:assets        # excluded files, code-drawn logos, unapproved tokens, overlay parity, logo-slot state
npm run validate            # html-validate on the six public pages
npm run verify              # serves the repo, runs browser checks, writes tools/output/report.md + screenshots
npm test                    # all three
```

---

## 6. Launch blockers and recommendations

Blockers before public launch (nothing here blocks continued development):
1. Copy the Pieces in Motion media and produce posters/previews (§4 items 2–3); until then the cards show the Navy poster treatment with "in preparation" status.
2. Approve or replace the draft copy.
3. Select the full lockup and obtain the mono-white mark for the secondary pages.
4. ~~Produce WEB-01/02/03 derivatives from BR-01 and the final design.~~ Done 2026-09-09.
5. Confirm the scheduling destination (Calendly, existing), analytics (Fathom + Vercel, existing), and privacy/terms copy (existing pages) per handoff §3.

Recommendations: retire or rebuild the dormant off-brand pages `about.html`, `services.html`, `contact.html` (noindex, unlinked) in a later release; add `scope`/landmark fixes to the legal pages when they are next edited.
