/* Galerie — work-list ↔ central plate ↔ odometer index.
   Hover a work to preview it, click to open. prev/next · drag · wheel · keys · filter.
   Plus the back-of-book COMPLETE INDEX (305-plate contact sheet, live re-sort). */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");
const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const G = window.gsap;
const anim = () => document.documentElement.classList.contains("anim") && !!G;
const grade = "saturate(1.04) contrast(1.02) brightness(1.005)";

export async function initGallery({ items, onSelect } = {}) {
  const imgA = document.getElementById("vImgA");
  const imgB = document.getElementById("vImgB");
  if (!imgA) return;
  const all = items || (await (await fetch("./data/images.json")).json()).items || [];
  if (!all.length) return;
  const featured = all.filter(x => x.featured);

  const listEl = document.getElementById("workList");
  const catsEl = document.getElementById("vCats");
  const stripEl = document.getElementById("vStrip");
  const numEl = document.getElementById("bigNum");
  const gCount = document.getElementById("gCount");

  const layers = [imgA, imgB];
  let list = featured.length ? featured : all;
  let i = 0, active = 0, rows = [], thumbs = [];

  const gidx = (it) => all.indexOf(it);
  const select = (it) => onSelect?.(Object.assign({}, it, { no: gidx(it) + 1, total: all.length }));

  function buildList() {
    listEl.innerHTML = "";
    rows = list.map((it, idx) => {
      const b = document.createElement("button");
      b.className = "work"; b.type = "button"; b.setAttribute("role", "option");
      b.innerHTML = `<span class="work__cat">${(it.category || "").toLowerCase()}</span><span class="work__t">${(it.title || "untitled").toLowerCase()}</span>`;
      b.addEventListener("pointerenter", () => { if (matchMedia("(hover:hover)").matches && idx !== i) { const d = idx > i ? 1 : -1; i = idx; show(d); } });
      b.addEventListener("click", () => { i = idx; select(list[i]); });
      listEl.appendChild(b);
      return b;
    });
  }
  function buildStrip() {
    stripEl.innerHTML = "";
    thumbs = list.map((it, idx) => {
      const t = document.createElement("button");
      t.className = "ex-thumb"; t.setAttribute("aria-label", it.title || "work");
      t.innerHTML = `<img src="${thumb(it.src)}" loading="lazy" alt=""><span>${pad2(idx + 1)}</span>`;
      t.addEventListener("click", () => { const d = idx > i ? 1 : -1; i = idx; show(d); });
      stripEl.appendChild(t);
      return t;
    });
  }
  function preload(idx) { [idx - 1, idx + 1].forEach(k => { const it = list[(k + list.length) % list.length]; if (it) new Image().src = it.src; }); }
  function bumpIndex(next) {
    if (!numEl) return;
    if (!anim()) { numEl.textContent = next; return; }
    G.timeline()
      .to(numEl, { yPercent: -110, opacity: 0, duration: .26, ease: "power2.in" })
      .add(() => { numEl.textContent = next; })
      .fromTo(numEl, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: "expo.out" });
  }
  function paint() {
    const it = list[i];
    bumpIndex(pad2(i + 1));
    rows.forEach((r, idx) => r.classList.toggle("is-active", idx === i));
    thumbs.forEach((t, idx) => t.classList.toggle("on", idx === i));
    const r = rows[i]; if (r) r.scrollIntoView({ block: "nearest" });
    const tb = thumbs[i]; if (tb) stripEl.scrollTo({ left: tb.offsetLeft - stripEl.clientWidth / 2 + tb.clientWidth / 2, behavior: "smooth" });
    updateFolio(gidx(it) + 1, all.length);
    preload(i);
  }
  function first() {
    paint();
    const it = list[i];
    layers[0].src = it.src; layers[0].classList.add("is-active");
    layers[1].classList.remove("is-active");
    if (G) { G.set(layers[0], { opacity: 1, zIndex: 2, clipPath: "inset(0 0 0 0)", scale: 1 }); G.set(layers[1], { opacity: 0, zIndex: 1 }); }
    active = 0; preload(i);
  }
  function show(dir) {
    paint();
    const it = list[i];
    const incoming = layers[1 - active], outgoing = layers[active];
    const tmp = new Image();
    tmp.onload = () => {
      incoming.src = it.src;
      incoming.classList.add("is-active"); outgoing.classList.remove("is-active");
      if (G) {
        G.set(incoming, { opacity: 1, zIndex: 2, clipPath: dir >= 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)", scale: 1.04 });
        G.set(outgoing, { zIndex: 1 });
        G.to(incoming, { clipPath: "inset(0 0 0% 0)", scale: 1, duration: .95, ease: "expo.out" });
        G.to(outgoing, { y: dir >= 0 ? -12 : 12, opacity: 0, duration: .5, ease: "power2.in", onComplete: () => G.set(outgoing, { y: 0 }) });
      } else { incoming.style.opacity = 1; outgoing.style.opacity = 0; }
      active = 1 - active;
    };
    tmp.src = it.src;
  }
  const go = (d) => { i = (i + d + list.length) % list.length; show(d >= 0 ? 1 : -1); };

  // category filter — "selected" = featured, else the full category
  const cats = ["selected", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "v-cat" + (cat === "selected" ? " on" : "");
    b.textContent = cat.toLowerCase();
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "selected" ? (featured.length ? featured : all) : all.filter(x => x.category === cat);
      i = 0; buildList(); buildStrip(); first();
      filterIndex(cat === "selected" ? "all" : cat);
      window.ScrollTrigger?.refresh();
    });
    catsEl.appendChild(b);
  });
  if (gCount) gCount.textContent = `${all.length} works`;

  document.getElementById("vPrev").addEventListener("click", () => go(-1));
  document.getElementById("vNext").addEventListener("click", () => go(1));

  // drag + wheel + keys + click → lightbox
  const frame = imgA.closest(".ex-frame");
  let down = false, sx = 0, dragged = false;
  frame.addEventListener("pointerdown", (e) => { down = true; sx = e.clientX; dragged = false; });
  frame.addEventListener("pointermove", (e) => { if (!down) return; if (Math.abs(e.clientX - sx) > 55) { go(e.clientX < sx ? 1 : -1); sx = e.clientX; dragged = true; } });
  window.addEventListener("pointerup", () => { down = false; });
  frame.addEventListener("wheel", (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) + 2) { e.preventDefault(); go(e.deltaX > 0 ? 1 : -1); } }, { passive: false });
  window.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });
  frame.addEventListener("click", () => { if (dragged) { dragged = false; return; } select(list[i]); });

  buildList(); buildStrip(); first();

  /* ── complete index — 305-plate contact sheet ── */
  let idxCells = [];
  function renderIndex() {
    const grid = document.getElementById("indexGrid");
    if (!grid) return;
    const frag = document.createDocumentFragment();
    idxCells = all.map((it, idx) => {
      const cell = document.createElement("button");
      cell.className = "icell"; cell.dataset.cat = it.category || ""; cell.setAttribute("aria-label", it.title || "plate");
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
