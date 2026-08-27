/* Galerie — THE SKETCHBOOK.
   A warm plate-book you leaf through (StPageFlip): cover → per-piece spread
   (verso notes / recto plate) → colophon. Tap a plate → full lightbox.
   The word-row filter re-paginates the book and re-sorts the 305 index.
   Falls back to a quiet paper grid with no JS / reduced-motion.
   (Engine = page-flip@2.0.7, global St.PageFlip — restyled entirely in CSS.) */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");
const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const G = window.gsap;
const anim = () => document.documentElement.classList.contains("anim") && !!G;

export async function initGallery({ items, onSelect } = {}) {
  const wrap = document.getElementById("bookWrap");
  if (!wrap) return;
  let book;
  const freshBook = () => {
    wrap.innerHTML = "";
    book = document.createElement("div");
    book.className = "book";
    book.setAttribute("aria-label", "pully sketchbook — drag a corner to turn the page");
    wrap.appendChild(book);
    return book;
  };
  const all = items || ((await (await fetch("./data/images.json")).json()).items || []);
  if (!all.length) return;
  const featured = all.filter(x => x.featured);

  const catsEl = document.getElementById("vCats");
  const gCount = document.getElementById("gCount");
  const countEl = document.getElementById("bookCount");
  const railFill = document.getElementById("bookRailFill");
  const btnPrev = document.getElementById("bookPrev");
  const btnNext = document.getElementById("bookNext");

  const gidx = (it) => all.indexOf(it);
  const select = (it) => onSelect?.(Object.assign({}, it, { no: gidx(it) + 1, total: all.length }));

  let list = featured.length ? featured : all;
  let pf = null, pfState = "read";

  /* ── page builders ── */
  function coverPage(n) {
    const d = document.createElement("div");
    d.className = "page page--cover"; d.setAttribute("data-density", "hard");
    d.innerHTML = `<span class="page__ghost">${pad2(n)}</span><div class="page__pad"><span class="page__brand">pully</span><span class="page__sub">a sketchbook</span><span class="page__edition">plates 001–${pad3(n)} · <span class="vi">hà nội</span></span></div>`;
    return d;
  }
  function notesPage(it, i, total) {
    const d = document.createElement("div");
    d.className = "page page--verso";
    const ink = (it.palette === "black" || !it.palette) ? "black" : "with colour";
    d.innerHTML = `<div class="page__pad">
      <span class="page__idx">№ ${pad3(i + 1)} / ${pad3(total)}</span>
      <h3 class="page__title">${esc((it.title || "untitled").toLowerCase())}</h3>
      <div class="page__meta">
        <div>placement<b>${esc(it.placement || "—")}</b></div>
        <div>category<b>${esc((it.category || "—").toLowerCase())}</b></div>
        <div>ink<b>${ink}</b></div>
      </div>
      <span class="page__open"><a class="link" href="#" data-open="1">open full plate →</a></span>
    </div>`;
    d.querySelector("[data-open]").addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (pfState === "read") select(it); });
    return d;
  }
  function platePage(it) {
    const d = document.createElement("div");
    d.className = "page page--recto";
    d.innerHTML = `<figure class="page__plate"><div class="page__win"><img data-src="${thumb(it.src)}" alt="${esc(it.title || "")}" draggable="false" decoding="async"></div></figure><span class="page__no">pl. ${pad3(gidx(it) + 1)}</span>`;
    const fig = d.querySelector(".page__plate");
    fig.addEventListener("click", (e) => { e.stopPropagation(); if (pfState === "read") select(it); });
    fig.addEventListener("mousedown", (e) => e.stopPropagation());
    fig.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
    return d;
  }
  function creditsPage() {
    const d = document.createElement("div");
    d.className = "page page--back"; d.setAttribute("data-density", "hard");
    d.innerHTML = `<div class="page__pad"><span class="shead__kick">colophon</span><span class="page__sig">pully</span><div class="page__meta"><div>tattooed &amp; drawn by<b>pully</b></div><div class="vi">located<b class="vi">hà nội, vn</b></div><div>working<b>by appointment</b></div></div></div>`;
    return d;
  }
  function linksPage() {
    const d = document.createElement("div");
    d.className = "page page--back"; d.setAttribute("data-density", "hard");
    d.innerHTML = `<div class="page__pad"><span class="shead__kick">the archive</span><a class="link" href="#index">complete index — 305 plates →</a><a class="link" href="#booking">book a sitting →</a><span class="page__edition">fin</span></div>`;
    return d;
  }
  function buildPages(l) {
    const pages = [coverPage(l.length)];
    l.forEach((it, i) => { pages.push(notesPage(it, i, l.length)); pages.push(platePage(it)); });
    pages.push(creditsPage(), linksPage());
    return pages;
  }

  const pieceAtPage = (p) => (p < 1 ? null : list[Math.floor((p - 1) / 2)] || null);
  function lazyAround(p) {
    const ps = book.querySelectorAll(".page");
    for (let k = Math.max(0, p - 2); k <= Math.min(ps.length - 1, p + 3); k++) {
      const im = ps[k]?.querySelector("img[data-src]");
      if (im) { im.src = im.dataset.src; im.removeAttribute("data-src"); }
    }
  }
  function loadAllThumbs() { book.querySelectorAll("img[data-src]").forEach(im => { im.src = im.dataset.src; im.removeAttribute("data-src"); }); }

  function updateBookUI() {
    const total = pf ? pf.getPageCount() : book.querySelectorAll(".page").length;
    const cur = pf ? pf.getCurrentPageIndex() : 0;
    const it = pieceAtPage(cur);
    if (countEl) countEl.textContent = it ? `plate ${pad2(list.indexOf(it) + 1)} / ${pad2(list.length)}` : (cur === 0 ? "cover" : "colophon");
    if (railFill) railFill.style.width = total > 1 ? `${(cur / (total - 1)) * 100}%` : "0%";
    if (btnPrev) btnPrev.disabled = cur <= 0;
    if (btnNext) btnNext.disabled = cur >= total - 1;
    if (it) updateFolio(gidx(it) + 1, all.length);
  }

  function mountBook(l) {
    if (pf) { try { pf.destroy(); } catch { /* ignore */ } pf = null; }
    freshBook();
    buildPages(l).forEach(p => book.appendChild(p));

    if (!(anim() && window.St && window.St.PageFlip)) { loadAllThumbs(); updateBookUI(); return; }

    pf = new window.St.PageFlip(book, {
      width: 400, height: 545, size: "stretch",
      minWidth: 260, maxWidth: 620, minHeight: 340, maxHeight: 820,
      maxShadowOpacity: 0.22, showCover: true, usePortrait: true,
      mobileScrollSupport: false, drawShadow: true, flippingTime: 780, useMouseEvents: true
    });
    pf.loadFromHTML(book.querySelectorAll(".page"));
    book.classList.add("is-live");
    lazyAround(0); updateBookUI();
    pf.on("flip", (e) => { lazyAround(e.data); updateBookUI(); });
    pf.on("changeState", (e) => { pfState = e.data; if (pfState !== "read") window.lenis?.stop(); else window.lenis?.start(); });
  }

  btnPrev?.addEventListener("click", () => pf ? pf.flipPrev() : null);
  btnNext?.addEventListener("click", () => pf ? pf.flipNext() : null);

  /* ── filter word-row (reuses #vCats / .v-cat) ── */
  const cats = ["selected", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "v-cat" + (cat === "selected" ? " on" : ""); b.textContent = cat.toLowerCase();
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "selected" ? (featured.length ? featured : all) : all.filter(x => x.category === cat);
      mountBook(list);
      filterIndex(cat === "selected" ? "all" : cat);
      window.ScrollTrigger?.refresh();
    });
    catsEl.appendChild(b);
  });
  if (gCount) gCount.textContent = `${all.length} works`;

  mountBook(list);

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
