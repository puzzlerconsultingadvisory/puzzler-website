5 Things to Know About a Fit Call — slide sources (not deployed; see /.vercelignore)

Drop the five full-size originals here as slide-1.png … slide-5.png (jpg/webp also accepted),
in the order: 1 It is a conversation / 2 Come with the real challenge / 3 Expect questions /
4 Fit works both ways / 5 There is no pressure. Then run:

    python3 tools/build-fit-call-slides.py

which writes assets/fit-call/slide-N.webp (max 1080 px wide) for the page
/5-things-to-know-about-a-fit-call. Until an original is present for a slide, the script cuts
that panel from contact-sheet.webp (the five-panel sheet supplied 2026-09-26) at 354×628,
which is below web quality and is only a placeholder.
