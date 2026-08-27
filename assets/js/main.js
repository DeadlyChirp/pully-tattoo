/* Orchestration + motion (Lenis + GSAP). Degrades gracefully if libs/reduced-motion. */
import { initGallery } from "./gallery.js?v=12";
import { initBooking } from "./booking.js?v=13";

const cfg = window.PULLY_CONFIG || {};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const G = window.gsap;
const animate = !!(G && window.Lenis && !reduced);

/* ── config links + chrome ─────────────────────────────── */
const setHref = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
setHref("dmLink", cfg.dm || cfg.instagram);
setHref("footIg", cfg.instagram);
setHref("footBeacons", cfg.beacons);
document.getElementById("year").textContent = new Date().getFullYear();

const burger = document.getElementById("navBurger");
const links = document.getElementById("navLinks");
burger?.addEventListener("click", () => { const open = links.classList.toggle("open"); burger.setAttribute("aria-expanded", open); });
links?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); }));

// theme toggle — default soft beige (light); persists
document.getElementById("themeToggle")?.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("pully_theme", next); } catch { /* private mode */ }
  window.ScrollTrigger?.refresh();
});

// live Hà Nội clock (hero status)
const clockEl = document.getElementById("clock");
if (clockEl) {
  const tick = () => { try { clockEl.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date()); } catch { clockEl.textContent = ""; } };
  tick(); setInterval(tick, 30000);
}

const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ── lightbox ──────────────────────────────────────────── */
let lenis = null;
const lb = document.getElementById("lightbox");
function openLightbox(item) {
  document.getElementById("lbNo").textContent = item.no ? `№ ${String(item.no).padStart(3, "0")} / ${String(item.total || 305).padStart(3, "0")}` : "";
  document.getElementById("lbCat").textContent = item.category || "";
  document.getElementById("lbTitle").textContent = (item.title || "").toLowerCase();
  document.getElementById("lbPlace").textContent = item.placement ? `placement — ${item.placement}` : "";
  const im = document.getElementById("lbImg");
  im.src = item.src; im.alt = item.title || "";
  lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  lenis?.stop();
}
function closeLightbox() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); lenis?.start(); }
document.getElementById("lbClose").addEventListener("click", closeLightbox);
document.getElementById("lbBook").addEventListener("click", closeLightbox);
lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

/* ── one data fetch, shared ─────────────────────────────── */
const dataReady = fetch("./data/images.json").then(r => r.json()).then(d => d.items || []).catch(() => []);

/* ── motion ────────────────────────────────────────────── */
const loader = document.getElementById("loader");

if (animate) {
  [window.ScrollTrigger, window.Draggable, window.InertiaPlugin].filter(Boolean).forEach(p => G.registerPlugin(p));
  document.documentElement.classList.add("anim");

  lenis = new window.Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.2, syncTouch: false
  });
  window.lenis = lenis;
  lenis.on("scroll", window.ScrollTrigger.update);
  G.ticker.add((t) => lenis.raf(t * 1000));
  G.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70, duration: 1.2 }); }
    });
  });

  // hero chrome hidden until curtain lifts
  G.set([".lead__k", ".lead__sub", ".lead__meta", ".lead__foot"], { opacity: 0, y: 16 });
  G.set(".nav-word", { yPercent: 60, opacity: 0 });

  // section hairlines draw in on scroll
  G.utils.toArray(".shead__rule").forEach(rule => {
    G.set(rule, { scaleX: 0 });
    G.to(rule, { scaleX: 1, duration: .7, ease: "power3.inOut", scrollTrigger: { trigger: rule, start: "top 90%" } });
  });

  // scroll reveals
  G.set(".reveal", { y: 40, opacity: 0 });
  window.ScrollTrigger.batch(".reveal", { start: "top 88%", onEnter: (b) => G.to(b, { y: 0, opacity: 1, duration: .9, stagger: .12, ease: "expo.out" }) });

  // fade hero chrome as it scrolls away (so it doesn't fight the slim nav)
  G.to(".lead__inner", { opacity: 0, ease: "none", scrollTrigger: { trigger: "#top", start: "40% top", end: "bottom top", scrub: true } });

  // running folio while plates & index are on screen
  const folio = document.getElementById("folio");
  if (folio) window.ScrollTrigger.create({ trigger: "#gallery", start: "top 70%", endTrigger: "#index", end: "bottom 40%", onToggle: (self) => folio.classList.toggle("on", self.isActive) });

  // typeset reveals after fonts (Vietnamese measures correctly)
  document.fonts.ready.then(() => {
    if (window.SplitText) {
      document.querySelectorAll(".shead__title, .lead-p").forEach(el => {
        const s = new window.SplitText(el, { type: "lines", mask: "lines" });
        G.from(s.lines, { yPercent: 110, stagger: .09, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 86%" } });
      });
    }
    window.ScrollTrigger.refresh();
  });

  curtain();
} else if (loader) { loader.style.display = "none"; }

function runHero() {
  const tl = G.timeline();
  tl.to(".nav-word", { yPercent: 0, opacity: 1, stagger: .07, duration: 1, ease: "expo.out" }, 0)
    .to(".lead__k", { opacity: 1, y: 0, duration: .7, ease: "expo.out" }, .1)
    .to(".lead__sub", { opacity: 1, y: 0, duration: .7, ease: "expo.out" }, .45)
    .to(".lead__meta", { opacity: 1, y: 0, duration: .7, ease: "expo.out" }, .55)
    .to(".lead__foot", { opacity: 1, y: 0, duration: .7, ease: "expo.out" }, .65);
}

function curtain() {
  if (sessionStorage.getItem("pully_seen")) { if (loader) loader.style.display = "none"; runHero(); return; }
  sessionStorage.setItem("pully_seen", "1");
  const lc = document.getElementById("loaderCount"), o = { n: 0 };
  G.to(o, { n: 305, duration: 1.2, ease: "power2.out", onUpdate: () => { lc.textContent = String(Math.round(o.n)).padStart(3, "0"); } });
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1600))]).then(() => {
    G.timeline().to(loader, { yPercent: -100, duration: .9, ease: "expo.inOut", delay: .2, onComplete: () => { loader.style.display = "none"; } }).add(runHero, "-=0.45");
  });
}

/* ── floating tattoo field ─────────────────────────────── */
const FLOATERS = [
  { id: "3805425669531497842", t: "Lotus Fan",       top: 12, left: 55, w: 232, rot: -3, depth: .70 },
  { id: "3894437003697118563", t: "Twin Peaks",      top: 6,  left: 78, w: 150, rot: 4,  depth: .55 },
  { id: "3183676054329853301", t: "Blue Cornflower", top: 30, left: 84, w: 156, rot: -2, depth: .90 },
  { id: "3876299709078536371", t: "Dancing Figures", top: 40, left: 62, w: 158, rot: -2, depth: .40 },
  { id: "3906027830193984130", t: "Blossom Postage", top: 56, left: 74, w: 180, rot: 3,  depth: .60 },
  { id: "3082895902302535509", t: "Flaming Cupid",   top: 62, left: 52, w: 168, rot: 2,  depth: .32 },
  { id: "3865548442882507849", t: "Hanging Lantern", top: 68, left: 88, w: 138, rot: -4, depth: .80 },
];
let ztop = 10;
function buildFloatStage(items) {
  const stage = document.getElementById("floatStage");
  if (!stage) return;
  const byId = {}; items.forEach((it, i) => byId[it.id] = { no: i + 1, title: it.title });
  const objs = FLOATERS.map(f => {
    const meta = byId[f.id] || {};
    const el = document.createElement("div");
    el.className = "floatie";
    el.style.cssText = `top:${f.top}%;left:${f.left}%;width:${f.w}px`;
    el.dataset.depth = f.depth;
    el.innerHTML = `<div class="floatie__mid"><div class="floatie__in"><figure style="transform:rotate(${f.rot}deg)"><img src="./assets/img/${f.id}.jpg" loading="lazy" alt="" draggable="false" style="aspect-ratio:3/4"><div class="floatie__cap"><span>№ ${String(meta.no || "").padStart(3, "0")}</span><span>${f.t}</span></div></figure></div></div>`;
    stage.appendChild(el);
    return { el, depth: f.depth, mid: el.querySelector(".floatie__mid"), inner: el.querySelector(".floatie__in") };
  });

  if (!(animate && finePointer)) return;

  G.from(objs.map(o => o.el), { opacity: 0, scale: .9, duration: 1, stagger: .08, ease: "power2.out", delay: .3 });

  if (window.Draggable) objs.forEach(o => window.Draggable.create(o.inner, {
    type: "x,y", inertia: !!window.InertiaPlugin, bounds: "#floatStage",
    edgeResistance: .65, dragResistance: .05, throwResistance: 2200,
    onDragStart() { G.to(o.inner, { scale: 1.05, duration: .3, ease: "power2.out" }); o.el.style.zIndex = ++ztop; },
    onDragEnd() { G.to(o.inner, { scale: 1, duration: .5, ease: "power2.out" }); }
  }));

  const setters = objs.map(o => ({ depth: o.depth, x: G.quickTo(o.mid, "xPercent", { duration: .7, ease: "power3" }), y: G.quickTo(o.mid, "yPercent", { duration: .7, ease: "power3" }) }));
  window.addEventListener("pointermove", (e) => {
    const cx = (e.clientX / innerWidth - .5) * 2, cy = (e.clientY / innerHeight - .5) * 2;
    setters.forEach(s => { s.x(cx * s.depth * 5); s.y(cy * s.depth * 5); });
  }, { passive: true });

  objs.forEach(o => G.to(o.el, { yPercent: -o.depth * 20, ease: "none", scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub: true } }));
}

/* ── loupe cursor (event-delegated) ────────────────────── */
if (animate && finePointer) {
  document.documentElement.classList.add("cursor-on");
  const cur = document.getElementById("cursor"), label = document.getElementById("cursorLabel");
  const folioEl = document.getElementById("folio");
  cur.style.display = "flex";
  const xTo = G.quickTo(cur, "x", { duration: .4, ease: "power3" }), yTo = G.quickTo(cur, "y", { duration: .4, ease: "power3" });
  window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
  const plateNo = () => (folioEl?.textContent.match(/\d+/) || [""])[0];
  function tagFor(t) {
    if (t.closest(".floatie")) return "drag";
    if (t.closest("#vImgA, #vImgB")) return `view ${plateNo() ? "№" + plateNo() : ""}`.trim();
    if (t.closest(".work, .ex-thumb, .icell")) return "view";
    if (t.closest("a, button")) return "open →";
    return null;
  }
  let hot = false;
  document.addEventListener("pointerover", (e) => {
    const tag = tagFor(e.target);
    if (tag !== null) { cur.classList.add("is-hover"); label.textContent = tag; hot = true; }
    else if (hot) { cur.classList.remove("is-hover"); label.textContent = ""; hot = false; }
  });
}

/* ── init ──────────────────────────────────────────────── */
initBooking();
dataReady.then((items) => {
  buildFloatStage(items);
  initGallery({ items, onSelect: openLightbox });
});
