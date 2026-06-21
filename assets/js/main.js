/* Orchestration + motion layer (Lenis + GSAP). Degrades gracefully if libs/reduced-motion. */
import { initGallery } from "./gallery.js";
import { initBooking } from "./booking.js";

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
burger?.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
links?.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); }));

const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ── lightbox ──────────────────────────────────────────── */
let lenis = null;
const lb = document.getElementById("lightbox");
function openLightbox(item) {
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

/* ── motion ────────────────────────────────────────────── */
const loader = document.getElementById("loader");

if (animate) {
  G.registerPlugin(window.ScrollTrigger);
  document.documentElement.classList.add("anim");

  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  window.lenis = lenis;
  lenis.on("scroll", window.ScrollTrigger.update);
  G.ticker.add((t) => lenis.raf(t * 1000));
  G.ticker.lagSmoothing(0);

  // smooth anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.2 }); }
    });
  });

  // hide hero until the curtain lifts
  G.set(".hero__inner > *", { opacity: 0 });

  // scroll reveals (keep existing .reveal class)
  G.set(".reveal", { y: 40, opacity: 0 });
  window.ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    onEnter: (b) => G.to(b, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: "expo.out" })
  });

  // hero wordmark parallax
  G.to(".hero__title", { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // typeset reveals once fonts are ready (avoids FOUT-misplaced triggers)
  document.fonts.ready.then(() => {
    if (window.SplitText) {
      document.querySelectorAll(".g-top h2, .booking__head h2, .about__lead").forEach(el => {
        const s = new window.SplitText(el, { type: "lines", mask: "lines" });
        G.from(s.lines, { yPercent: 110, stagger: 0.09, duration: 1, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%" } });
      });
    }
    window.ScrollTrigger.refresh();
  });

  curtain();
} else {
  if (loader) loader.style.display = "none";
}

function runHero() {
  G.set(".hero__title", { opacity: 1 });   // parent visible; chars carry the reveal
  const tl = G.timeline();
  if (window.SplitText) {
    const s = new window.SplitText(".hero__title", { type: "chars", mask: "chars" });
    tl.from(s.chars, { yPercent: 120, opacity: 0, stagger: 0.045, duration: 1.1, ease: "expo.out" }, 0);
  } else {
    tl.to(".hero__title", { opacity: 1, duration: 1, ease: "expo.out" }, 0);
  }
  tl.to(".hero__eye", { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0.15)
    .to(".hero__tag", { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0.45)
    .to(".hero__cta", { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0.55);
}

function curtain() {
  G.set([".hero__eye", ".hero__tag", ".hero__cta"], { y: 14 });
  if (sessionStorage.getItem("pully_seen")) { if (loader) loader.style.display = "none"; runHero(); return; }
  sessionStorage.setItem("pully_seen", "1");
  const lc = document.getElementById("loaderCount"), o = { n: 0 };
  G.to(o, { n: 305, duration: 1.1, ease: "power2.out", onUpdate: () => { lc.textContent = String(Math.round(o.n)).padStart(3, "0"); } });
  const done = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1600))]);
  done.then(() => {
    G.timeline()
      .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut", delay: 0.15, onComplete: () => { loader.style.display = "none"; } })
      .add(runHero, "-=0.45");
  });
}

/* ── custom cursor ─────────────────────────────────────── */
if (animate && finePointer) {
  document.documentElement.classList.add("cursor-on");
  const cur = document.getElementById("cursor");
  const label = document.getElementById("cursorLabel");
  cur.style.display = "flex";
  const xTo = G.quickTo(cur, "x", { duration: 0.5, ease: "expo.out" });
  const yTo = G.quickTo(cur, "y", { duration: 0.5, ease: "expo.out" });
  window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
  const tag = (el) => el.matches(".ex-frame") ? "drag" : el.matches("#vImgA,#vImgB") ? "view" : "";
  document.querySelectorAll("a,button,.ex-thumb,.ex-frame,#vImgA,#vImgB").forEach(el => {
    el.addEventListener("pointerenter", () => { cur.classList.add("is-hover"); label.textContent = tag(el); });
    el.addEventListener("pointerleave", () => { cur.classList.remove("is-hover"); label.textContent = ""; });
  });
}

/* ── init modules ──────────────────────────────────────── */
initBooking();
initGallery({ onSelect: openLightbox });
