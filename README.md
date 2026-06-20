# PULLY • TATTOOIST

A fine-line tattoo portfolio + booking site for [@pully.tattooist](https://www.instagram.com/pully.tattooist/) — Hà Nội.
Static front-end (no build step) with an immersive Three.js gallery, plus a small Cloudflare backend for the booking calendar, email, and admin.

## Run locally
```bash
python -m http.server 8000
# open http://localhost:8000
```
(Needs a server, not file://, because it uses ES modules + fetch.)

## Structure
```
index.html              page
assets/css/styles.css   design system (ivory · charcoal · one red accent)
assets/js/config.js     edit me — apiBase, email, links
assets/js/gallery.js    Three.js gallery (float / wall / tunnel)
assets/js/booking.js    availability calendar + request form
assets/js/main.js       nav, reveal, lightbox, init
data/images.json        gallery manifest  ← set "src" per item once photos are in
data/availability.json  static availability (used until the Worker is live)
assets/img/             tattoo photos go here
worker/                 Cloudflare Worker (booking API + admin) — added in backend phase
```

## Photos
1. Export Instagram cookies to `cookies.txt` (kept out of git).
2. `gallery-dl --cookies cookies.txt https://www.instagram.com/pully.tattooist/`
3. Curated images land in `assets/img/`; `tools/` will regenerate `data/images.json` to point at them.

Items in `images.json` with `"src": null` render an elegant generated placeholder, so the site looks finished before photos are added.

## Config (`assets/js/config.js`)
- `apiBase` — Cloudflare Worker URL. Empty = fully static (form falls back to email/DM).
- `studioEmail` — used by the mailto fallback.
- `instagram` / `dm` / `beacons` — profile links.

## Deploy
1. **GitHub Pages** — push; enable Pages on the default branch. Works as-is.
2. **Cloudflare** — Pages for the site + a Worker (+ D1) for live calendar, booking email, and admin. Point `apiBase` at the Worker.

## Status
- [x] Front-end: hero, 3D gallery (3 modes), about, signatures, booking UI, lightbox, responsive
- [ ] Scrape photos → populate gallery
- [ ] GitHub repo + Pages
- [ ] Cloudflare Worker: booking storage, availability, email, admin
