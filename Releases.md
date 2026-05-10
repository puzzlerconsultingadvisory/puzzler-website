## What this release is

The first production release of the Puzzler Consulting & Advisory Services soft-launch landing page. Single-page narrative site replacing the prior four-page version, built around the four-act flow:

1. **Hero** — *Practitioners, not vendors.*
2. **Who We Are** — Founder voice with FEMA framing, West Wing scene, action-and-results bullets, and credential summary
3. **What We Do** — Five practice areas across funding mechanisms
4. **What Changes** — Three outcomes every engagement builds
5. **Start Here** — Calendly Fit Call conversion

## What's new in this release

### Brand
- Locked positioning: **Practitioners, not vendors.**
- Locked closing tagline: **Making the pieces fit for mission-driven organizations.**
- Locked value prop: *Helping people and organizations find their new normal — before, during, and after transformative events.*
- Five-color signature bar (Coral → Orange → Yellow → Green → Teal) at top and bottom of every page

### Founder voice
- New *"A Note from Mark"* opens the bio section
- FEMA emergency-manager origin story and *The West Wing* "I've been down here before" scene as the firm's founding doctrine
- Career chapters rewritten as **action-and-results bullets** for nonprofit and mission-driven readers — phone-friendly, agency-agnostic, with italic "what this means for you" takeaways
- Personality moment preserved: *"And the coolest job title I'll probably ever hold — Gatekeeper to the Joint Requirements Council."*
- Speaking Engagements callout listing Mark's available topics: leadership in institutional disruption, capacity building, human-centered AI, older-child adoption advocacy, internship-based workforce development, hidden disabilities visibility, and mental health

### Conversion mechanism
- Live Calendly link for 30-minute Fit Call (two CTAs on the page — hero and final)
- "Not the right fit" filter line clarifying what Puzzler doesn't do (federal contract advocacy, distress turnarounds, executive search, organizations under $2M revenue)

### Operational details
- Full registered name: **Puzzler Consulting & Advisory Services LLC**
- Contact: info@puzzlerconsultingadvisory.com / (410) 970-6539
- Address: 1125 West Street, Suite 200 #348, Annapolis, MD 21401
- Live LinkedIn company page link

## What stayed deployed but is now hidden

The prior four-page site (about.html, services.html, contact.html) remains in the repo and continues to be served by Vercel, but no nav links point to those pages from the homepage. They are dormant — accessible by direct URL only. They will be re-introduced in a future release when the site expands beyond the landing page.

## Known follow-ups

- Phase 4: Connect puzzlerconsultingadvisory.com domain to Vercel (replacing the .vercel.app URL)
- Test mobile rendering across multiple devices
- Verify Calendly booking flow end-to-end
- Add Open Graph image for LinkedIn / social sharing previews

## Tech notes

- Pure HTML/CSS, no build step, no framework dependencies
- Hosted on Vercel (free tier) via GitHub auto-deploy
- Page weight: ~32KB unminified (no external images)
- Mobile-first responsive design with breakpoints at 900px, 640px, 380px
- Reduced-motion support honored
