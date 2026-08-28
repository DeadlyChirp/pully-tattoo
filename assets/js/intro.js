/* THE RIFFLE — Marvel-style intro.
   A canvas riffles ~18 of Pully's own featured plates rushing the camera
   (power4.out, depth-scale + blur→0), brakes on a hero plate, then the plates
   resolve INTO a photo-filled PULLY wordmark — one warm flash, a clay rule that
   draws under it, and GALERIE tracking in — before the curtain lifts to the hero.
   One paused GSAP timeline. Plays once per session (caller gates on it), skippable,
   with a calm no-motion fallback. No new deps: GSAP core + SplitText + canvas. */

const G = window.gsap;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clipOK = (window.CSS && (CSS.supports("-webkit-background-clip", "text") || CSS.supports("background-clip", "text")));

const thumb = (src) => src.replace("/assets/img/", "/assets/img/thumb/");

/* same varied-dozen picker as the galerie, a touch wider for the riffle */
function curate(pool, max) {
  const sorted = [...pool].sort((a, b) => (b.quality || 0) - (a.quality || 0));
  const per = {}, out = [];
  for (const it of sorted) { const c = it.category || "—"; if ((per[c] || 0) >= 3) continue; per[c] = (per[c] || 0) + 1; out.push(it); if (out.length >= max) break; }
  for (const it of sorted) { if (out.length >= max) break; if (!out.includes(it)) out.push(it); }
  return out;
}

function load(url) {
  return new Promise((res) => {
    const im = new Image(); im.decoding = "async";
    const done = () => res(im);
    im.onload = done; im.onerror = () => res(null);
    im.src = url;
    if (im.decode) im.decode().then(done).catch(() => { /* onload/onerror still fires */ });
  });
}

export async function playIntro({ data, onDone } = {}) {
  const root = document.getElementById("loader");
  const cv = document.getElementById("introCanvas");
  const scrim = document.getElementById("introScrim");
  const lockup = document.getElementById("introLockup");
  const word = document.getElementById("introWord");
  const rule = document.getElementById("introRule");
  const tag = document.getElementById("introTag");
  const flash = document.getElementById("introFlash");
  const skipBtn = document.getElementById("introSkip");
  const finish = () => { if (root) root.style.display = "none"; window.lenis?.start(); onDone?.(); };
  if (!root || !cv || !G) { finish(); return; }

  // choose plates: best hero lands LAST; the rest riffle before it
  const items = (await Promise.resolve(data)) || [];
  const featured = items.filter(x => x.featured);
  const set = curate(featured.length ? featured : items, 18);
  if (!set.length) { finish(); return; }
  const hero = set[0];
  const order = set.slice(1).concat([hero]);          // ~18 frames, hero last

  // photo-fill the wordmark with the hero plate (bright letters on the dim ground)
  // wordmark stays solid cream (crisp, legible); the plates fade to near-black behind it

  window.lenis?.stop();

  const ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W, H;
  const size = () => { W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr); };
  size(); addEventListener("resize", size, { passive: true });

  // preload thumbs (hero also at full-res for the sharp lockup), race a timeout so a slow net can't hang the gift
  const imgs = new Array(order.length).fill(null);
  const jobs = order.map((it, i) => load(thumb(it.src)).then(im => { imgs[i] = im; }));
  jobs.push(load(hero.src));                            // warm the full-res hero for background-clip
  await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 1400))]);

  const nearest = (i) => { for (let k = i; k >= 0; k--) if (imgs[k]) return imgs[k]; for (let k = i + 1; k < imgs.length; k++) if (imgs[k]) return imgs[k]; return null; };
  const cover = (img, scale) => {
    const ir = img.width / img.height, cr = W / H;
    let w = (ir > cr) ? H * ir : W, h = (ir > cr) ? H : W / ir;
    w *= scale; h *= scale;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  };
  const N = order.length;
  const pd = { f: 0 };
  let last = -1;
  const draw = () => {
    const i = Math.round(pd.f);
    const img = imgs[i] || nearest(i);
    if (!img) return;
    const prog = N > 1 ? pd.f / (N - 1) : 1;
    cv.style.filter = `blur(${(5 * (1 - prog)).toFixed(2)}px)`;
    ctx.fillStyle = "#0f0d0a"; ctx.fillRect(0, 0, W, H);
    cover(img, 1.12 - 0.12 * prog);
    last = i;
  };

  const split = window.SplitText ? new window.SplitText(word, { type: "chars", mask: "chars" }) : null;
  const chars = split ? split.chars : [word];

  // ── reduced-motion / calm branch: hero → wordmark cross-fade, no riffle/flash ──
  if (reduced) {
    pd.f = N - 1; draw(); cv.style.filter = "blur(0px)";
    G.set(scrim, { opacity: .9 }); G.set(rule, { scaleX: 1 }); G.set(tag, { opacity: 1 });
    G.set(lockup, { opacity: 1 });
    G.fromTo(word, { opacity: 0 }, { opacity: 1, duration: .6, ease: "power2.out",
      onComplete: () => G.to(root, { yPercent: -100, duration: .9, ease: "expo.inOut", delay: .8, onComplete: finish }) });
    return;
  }

  // ── the timeline ──
  const tl = G.timeline({ paused: true });
  tl.to(pd, { f: N - 1, duration: 1.3, ease: "power4.out", snap: { f: 1 }, onUpdate: () => { if (Math.round(pd.f) !== last) draw(); } }, 0)
    .set(cv, { filter: "blur(0px)" })
    .addLabel("settle")
    .set(lockup, { opacity: 1 }, "settle")
    .to(scrim, { opacity: .9, duration: .45, ease: "power2.out" }, "settle")
    .from(chars, { yPercent: 115, opacity: 0, stagger: .045, duration: .7, ease: "expo.out" }, "settle+=0.05")
    .addLabel("impact", "settle+=0.16")
    .to(flash, { opacity: .26, duration: .09, ease: "power2.out" }, "impact")
    .to(flash, { opacity: 0, duration: .14, ease: "power2.in" }, "impact+=0.09")
    .fromTo(word, { scale: 1.05 }, { scale: 1, duration: .5, ease: "back.out(1.5)" }, "impact")
    .to(rule, { scaleX: 1, duration: .5, ease: "power4.out" }, "impact+=0.1")
    .fromTo(tag, { opacity: 0, letterSpacing: "0.12em" }, { opacity: 1, letterSpacing: "0.42em", duration: .45, ease: "power2.out" }, "impact+=0.2")
    .to({}, { duration: .35 })
    .to(root, { yPercent: -100, duration: .9, ease: "expo.inOut", onComplete: finish });

  // skip: jump to the end (fires the same finish); Esc too
  const skip = () => { tl.progress(1); };
  skipBtn?.addEventListener("click", skip);
  addEventListener("keydown", (e) => { if (e.key === "Escape") skip(); }, { once: true });

  // decode settled? play. (Fonts may still be swapping; the wordmark reveal masks it.)
  Promise.race([document.fonts?.ready || Promise.resolve(), new Promise(r => setTimeout(r, 600))]).then(() => tl.play());
}
