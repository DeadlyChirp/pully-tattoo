/* Galerie — THE FILM (one screen).
   A curated dozen hero plates play as a cinematic reel inside a single viewport:
   ambient blurred backdrop from each plate's own colours, slow Ken-Burns, soft
   cross-dissolve. Auto-advances; pauses on hover / off-screen / open lightbox;
   swipe, arrows, dots and keyboard all drive it. Tap a plate → full lightbox.
   The word-row re-curates the reel and re-sorts the 305 index.
   The complete catalogue lives one click away in the index (no endless scroll). */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");
const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const G = window.gsap;
const anim = () => document.documentElement.classList.contains("anim") && !!G;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DUR = 4600;                                   // ms per plate

/* pick a punchy, category-varied dozen so the reel stays short */
function curate(pool, max = 12) {
  const sorted = [...pool].sort((a, b) => (b.quality || 0) - (a.quality || 0));
  const per = {}, out = [];
  for (const it of sorted) { const c = it.category || "—"; if ((per[c] || 0) >= 2) continue; per[c] = (per[c] || 0) + 1; out.push(it); if (out.length >= max) break; }
  for (const it of sorted) { if (out.length >= max) break; if (!out.includes(it)) out.push(it); }
  return out;
}

export async function initGallery({ items, onSelect } = {}) {
  const stage = document.getElementById("filmStage");
  if (!stage) return;
  const all = items || ((await (await fetch("./data/images.json")).json()).items || []);
  if (!all.length) return;
  const featured = all.filter(x => x.featured);

  const catsEl = document.getElementById("vCats");
  const gCount = document.getElementById("gCount");
  const countEl = document.getElementById("bookCount");
  const dotsEl = document.getElementById("filmDots");
  const railFill = document.getElementById("filmRailFill");
  const lb = document.getElementById("lightbox");

  const gidx = (it) => all.indexOf(it);
  const select = (it) => onSelect?.(Object.assign({}, it, { no: gidx(it) + 1, total: all.length }));

  let list = curate(featured.length ? featured : all, 12);
  let slides = [], dots = [], cur = 0, timer = null, rail = null, visible = true, hovered = false;

  const arrowPrev = document.getElementById("filmPrev");
  const arrowNext = document.getElementById("filmNext");

  function slide(it, i) {
    const el = document.createElement("figure");
    el.className = "film__slide"; el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      `<div class="film__bg" style="background-image:url('${thumb(it.src)}')"></div>` +
      `<span class="film__vig"></span>` +
      `<div class="film__plate"><img src="${it.src}" alt="${esc(it.title || "")}" loading="lazy" decoding="async" draggable="false"></div>` +
      `<div class="film__meta"><span class="film__idx">${pad2(i + 1)}</span>` +
      `<h3 class="film__title">${esc((it.title || "untitled").toLowerCase())}</h3>` +
      `<p class="film__sub">${esc(it.placement || "—")} · ${esc((it.category || "—").toLowerCase())}</p>` +
      `<span class="film__open">open plate →</span></div>`;
    el.querySelector(".film__plate").addEventListener("click", () => select(it));
    return el;
  }

  const playable = () => anim() && !reduced && visible && !hovered && !(lb && lb.classList.contains("open"));

  function stopAuto() { if (timer) { clearTimeout(timer); timer = null; } if (rail) { rail.kill(); rail = null; } }
  function startAuto() {
    stopAuto();
    if (!playable()) { if (railFill) railFill.style.width = "0%"; return; }
    if (railFill) rail = G.fromTo(railFill, { width: "0%" }, { width: "100%", duration: DUR / 1000, ease: "none" });
    timer = setTimeout(() => go(cur + 1), DUR);
  }

  function go(n) {
    const i = ((n % list.length) + list.length) % list.length;
    slides[cur]?.classList.remove("is-active");
    slides[cur]?.setAttribute("aria-hidden", "true");
    dots[cur]?.classList.remove("on");
    cur = i;
    slides[cur].classList.add("is-active");
    slides[cur].setAttribute("aria-hidden", "false");
    dots[cur]?.classList.add("on");
    const it = list[cur];
    if (countEl) countEl.textContent = `plate ${pad2(cur + 1)} / ${pad2(list.length)}`;
    updateFolio(gidx(it) + 1, all.length);
    startAuto();
  }

  function buildStage(l) {
    stopAuto();
    slides.forEach(s => s.remove());
    stage.querySelectorAll(".film__slide").forEach(s => s.remove());
    dotsEl.innerHTML = "";
    slides = l.map((it, i) => { const s = slide(it, i); stage.appendChild(s); return s; });
    dots = l.map((_, i) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "film__dot"; d.setAttribute("role", "tab"); d.setAttribute("aria-label", `plate ${i + 1}`);
      d.addEventListener("click", () => go(i));
      dotsEl.appendChild(d); return d;
    });
    cur = 0;
    slides[0]?.classList.add("is-active");
    slides[0]?.setAttribute("aria-hidden", "false");
    dots[0]?.classList.add("on");
    const it0 = l[0];
    if (it0) { if (countEl) countEl.textContent = `plate 01 / ${pad2(l.length)}`; updateFolio(gidx(it0) + 1, all.length); }
    startAuto();
  }

  /* controls */
  arrowPrev?.addEventListener("click", () => go(cur - 1));
  arrowNext?.addEventListener("click", () => go(cur + 1));
  stage.addEventListener("mouseenter", () => { hovered = true; stopAuto(); });
  stage.addEventListener("mouseleave", () => { hovered = false; startAuto(); });
  document.addEventListener("visibilitychange", () => document.hidden ? stopAuto() : startAuto());
  lb?.addEventListener("transitionend", () => { if (!lb.classList.contains("open")) startAuto(); });

  // pause when the reel is off-screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? startAuto() : stopAuto(); }, { threshold: 0.25 }).observe(stage);
  }

  // swipe / drag
  let sx = 0, dragging = false;
  stage.addEventListener("pointerdown", (e) => { sx = e.clientX; dragging = true; });
  stage.addEventListener("pointerup", (e) => { if (!dragging) return; dragging = false; const dx = e.clientX - sx; if (Math.abs(dx) > 60) go(cur + (dx < 0 ? 1 : -1)); });
  stage.addEventListener("pointercancel", () => { dragging = false; });
  // keyboard when the reel has focus
  stage.tabIndex = 0;
  stage.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(cur + 1); else if (e.key === "ArrowLeft") go(cur - 1); });

  /* filter word-row (reuses #vCats / .v-cat) */
  const cats = ["selected", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "v-cat" + (cat === "selected" ? " on" : ""); b.textContent = cat.toLowerCase();
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "selected" ? curate(featured.length ? featured : all, 12) : curate(all.filter(x => x.category === cat), 12);
      buildStage(list);
      filterIndex(cat === "selected" ? "all" : cat);
    });
    catsEl.appendChild(b);
  });
  if (gCount) gCount.textContent = `${all.length} works`;

  buildStage(list);

  /* complete index — 305-plate contact sheet */
  let idxCells = [];
  function renderIndex() {
    const grid = document.getElementById("indexGrid");
    if (!grid) return;
    const frag = document.createDocumentFragment();
    idxCells = all.map((it, idx) => {
      const cell = document.createElement("button");
      cell.type = "button"; cell.className = "icell"; cell.dataset.cat = it.category || ""; cell.setAttribute("aria-label", it.title || "plate");
      cell.innerHTML = `<img src="${thumb(it.src)}" loading="lazy" alt=""><span class="icell__no">${pad3(idx + 1)}</span>`;
      cell.addEventListener("click", () => select(it));
      frag.appendChild(cell); return cell;
    });
    grid.appendChild(frag);
    if (anim() && window.ScrollTrigger) {
      G.set(idxCells, { opacity: 0, y: 16 });
      window.ScrollTrigger.batch(idxCells, { start: "top 97%", onEnter: (b) => G.to(b, { opacity: 1, y: 0, duration: .5, stagger: .012, ease: "power2.out", overwrite: true }) });
    }
  }
  function filterIndex(cat) {
    if (!idxCells.length) return;
    idxCells.forEach(c => c.classList.toggle("hide", cat !== "all" && c.dataset.cat !== cat));
    window.ScrollTrigger?.refresh();
  }
  renderIndex();
  window.ScrollTrigger?.refresh();
}

/* running folio */
let folioEl;
function updateFolio(n, total) {
  folioEl = folioEl || document.getElementById("folio");
  if (folioEl) folioEl.textContent = `pl. ${pad3(n)} / ${pad3(total)}`;
}
