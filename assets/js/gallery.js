/* Galerie — THE FILM.
   A full-bleed cinema reel: each featured plate takes the whole viewport,
   sitting over an ambient blurred backdrop drawn from its own colours, with the
   plate and backdrop parallaxing at different depths. Tap a plate → full lightbox.
   The word-row filter re-cuts the reel and re-sorts the 305 index.
   Degrades to a stack of full-bleed stills with no JS / reduced-motion. */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");
const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const G = window.gsap;
const anim = () => document.documentElement.classList.contains("anim") && !!G;

export async function initGallery({ items, onSelect } = {}) {
  const reel = document.getElementById("filmReel");
  if (!reel) return;
  const all = items || ((await (await fetch("./data/images.json")).json()).items || []);
  if (!all.length) return;
  const featured = all.filter(x => x.featured);

  const catsEl = document.getElementById("vCats");
  const gCount = document.getElementById("gCount");
  const countEl = document.getElementById("bookCount");

  const gidx = (it) => all.indexOf(it);
  const select = (it) => onSelect?.(Object.assign({}, it, { no: gidx(it) + 1, total: all.length }));

  let list = featured.length ? featured : all;
  let reelST = [];                                   // scroll-triggers to kill on re-cut

  const setCurrent = (i) => {
    const it = list[i]; if (!it) return;
    if (countEl) countEl.textContent = `plate ${pad2(i + 1)} / ${pad2(list.length)}`;
    updateFolio(gidx(it) + 1, all.length);
  };

  /* ── one cinema panel ── */
  function panel(it, i) {
    const el = document.createElement("article");
    el.className = "film__panel";
    el.innerHTML =
      `<div class="film__bg" style="background-image:url('${thumb(it.src)}')"></div>` +
      `<span class="film__vig"></span>` +
      `<figure class="film__plate"><img src="${it.src}" alt="${esc(it.title || "")}" loading="lazy" decoding="async" draggable="false"></figure>` +
      `<div class="film__meta"><span class="film__idx">${pad2(i + 1)}</span>` +
      `<h3 class="film__title">${esc((it.title || "untitled").toLowerCase())}</h3>` +
      `<p class="film__sub">${esc(it.placement || "—")} · ${esc((it.category || "—").toLowerCase())}</p>` +
      `<span class="film__open">open plate →</span></div>` +
      `<span class="film__count">${pad2(i + 1)} / ${pad2(list.length)}</span>`;
    el.querySelector(".film__plate").addEventListener("click", () => select(it));
    return el;
  }

  function buildReel(l) {
    reelST.forEach(s => s && s.kill());
    reelST = [];
    reel.innerHTML = "";
    l.forEach((it, i) => reel.appendChild(panel(it, i)));

    if (!(anim() && window.ScrollTrigger)) { setCurrent(0); return; }

    reel.querySelectorAll(".film__panel").forEach((el, i) => {
      const bg = el.querySelector(".film__bg");
      const img = el.querySelector(".film__plate img");
      const meta = el.querySelectorAll(".film__meta > *");
      const t1 = G.fromTo(bg, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      const t2 = G.fromTo(img, { yPercent: -6, scale: 1.09 }, { yPercent: 6, scale: 1.02, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      const t3 = G.from(meta, { y: 36, opacity: 0, duration: .9, stagger: .08, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 62%" } });
      const st = window.ScrollTrigger.create({ trigger: el, start: "top center", end: "bottom center", onToggle: (self) => { if (self.isActive) setCurrent(i); } });
      reelST.push(t1.scrollTrigger, t2.scrollTrigger, t3.scrollTrigger, st);
    });
    setCurrent(0);
  }

  /* ── filter word-row (reuses #vCats / .v-cat) ── */
  const cats = ["selected", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "v-cat" + (cat === "selected" ? " on" : ""); b.textContent = cat.toLowerCase();
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "selected" ? (featured.length ? featured : all) : all.filter(x => x.category === cat);
      buildReel(list);
      filterIndex(cat === "selected" ? "all" : cat);
      window.ScrollTrigger?.refresh();
    });
    catsEl.appendChild(b);
  });
  if (gCount) gCount.textContent = `${all.length} works`;

  buildReel(list);

  /* ── complete index — 305-plate contact sheet ── */
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
