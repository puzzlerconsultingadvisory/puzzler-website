# SEO Assessment — puzzlerconsultingadvisory.com

**Date:** 10 September 2026, live HTTP verification added 11 September 2026
**Scope:** Full-site technical, architecture, speed, mobile, on-page, structured data, content, off-page and competitive review.
**Method:** Nine audit loops, each verified before recording. Working notes and the complete findings log live in `seo_audit_state.md` at the repository root. This document is the polished deliverable.

> **How this audit was run.** On 10 September the live domain was unreachable from the audit environment, so page-level findings were verified against the repository source; the site has no build step and deploys verbatim from `main`. On 11 September the `www` host was opened to the environment and the HTTP layer was checked live: the served homepage is byte-identical to `main`, and redirects, HSTS, compression, 404 status, cache headers and the Search Console verification file were all observed directly. Both hosts were checked. Field Core Web Vitals remain unobserved and are listed in section 4. Performance numbers are Lighthouse 12.8 lab runs against a local copy.

---

## 1. Executive summary

**Overall health: technically well-built, but close to invisible to search.**

The site scores strongly on the things developers control: valid HTML, Lighthouse 90 mobile / 100 desktop, accessibility 100, zero layout shift on the homepage, clean mobile rendering at every width, self-hosted fonts, deferred analytics. It scores poorly on the things search engines need: there is no evidence it is indexed, the entire business lives on one URL, no page title or heading names a service or a place, there is no structured data, and there is no proof content (results, testimonials, credentials).

### Top three issues by impact

| # | Issue | Why it matters | Category |
|---|---|---|---|
| 1 | **No search visibility.** A `site:` search returns nothing; the exact firm name returns only unrelated "Puzzle Consulting" firms. Sitemap is stale and incomplete, and robots.txt blocks pages that also carry noindex. (A canonical-host mismatch found on 11 Sep, where the bare domain redirected to `www`, was fixed the same day in Vercel; the bare domain is now primary.) | Nothing else in this report matters until the homepage is in the index. Search Console is now verified as a Domain property with the sitemap submitted; check Pages and URL Inspection from 15 Sep. | Technical / Off-page |
| 2 | **One URL, brand-only headings.** Five practices, government contracting, fractional leadership, speaking and the founder bio share `index.html` (8,560 words). The `<h1>` is "Making the pieces fit." and no title or heading contains "nonprofit", "compliance", "government contracting", "fractional", "Annapolis" or "Maryland". | A single page can rank for one intent. Competing sites in the target queries all have dedicated service and location pages. | Architecture / On-page |
| 3 | **No trust or entity signals.** Zero structured data on any page, no address on any indexable page, no testimonials, case studies or credentials, and 16 blocks of draft copy still marked `DRAFT COPY` in production (14 on 10 Sep; two more arrived with PRs #25/#26). | Google needs to resolve *who* this is (entity), *where* (local), and *why to trust it* (E-E-A-T). None of the three is currently answered in machine-readable or human-readable form. | Schema / Content |

### Quick wins

**14 fixes** take under an hour each and are all code-level (section 3, "Now"). Together they resolve every Critical-path technical item, add structured data, fix the meta description, add canonicals and redirects, and repair the video-page layout shift.

### Findings count

| Severity | Count |
|---|---|
| High | 8 |
| Medium | 13 |
| Low | 17 |
| Info (positives, recorded for completeness) | 6 |
| Blocked / pending verification | 6 |

---

## 2. Findings by category

Severity: **High** = blocks or materially limits ranking; **Medium** = measurable loss or risk; **Low** = hygiene. Each finding names its evidence and fix. Status is VERIFIED unless marked PENDING.

### 2.1 Technical foundation

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| High | Site appears absent from the search index; brand-name search returns only unrelated firms. Cause PENDING (needs Search Console). | WebSearch `site:puzzlerconsultingadvisory.com` = 0 results; exact-name query = unrelated results | Verify the property in Google Search Console, submit the sitemap, run URL Inspection on `/`, and apply every fix below. |
| Medium | robots.txt `Disallow`s about/services/contact while the pages also carry `noindex`; a Disallow prevents the noindex from ever being read. | `robots.txt` lines 2–4; `<meta name="robots">` in the three files | Remove the three Disallow lines (or delete the dormant pages). |
| Medium | Dormant pages declare canonicals to `/about`, `/services`, `/contact`, which are not served (no `cleanUrls`, no rewrite). | canonical tags in the three files; `vercel.json` | Delete the pages, or point canonicals at served URLs. |
| Medium | `/making-the-pieces-fit` and `/capability-brief` are rewrites, not redirects, and neither page has a canonical, so `.html` and clean variants are both indexable duplicates. | `vercel.json`; `grep canonical` = 0 on both pages | Add self-canonical (clean URL) to both pages; add 301 `redirects` in vercel.json from `.html` to clean. |
| Medium | Sitemap lists 3 URLs; omits both video pages; homepage `lastmod` is 2026-05-13 though index.html changed 2026-09-10. | `sitemap.xml`; `git log -1 -- index.html` | Add the two video pages; set real lastmod; derive it from git at deploy time. |
| Low | `puzzler_card.html` (business card with a direct personal email + vCard) is indexable but orphaned and not in the sitemap. | page head; no inbound links | Decide: `noindex` if QR-only, otherwise link it and list it. |
| Low | No custom 404 page. | `404.html` absent | Add a branded `404.html` with links to home, videos, Fit Call. |
| Low | Video pages have `og:type=video.other` but no `og:url`, `og:video` or Twitter card tags. | `grep og:url` = 0 | Add og:url, twitter:card, and `og:video` + `og:video:type` for the MP4 page. |
| ~~High~~ **Resolved 11 Sep** | **Canonical host mismatch.** Every canonical tag, `og:url`, sitemap entry and the robots.txt `Sitemap:` line name the bare domain, but the bare domain 307-redirects every path to `www`, which is where the content actually serves. The declared canonical URLs are all redirects; Search Console will flag the sitemap URLs as "Page with redirect", and a temporary 307 is the weakest consolidation signal Google can receive. | `curl -I https://puzzlerconsultingadvisory.com/` = 307 → `https://www.puzzlerconsultingadvisory.com/`; `www` = 200; canonicals and sitemap = bare domain | Recommended (no code change): in Vercel → Settings → Domains, make `puzzlerconsultingadvisory.com` the primary domain and set `www` to "Redirect to primary (308)". Every existing canonical and sitemap entry then becomes correct. Alternative: keep `www` primary and rewrite canonicals, `og:url`, sitemap.xml and robots.txt to `www`. Make the Search Console property a Domain property so it covers both hosts. **Done 11 Sep:** bare domain is now primary (200), `www` returns a 308 to it, and a Domain property is verified with the sitemap submitted. |
| Low | `/index.html` is a second live copy of the homepage (200, no redirect to `/`). | live curl = 200, 0 redirects | Add a permanent redirect from `/index.html` to `/` in vercel.json. |
| Info | Verified live on 11 Sep: `http://www` → 308 → `https://www`; HSTS `max-age=63072000` on both hosts (no includeSubDomains/preload); unknown paths return a real 404 on `www`; Brotli compression; HTTP/2; edge TTFB ≈160 ms; robots.txt, sitemap.xml and the Search Console verification file all serve 200 on `www` as committed. | live curl on both hosts | Optionally add `includeSubDomains; preload` to HSTS once the host direction is settled. |
| Info | Positives: canonical on `/`, privacy, terms; robots.txt references the sitemap; single h1; `lang="en"`; viewport everywhere; html-validate clean on all six published pages. | `npm run validate` | — |

### 2.2 Site architecture & internal linking

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| High | The whole offer lives on one URL; primary nav is anchor-only; no service, sector or topic pages exist. A dedicated government-contracting page is already agreed in the implementation notes. | `index.html` nav hrefs; section ids; word count 8,561; `IMPLEMENTATION_STATUS.md` line 203 | Hub-and-spoke: `/government-contracting/`, `/fractional-leadership/`, `/speaking/`, `/about/`, and one page per practice (or a `/services/` hub). Link each homepage section heading to its page. Start with government contracting (copy approved). |
| Medium | Secondary pages are dead-ends: video pages and the card link back only via the brand mark; legal pages link only to home and each other; no page links to the other video page. | per-page href extraction | Shared footer on every page (home, both videos, privacy, terms, Fit Call). |
| ~~Low~~ Withdrawn | Heading hierarchy skips h2 → h5 in the Find Your Starting Point result (JS-injected). **Withdrawn 11 Sep:** in the rendered DOM the result card follows the Step 2 `<h4>`, so `<h5>` is valid; the original scan read the script text as markup. | `index.html` ~line 1727 | None. |
| Low | Three dormant pages remain deployed and internally link to unrewritten clean URLs. | `about.html` nav; `vercel.json` | Delete (recommended in `IMPLEMENTATION_STATUS.md` §C8) or rebuild as spoke pages. |
| Info | Positives: 0 broken anchors (9 checked); every page ≤1 click from home; no `target=_blank` tab-hijacks; nav has `aria-label`; 13 Calendly CTAs. | Loop 2 script | — |

### 2.3 Page speed & Core Web Vitals (lab)

Lab results, local server, Lighthouse 12.8.2:

| Page / mode | Perf | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|
| Home, mobile | 90 | 2.7 s | 170 ms | 0 | 4.1 s |
| Home, desktop | 100 | 0.6 s | 0 ms | 0.003 | 0.5 s |
| Making the Pieces Fit, mobile | 89 | 2.2 s | 0 ms | **0.203** | 1.1 s |

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| Medium | Mobile LCP 2.7 s is almost all render delay (2.28 s): 46.7 KB inline CSS + 46.2 KB inline JS, 691 DOM nodes, 1.1 s in Style & Layout, a forced reflow, 17 KB unused CSS, 16 KB minification savings. | `lh-home-mobile.json` phases, main-thread breakdown | Minify inline CSS/JS at commit; split non-critical CSS out of the inline block; fix the forced reflow in the trace animation. Target LCP ≤ 2.0 s lab. |
| Medium | Video page CLS 0.203: Poppins uses `font-display: swap` with zero font preloads, so the header reflows on font arrival and pushes the eyebrow, h1, lede and player down. | Lighthouse CLS 0.203; Playwright layout-shift sources `.eyebrow, h1, .lede, .stage`; `grep -c preload` = 0 | Preload poppins-400/600/800 on both video pages; add metric-matched fallback (`size-adjust`) or `font-display: optional` for the header. |
| Medium | Poster JPGs are 1920×1080 at ~183 KB with no WebP/AVIF; 120–172 KiB savings estimated. | `modern-image-formats`; poster dimensions | Generate 1280×720 WebP with `tools/build-posters.py`; keep JPG for `og:image`. |
| Low | Homepage loads 10 Poppins files (~82 KB) though weight 300 is used 3× and italics 11×. | `@font-face` list | Drop 300, 300-italic, 500-italic, 600-italic unless needed (~34 KB). |
| Low | One render-blocking stylesheet (`method-states.css`, 4 KB); no `preconnect` for Fathom, Vercel Insights or `i.ytimg.com`. | Lighthouse `render-blocking-resources`; `grep preconnect` = 0 | Inline the small stylesheet; add preconnect / dns-prefetch. |
| Low | No cache policy declared in `vercel.json`. | `grep headers vercel.json` = 0 | Add `Cache-Control: public, max-age=31536000, immutable` for `/fonts/`, `/website-assets/`, `/assets/`. |
| PENDING | Field CWV (CrUX) unobserved. Vercel compression (Brotli), HTTP/2 and edge TTFB (≈160 ms) are now confirmed live; Lighthouse's "enable text compression" and "bf-cache no-store" flags were artefacts of the local server and are **not** findings. | PSI API 429; CrUX 403 | Run pagespeed.web.dev once and paste the mobile panel. |
| Info | Positives: self-hosted fonts with swap; 3 preloads on home; all images sized (CLS 0); LCP image `fetchpriority=high`; lazy thumbs; deferred analytics; no YouTube iframe until click; 18 MB MP4 uses `preload=metadata`; third-party main-thread cost 0 ms. | Lighthouse | — |

### 2.4 Mobile usability

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| Medium | Video page layout shift on mobile (same root cause as 2.3). | see above | see above |
| Low | Video pages: only 63 % of text ≥ 12 px; footer links under 24 px tall. | Lighthouse `font-size`; Playwright probe | Caption/footer text ≥ 14 px; `padding-block` on footer links. |
| Low | privacy.html: 26–40 inline TOC links under 24 px tall at 360–768 px. | Playwright probe | Block-list TOC with ≥ 8 px vertical padding per item. |
| Low | axe "region" (moderate) on privacy, terms and card pages: content outside landmarks. | `verify.log` | Wrap content in `<main>`; put the toast inside a landmark. |
| Low · PENDING | Real-device rendering and Search Console Page Experience not checked. | no device/GSC access | Spot-check on two devices; open GSC Page Experience once verified. |
| Info | Positives: viewport on every page; 0 px overflow at 360/375/768/1280/1920; hamburger nav with `aria-expanded`; body 17 px; 0 of 67 targets under 24 px; Lighthouse a11y 100; repo `npm run verify` PASS (axe 0, CLS 0.005, reduced motion honoured). | Playwright probe; `verify.log` | — |

### 2.5 On-page SEO

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| High | Title, h1 and all eight h2s are brand phrases with no service, audience or location term. Body: "nonprofit consulting" 0, "grant compliance" 0, "fractional COO" 0, "strategic plan" 0, "Annapolis/Maryland" 0 (but "capacity building" 17, "leadership development" 10). | keyword scan; H2 list | Keep the tagline as a kicker; make the h1 descriptive (e.g. "Nonprofit capacity, compliance and leadership advisory, practitioner-led"); retitle to include audience + location + full firm name; add one plain-language keyword to each h2 kicker. |
| Medium | Homepage meta description is 368 characters (truncates at ~155); capability-brief 189; services 176. | length scan | Rewrite ≤ 155 chars: audience + service + location + CTA. |
| Medium | Video pages are thin (84 / 109 / 85 words) with no transcript or summary. | word counts | 150–300-word summary plus collapsed transcript under each player; VideoObject schema. |
| Low | `twitter:title` drops the tagline; YouTube thumbnails use empty alt inside aria-labelled links. | OG/Twitter block; thumbnail markup | Descriptive alt on thumbnails; align twitter:title with the title. |
| Info | Positives: unique titles/descriptions on every page; single h1; valid heading order except the h5; every img has alt; Lighthouse SEO 100 on all audited pages; strong founder bio and speaking topics as E-E-A-T raw material. | | — |

### 2.6 Structured data

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| High | Zero structured data on any page (0 JSON-LD, 0 microdata across all nine files). | `grep ld+json *.html` = 0 | Add JSON-LD on the homepage: `ProfessionalService` (name, url, logo, telephone, email, address, areaServed, sameAs, founder), `Person` (Mark D. Williams, jobTitle, knowsAbout, sameAs), `WebSite`. On each video page: `VideoObject` (name, description, thumbnailUrl, uploadDate, contentUrl/embedUrl, duration). Later: `Service` per practice page. A ready-to-paste starter block is in Appendix A. |

### 2.7 Content quality & gaps

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| High | 14 `<!-- DRAFT COPY -->` blocks are live in production (Operator Gap heading/bridge, outcomes intro, Method intro and all seven step descriptions, FYSP help bullets, two section headings). | `grep -c 'DRAFT COPY' index.html` = 14 | Founder sign-off pass; remove markers as approved. |
| High | No proof content: 0 testimonials, 0 case studies, no credentials page, no speaking history. | keyword scan; section inventory | Add a Results section with 2–3 anonymised engagement stories, a credentials strip and speaking history. |
| Medium | No local signals: the Annapolis, MD address appears on no indexable page; phone and email do. | NAP scan | Full NAP in a shared footer; match Google Business Profile and LinkedIn exactly; include in schema. |
| Medium | No content engine: no blog, resources, FAQ or guides; three indexable content pages in total. | file inventory | Four evergreen articles mapped to Find-Your-Starting-Point paths, one per month, each linking to its practice. |
| Low | "Pieces in Motion" (three creative-studio films) sits on the homepage URL and dilutes topical focus. | `#pieces-in-motion` | Move to `/studio/` or the YouTube channel with a single homepage teaser, or frame it explicitly as the digital-storytelling practice. |
| Info | Positives: original, specific, practitioner-voiced copy; the 56-combination starting-point tool is genuinely differentiated; explicit ethics boundary; complete legal pages. | | — |

### 2.8 Off-page signals

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| High · PENDING | No brand visibility in search; LinkedIn company URL does not surface. Cause could be non-indexation rather than absence of mentions. | four searches, 2026-09-10 | GSC + sitemap; Google Business Profile; LinkedIn "Website" field; 5–10 foundational citations (Maryland Nonprofits consultant directory, Annapolis chamber, Clutch/GoodFirms, SAM.gov/state vendor lists if applicable). |
| Blocked | Backlinks, referring domains, domain authority, brand-mention monitoring, and existence of the four social profiles, Calendly and HeyGen embed could not be checked. | no tool access; egress blocked | One Ahrefs/Semrush pass or the GSC Links export; confirm all four handles resolve with consistent name, logo and URL. |
| Low | Brand-name collision with Puzzler Media and several "Puzzle(s) Consulting" firms; the full legal name is the only unambiguous handle and is absent from the h1. | search results | Use the full name consistently in h1, title, schema and social bios. |

### 2.9 Competitive positioning

**Blocked: no competitors were supplied.** Context only, from one search each (PENDING): "nonprofit capacity building consultant Maryland" surfaces Maryland Nonprofits' consulting group, PAGE Capacity Builders (with per-town landing pages) and the nonprofit.ist directory; "government contracting readiness consultant small business nonprofit" surfaces BDO, Cherry Bekaert, CMG Alliance, SGCR and Complete Contract Consulting. Every one of them ranks with dedicated service or location pages, which reinforces finding 2.2-High. Supply 3–5 named competitors and target keywords for a proper gap analysis.

---

## 3. Prioritised roadmap

Each item references the finding it resolves.

### Now (this week, all code-level, ~1 day total)

1. ~~**Primary domain** and **Search Console Domain property**~~ — done 11 Sep: bare domain primary, `www` 308s to it, Domain property verified via DNS, sitemap submitted. Remaining: inspect `/` from 15 Sep. (2.1-High, 2.8-High)
2. ~~**Sitemap**~~ — done 11 Sep (`tools/build-sitemap.mjs`).
3. ~~**robots.txt**~~ — done 11 Sep.
4. ~~**Canonicals + redirects**~~ — done 11 Sep, including `/index.html` → `/`.
5. ~~**Dormant pages**~~ — deleted 11 Sep.
6. ~~**Title + h1 + meta description**~~ — done 11 Sep; the tagline stays as the display line above the new descriptive h1.
7. ~~**JSON-LD**~~ — done 11 Sep on the homepage and both video pages.
8. ~~**NAP footer**~~ — done 11 Sep on home, both videos, privacy, terms and the 404 page.
9. ~~**Font preloads on video pages**~~ — done 11 Sep.
10. ~~**Poster WebP**~~ — done 11 Sep (`tools/build-video-posters.py`, 14 KB).
11. ~~**Cache headers + preconnect**~~ — done 11 Sep.
12. ~~**404.html**~~ — done 11 Sep.
13. ~~**Video-page OG/Twitter tags**~~ — done 11 Sep. The h5 item was withdrawn: the result card follows an h4, so h5 is valid (false positive).
14. ~~**Decide puzzler_card.html**~~ — set to noindex 11 Sep.

### Next (30 days)

15. **Draft-copy sign-off**: clear all 14 `DRAFT COPY` blocks. (2.7-High)
16. **Government contracting page** as the first spoke, using approved copy; link from the homepage section heading and nav. (2.2-High)
17. **Results / proof section**: 2–3 engagement stories, credentials strip, speaking history. (2.7-High)
18. **Google Business Profile + LinkedIn alignment**; five foundational citations. (2.8-High)
19. **Video summaries + transcripts** under each player. (2.5-Medium)
20. **Minify inline CSS/JS**, fix the forced reflow, trim unused font weights. (2.3-Medium/Low)
21. **Run pagespeed.web.dev** and `curl -I` on www/http to close the pending items in section 4.

### Later (quarter)

22. **Full hub-and-spoke**: one page per practice, `/fractional-leadership/`, `/speaking/`, `/about/`; homepage becomes the narrative hub. (2.2-High)
23. **Content engine**: four evergreen articles mapped to starting-point paths, then monthly. (2.7-Medium)
24. **Move Pieces in Motion** to `/studio/` or the channel. (2.7-Low)
25. **Competitive gap analysis** once competitors and keywords are supplied; **backlink baseline** from a tool export. (2.8, 2.9)
26. **Mobile polish**: video-page text sizes, privacy TOC tap targets, landmarks on legal pages. (2.4-Low)

---

## 4. What could not be verified

| Item | Why | What would confirm it |
|---|---|---|
| Indexation status and cause | Domain property verified via DNS and sitemap submitted on 11 Sep; coverage data takes days to populate | GSC Pages report + URL Inspection on `/` from 15 Sep |
| Field Core Web Vitals | PSI API daily quota exhausted (429); CrUX API needs a key (403) | pagespeed.web.dev mobile panel, or CrUX dashboard once the origin has traffic |
| Backlinks, referring domains, domain authority, brand mentions | No Ahrefs/Semrush/Moz access | One Site Explorer export or the GSC Links report |
| Existence/consistency of LinkedIn, YouTube, TikTok, Threads profiles; Calendly and HeyGen embeds | Egress blocked to those hosts | Open each URL once; confirm name, logo and website field match |
| Competitive positioning | No competitors or keywords supplied | 3–5 competitor domains and 10–20 target queries |
| Real-device mobile rendering | No device farm | Two physical devices (iOS Safari, Android Chrome) |

---

## Appendix A — Starter JSON-LD for the homepage

Values below are taken from the site and release notes; confirm the address and `sameAs` handles before publishing.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": "https://puzzlerconsultingadvisory.com/#org",
      "name": "Puzzler Consulting & Advisory Services",
      "legalName": "Puzzler Consulting & Advisory Services LLC",
      "url": "https://puzzlerconsultingadvisory.com/",
      "logo": "https://puzzlerconsultingadvisory.com/icon-512.png",
      "image": "https://puzzlerconsultingadvisory.com/social-preview.png",
      "telephone": "+1-410-970-6539",
      "email": "info@puzzlerconsultingadvisory.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1125 West Street, Suite 200 #348",
        "addressLocality": "Annapolis",
        "addressRegion": "MD",
        "postalCode": "21401",
        "addressCountry": "US"
      },
      "areaServed": "US",
      "founder": { "@id": "https://puzzlerconsultingadvisory.com/#founder" },
      "sameAs": [
        "https://www.linkedin.com/company/puzzlerconsultingadvisory",
        "https://www.youtube.com/@puzzlerconsulting",
        "https://www.tiktok.com/@puzzlerconsulting",
        "https://www.threads.net/@puzzler_consulting_advisory"
      ],
      "knowsAbout": ["Nonprofit capacity building", "Grant and subrecipient compliance", "Government contracting readiness", "Leadership and workforce development", "Organizational transition support"]
    },
    {
      "@type": "Person",
      "@id": "https://puzzlerconsultingadvisory.com/#founder",
      "name": "Mark D. Williams",
      "jobTitle": "Managing Partner & Chief Capacity Builder",
      "worksFor": { "@id": "https://puzzlerconsultingadvisory.com/#org" },
      "url": "https://puzzlerconsultingadvisory.com/#note"
    },
    {
      "@type": "WebSite",
      "@id": "https://puzzlerconsultingadvisory.com/#website",
      "url": "https://puzzlerconsultingadvisory.com/",
      "name": "Puzzler Consulting & Advisory Services",
      "publisher": { "@id": "https://puzzlerconsultingadvisory.com/#org" }
    }
  ]
}
</script>
```

## Appendix B — Evidence artefacts

- `seo_audit_state.md` — full findings log, plan/verify/reflect notes per loop, open questions.
- Lighthouse JSON reports (home mobile, home desktop, video mobile) and Playwright probe output were generated in the audit session's scratch space; re-run with `cd tools && npm install --no-save lighthouse && npx lighthouse http://localhost:8080/` after `npx http-server .. -p 8080`.
- `tools/verify.log` equivalent: `cd tools && npm run verify` (PASS on 2026-09-10).
