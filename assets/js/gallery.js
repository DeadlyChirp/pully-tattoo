/* Galerie — THE SPREAD: a curated exhibition wall of 6 large plates.
   Click a plate → it morphs (GSAP Flip) into a focused reading plate.
   Word-row filter re-hangs the wall; prev/next + dot-rail page the spreads.
   Reuses the lightbox (full detail), the 305 complete index, and the folio. */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");
const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const chunk = (a, n) => a.reduce((o, _, i) => (i % n ? o : [...o, a.slice(i, i + n)]), []);
const G = window.gsap;
const F = window.Flip;
const anim = () => document.documentElement.classList.contains("anim") && !!G;

export async function initGallery({ items, onSelect } = {}) {
  const wall = document.getElementById("spread");
  if (!wall) return;
  const all = items || ((await (await fetch("./data/images.json")).json()).items || []);
  if (!all.length) return;
  const featured = all.filter(x => x.featured);

  const ghost = document.getElementById("spGhost");
  const catsEl = document.getElementById("vCats");
  const railEl = document.getElementById("spRail");
  const countEl = document.getElementById("spCount");
  const gCount = document.getElementById("gCount");
  const scrim = document.getElementById("spScrim");
  const cap = document.getElementById("spCap");

  const gidx = (it) => all.indexOf(it);
  const select = (it) => onSelect?.(Object.assign({}, it, { no: gidx(it) + 1, total: all.length }));

  let list = featured.length ? featured : all;
  let spreads = chunk(list, 6);
  let sp = 0;
  const nSpreads = () => spreads.length;

  const plates = () => [...wall.querySelectorAll(".plate")];

  function buildPlate(it, k) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "plate" + (k === 0 ? " is-anchor" : "");
    b.style.gridArea = "abcdef"[k] || "f";
    b.setAttribute("aria-label", (it.title || "plate").toLowerCase());
    b.innerHTML = `<img src="${thumb(it.src)}" loading="lazy" alt="" draggable="false"><span class="plate__no">${pad3(gidx(it) + 1)}</span>`;
    b.addEventListener("pointerenter", () => updateFolio(gidx(it) + 1, all.length));
    b.addEventListener("click", () => openFocus(b, it));
    return b;
  }
  function mountSpread(n) {
    plates().forEach(p => p.remove());
    wall.classList.remove("sp--A", "sp--B");
    wall.classList.add(n % 2 === 0 ? "sp--A" : "sp--B");
    (spreads[n] || []).forEach((it, k) => wall.appendChild(buildPlate(it, k)));
    if (ghost) ghost.textContent = pad2(n + 1);
    if (countEl) countEl.textContent = `spread ${pad2(n + 1)} / ${pad2(nSpreads())}`;
    railEl?.querySelectorAll(".sp__dot").forEach((d, i) => d.classList.toggle("on", i === n));
  }
  // developing-plate entrance (first view only)
  function entrance() {
    if (!anim()) return;
    const imgs = plates().map(p => p.querySelector("img"));
    G.set(imgs, { clipPath: "inset(100% 0 0 0)", scale: 1.06 });
    G.set(ghost, { yPercent: 40, opacity: 0 });
    window.ScrollTrigger?.create({
      trigger: wall, start: "top 82%", once: true, onEnter: () => {
        G.to(imgs, { clipPath: "inset(0% 0 0 0)", scale: 1, duration: .85, ease: "power3.out", stagger: .07 });
        G.to(ghost, { yPercent: 0, opacity: .06, duration: 1, ease: "power3.out" });
      }
    });
  }
  // page to another spread (prev/next, dot, filter) — a soft crossfade re-hang
  function hangSpread(n) {
    sp = n;
    if (!anim()) { mountSpread(n); return; }
    const old = plates();
    G.to(old, {
      opacity: 0, scale: .96, y: 8, duration: .32, ease: "power2.in", stagger: .03,
      onComplete: () => {
        mountSpread(n);
        G.fromTo(plates(), { opacity: 0, scale: .96, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: .5, ease: "power2.out", stagger: .05 });
        G.fromTo(ghost, { opacity: 0, yPercent: 20 }, { opacity: .06, yPercent: 0, duration: .6, ease: "power2.out" });
        window.ScrollTrigger?.refresh();
      }
    });
  }

  /* ── Flip focus (the wow) ── */
  let openPlate = null, dimmed = [], titleSplit = null, isOpen = false;
  function openFocus(plate, it) {
    if (isOpen) return;
    isOpen = true; openPlate = plate;
    window.lenis?.stop();
    document.getElementById("spCapNo").textContent = `№ ${pad3(gidx(it) + 1)} / ${pad3(all.length)}`;
    document.getElementById("spCapCat").textContent = (it.category || "").toLowerCase();
    const titleEl = document.getElementById("spCapTitle");
    titleEl.textContent = (it.title || "untitled").toLowerCase();
    document.getElementById("spCapPlace").textContent = it.placement ? `placement — ${it.placement}` : "";
    document.getElementById("spCapFull").onclick = (e) => { e.preventDefault(); closeFocus(); select(it); };
    updateFolio(gidx(it) + 1, all.length);
    scrim.onclick = closeFocus;

    dimmed = plates().filter(p => p !== plate);
    if (anim() && F) {
      const state = F.getState(plate, { props: "borderRadius,boxShadow" });
      plate.classList.add("is-open");
      F.from(state, { absolute: true, scale: true, duration: .72, ease: "expo.inOut" });
      G.to(dimmed, { opacity: .12, filter: "blur(3px)", scale: .985, duration: .5, ease: "power2.out" });
      scrim.classList.add("on");
      cap.classList.add("on");
      titleSplit?.revert?.();
      if (window.SplitText) { titleSplit = new window.SplitText(titleEl, { type: "lines", mask: "lines" }); G.from(titleSplit.lines, { yPercent: 110, stagger: .06, duration: .7, ease: "power2.out", delay: .34 }); }
    } else {
      plate.classList.add("is-open"); scrim.classList.add("on"); cap.classList.add("on");
    }
  }
  function closeFocus() {
    if (!isOpen) return;
    isOpen = false;
    cap.classList.remove("on"); scrim.classList.remove("on");
    titleSplit?.revert?.(); titleSplit = null;
    if (dimmed.length && G) G.to(dimmed, { opacity: 1, filter: "blur(0px)", scale: 1, duration: .4, ease: "power2.out" });
    const plate = openPlate;
    if (anim() && F && plate) {
      const state = F.getState(plate, { props: "borderRadius,boxShadow" });
      plate.classList.remove("is-open");
      F.from(state, { absolute: true, scale: true, duration: .6, ease: "expo.inOut" });
    } else { plate?.classList.remove("is-open"); }
    window.lenis?.start();
    openPlate = null;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) closeFocus(); });

  /* ── dot rail + paging ── */
  function buildRail() {
    if (!railEl) return;
    railEl.innerHTML = "";
    spreads.forEach((_, k) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "sp__dot" + (k === sp ? " on" : ""); d.setAttribute("aria-label", `spread ${k + 1}`);
      d.addEventListener("click", () => { if (k !== sp) hangSpread(k); });
      railEl.appendChild(d);
    });
  }
  document.getElementById("spPrev").addEventListener("click", () => hangSpread((sp - 1 + nSpreads()) % nSpreads()));
  document.getElementById("spNext").addEventListener("click", () => hangSpread((sp + 1) % nSpreads()));

  /* ── filter word-row (reuses #vCats / .v-cat) ── */
  const cats = ["selected", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "v-cat" + (cat === "selected" ? " on" : ""); b.textContent = cat.toLowerCase();
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "selected" ? (featured.length ? featured : all) : all.filter(x => x.category === cat);
      spreads = chunk(list, 6); sp = 0; buildRail(); hangSpread(0);
      filterIndex(cat === "selected" ? "all" : cat);
      window.ScrollTrigger?.refresh();
    });
    catsEl.appendChild(b);
  });
  if (gCount) gCount.textContent = `${all.length} works`;

  buildRail();
  mountSpread(0);
  entrance();

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
