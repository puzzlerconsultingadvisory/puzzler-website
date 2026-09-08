# puzzler-website
Puzzler Consulting &amp; Advisory Services — official website.

Static HTML/CSS, no build step, hosted on Vercel. Brand and implementation
sources live in `docs/`; produced Blueprint Puzzle assets live in
`website-assets/`; supplied bundle assets go under `public/assets/`.

## Run locally

```
cd tools && npm install
npm run verify        # serves the site on a random local port during checks
# or, for browsing:
npx --yes http-server .. -p 8080 -c-1   # then open http://localhost:8080/
```

`npm test` in `tools/` runs the asset guard, HTML validation, and the
Playwright verification (accessibility, overflow, console, reduced motion,
keyboard, touch). See `IMPLEMENTATION_STATUS.md` for status and open items.
