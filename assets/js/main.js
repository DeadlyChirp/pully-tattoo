/* Orchestration: links, nav, scroll reveal, lightbox, and module init. */
import { initGallery } from "./gallery.js";
import { initBooking } from "./booking.js";

const cfg = window.PULLY_CONFIG || {};

/* ── config-driven links ─────────────────────────────────── */
const setHref = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
setHref("dmLink", cfg.dm || cfg.instagram);
setHref("footIg", cfg.instagram);
setHref("footBeacons", cfg.beacons);
document.getElementById("year").textContent = new Date().getFullYear();

/* ── mobile nav ──────────────────────────────────────────── */
const burger = document.getElementById("navBurger");
const links = document.getElementById("navLinks");
burger?.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
links?.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); })
);

/* ── nav background on scroll ────────────────────────────── */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ── scroll reveal ───────────────────────────────────────── */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
}, { threshold: 0.14 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* ── lightbox ────────────────────────────────────────────── */
const lb = document.getElementById("lightbox");
function openLightbox(item) {
  document.getElementById("lbCat").textContent = item.category || "";
  document.getElementById("lbTitle").textContent = item.title || "";
  document.getElementById("lbPlace").textContent = item.placement ? `Placement — ${item.placement}` : "";
  const img = document.getElementById("lbImg");
  img.style.background = item.src
    ? `url("${item.src}") center/cover no-repeat`
    : "linear-gradient(135deg,#EFE8DC,#F7F3EC)";
  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
}
function closeLightbox() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); }
document.getElementById("lbClose").addEventListener("click", closeLightbox);
document.getElementById("lbBook").addEventListener("click", closeLightbox);
lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

/* ── init modules ────────────────────────────────────────── */
initBooking();

initGallery({ onSelect: openLightbox });
