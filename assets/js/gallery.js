/* Galerie — exhibition: a large framed feature work + catalogue placard + thumbnail index strip.
   prev/next · drag · wheel · arrow keys · category filter · click feature → lightbox. */

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");

export async function initGallery({ onSelect } = {}) {
  const img = document.getElementById("vImg");
  if (!img) return;
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

  let list = all, i = 0, thumbs = [];

  function buildStrip() {
    stripEl.innerHTML = "";
    thumbs = list.map((it, idx) => {
      const t = document.createElement("button");
      t.className = "ex-thumb";
      t.setAttribute("aria-label", it.title || "work");
      t.innerHTML = `<img src="${thumb(it.src)}" loading="lazy" alt="">`;
      t.addEventListener("click", () => { i = idx; render(); });
      stripEl.appendChild(t);
      return t;
    });
  }
  function preload(idx) {
    [idx - 1, idx + 1].forEach(k => { const it = list[(k + list.length) % list.length]; if (it) new Image().src = it.src; });
  }
  function render() {
    const it = list[i];
    img.style.opacity = 0;
    const im = new Image();
    im.onload = () => { img.src = it.src; img.style.opacity = 1; };
    im.src = it.src;
    titleEl.textContent = it.title || "";
    subEl.textContent = [it.category, it.placement].filter(Boolean).join(" · ");
    countEl.textContent = `№ ${pad(i + 1)} / ${pad(list.length)}`;
    thumbs.forEach((t, idx) => t.classList.toggle("on", idx === i));
    const tb = thumbs[i];
    if (tb) stripEl.scrollTo({ left: tb.offsetLeft - stripEl.clientWidth / 2 + tb.clientWidth / 2, behavior: "smooth" });
    preload(i);
  }
  const go = (d) => { i = (i + d + list.length) % list.length; render(); };

  // category filter
  const cats = ["all", ...[...new Set(all.map(x => x.category))].filter(Boolean)];
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "v-cat" + (cat === "all" ? " on" : "");
    b.textContent = cat;
    b.addEventListener("click", () => {
      catsEl.querySelectorAll(".v-cat").forEach(c => c.classList.toggle("on", c === b));
      list = cat === "all" ? all : all.filter(x => x.category === cat);
      i = 0; buildStrip(); render();
    });
    catsEl.appendChild(b);
  });
  if (gCount) gCount.textContent = `${all.length} works`;

  document.getElementById("vPrev").addEventListener("click", () => go(-1));
  document.getElementById("vNext").addEventListener("click", () => go(1));

  // drag + wheel + keys + click → lightbox
  const frame = img.closest(".ex-frame");
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
  img.addEventListener("click", () => { if (dragged) { dragged = false; return; } onSelect?.(list[i]); });

  buildStrip();
  render();
}
