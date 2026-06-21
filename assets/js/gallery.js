/* Galerie — exhibition: large feature work (clip-wipe transition between pieces)
   + catalogue placard + thumbnail index strip. prev/next · drag · wheel · keys · filter · click→lightbox. */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");
const G = window.gsap;

export async function initGallery({ onSelect } = {}) {
  const imgA = document.getElementById("vImgA");
  const imgB = document.getElementById("vImgB");
  if (!imgA) return;
  const data = await (await fetch("./data/images.json")).json();
  const all = data.items || [];
  if (!all.length) return;

  const titleEl = document.getElementById("vTitle");
  const subEl = document.getElementById("vSub");
  const countEl = document.getElementById("vCount");
  const catsEl = document.getElementById("vCats");
  const stripEl = document.getElementById("vStrip");
  const gCount = document.getElementById("gCount");
  const pad = (n) => String(n).padStart(2, "0");

  const layers = [imgA, imgB];
  let list = all, i = 0, active = 0, thumbs = [];

  function buildStrip() {
    stripEl.innerHTML = "";
    thumbs = list.map((it, idx) => {
      const t = document.createElement("button");
      t.className = "ex-thumb";
      t.setAttribute("aria-label", it.title || "work");
      t.innerHTML = `<img src="${thumb(it.src)}" loading="lazy" alt="">`;
      t.addEventListener("click", () => { const d = idx > i ? 1 : -1; i = idx; show(d); });
      stripEl.appendChild(t);
      return t;
    });
  }
  function preload(idx) {
    [idx - 1, idx + 1].forEach(k => { const it = list[(k + list.length) % list.length]; if (it) new Image().src = it.src; });
  }
  function paint() {
    const it = list[i];
    titleEl.textContent = it.title || "";
    subEl.textContent = [it.category, it.placement].filter(Boolean).join(" · ");
    countEl.textContent = `№ ${pad(i + 1)} / ${pad(list.length)}`;
    thumbs.forEach((t, idx) => t.classList.toggle("on", idx === i));
    const tb = thumbs[i];
    if (tb) stripEl.scrollTo({ left: tb.offsetLeft - stripEl.clientWidth / 2 + tb.clientWidth / 2, behavior: "smooth" });
    preload(i);
  }
  function first() {
    paint();
    const it = list[i];
    layers[0].src = it.src; layers[0].classList.add("is-active");
    layers[1].classList.remove("is-active");
    if (G) { G.set(layers[0], { opacity: 1, zIndex: 2 }); G.set(layers[1], { opacity: 0, zIndex: 1 }); }
    active = 0;
    preload(i);
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
        const start = dir >= 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
        G.set(incoming, { opacity: 1, zIndex: 2, clipPath: start, scale: 1.06 });
        G.set(outgoing, { zIndex: 1 });
        G.to(incoming, { clipPath: "inset(0 0 0 0%)", scale: 1, duration: 1, ease: "expo.out", onComplete: () => G.set(outgoing, { opacity: 0 }) });
      } else { incoming.style.opacity = 1; outgoing.style.opacity = 0; }
      active = 1 - active;
    };
    tmp.src = it.src;
  }
  const go = (d) => { i = (i + d + list.length) % list.length; show(d >= 0 ? 1 : -1); };

  // category filter
  const cats = ["all", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "v-cat" + (cat === "all" ? " on" : "");
    b.textContent = cat;
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "all" ? all : all.filter(x => x.category === cat);
      i = 0; buildStrip(); first();
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
  frame.addEventListener("pointermove", (e) => {
    if (!down) return;
    if (Math.abs(e.clientX - sx) > 55) { go(e.clientX < sx ? 1 : -1); sx = e.clientX; dragged = true; }
  });
  window.addEventListener("pointerup", () => { down = false; });
  frame.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) + 2) { e.preventDefault(); go(e.deltaX > 0 ? 1 : -1); }
  }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });
  frame.addEventListener("click", () => { if (dragged) { dragged = false; return; } onSelect?.(list[i]); });

  buildStrip();
  first();
  window.ScrollTrigger?.refresh();
}
