# PULLY • TATTOOIST — editorial edition

A fine-line tattoo portfolio + booking site for [@pully.tattooist](https://www.instagram.com/pully.tattooist/) — Hà Nội.
Static front-end (no build step), art-directed in a soft, warm, **Swiss-editorial** style: one grotesk at many sizes, tiny micro-labels, **floating draggable tattoo images**, a giant index number, and true-color photography — with a **light / dark** toggle.

## Run locally
```bash
python -m http.server 8000
# open http://localhost:8000
```
(Needs a server, not file://, because it uses ES modules + fetch.)

## Structure
```
index.html              page — editorial hero (floating field), galerie, the hand, the sitting, notes, the index, booking
assets/css/styles.css   design system (Hanken Grotesk · warm-beige light + dark toggle · one clay accent). Cache-busted ?v=N
assets/js/config.js     edit me — web3formsKey, studioEmail, instagram/dm/beacons links
assets/js/gallery.js    galerie: work-list ↔ plate ↔ odometer, category filter, 305-plate index
assets/js/booking.js    availability calendar + request form (Web3Forms → mailto/DM fallback)
assets/js/main.js       Lenis + GSAP orchestration, loader, hero, floating field, theme toggle, cursor, lightbox
data/images.json        gallery manifest (305 items: src, category, title, placement, palette, quality, featured)
data/availability.json  static availability (bookingFrom/To, closedWeekdays, blocked) — set to the real open window
assets/img/             tattoo photos · assets/img/thumb/  thumbnails (used by strip + index)
```

## Design & motion
- **Type**: Hanken Grotesk (variable, has Vietnamese subset; light 300 at display sizes = fine-line feel) + Fraunces italic as a rare accent.
- **Theme**: warm-beige light default + dark toggle (persists to localStorage; applied pre-render to avoid flash).
- **Motion**: GSAP (ScrollTrigger · SplitText · **Draggable · InertiaPlugin** — all free in 3.13) + Lenis smooth scroll, all via CDN. The hero's floating images drag with inertia and drift with mouse/scroll parallax; the galerie work-list, central plate, and giant index stay in sync. Degrades with `prefers-reduced-motion` and on touch (floaters hidden), and no-JS shows everything.
- Her own "Pully.ink & Co" watermark is baked into the source photos — kept as-is.

## Booking — make it send for real (2 minutes, no server)
1. Go to **https://web3forms.com**, enter Pully's email, copy the free **access key**.
2. Paste it into `assets/js/config.js` → `web3formsKey: "…"`.
That's it — each request is emailed straight to her, works on static hosting. Until a key is set, the form falls back to opening the visitor's email app (mailto) or Instagram DM.

## Config (`assets/js/config.js`)
- `web3formsKey` — free Web3Forms key (recommended booking path).
- `apiBase` — optional Cloudflare Worker URL (advanced).
- `studioEmail` — used by the mailto fallback.
- `instagram` / `dm` / `beacons` — profile links.

## Deploy
- **GitHub Pages** — push; enable Pages on the default branch. Works as-is. (Live: https://deadlychirp.github.io/pully-tattoo/)

## Status
- [x] Editorial rebuild: floating-image hero, galerie (work-list + odometer), the hand, the sitting, aftercare/FAQ, 305-plate index, booking UI, lightbox, light/dark, responsive
- [x] Photos scraped, curated, `data/images.json` populated (305 · 42 featured)
- [x] GitHub repo + Pages
- [ ] Paste a Web3Forms key + Pully's email so bookings email for real
- [ ] Set `data/availability.json` to Pully's real open window (currently placeholder Sep–Oct 2026)
