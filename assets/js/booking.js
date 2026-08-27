/* Booking — availability calendar + request form.
   Sends real email via Web3Forms (cfg.web3formsKey) or a Worker (cfg.apiBase);
   otherwise falls back to the visitor's mail app / Instagram DM. */

const cfg = window.PULLY_CONFIG || {};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Local-calendar ISO (NOT toISOString, which is UTC and drifts a day in +7 timezones like Hà Nội)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = iso(new Date());
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const prettyDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

let avail = { bookingFrom: todayISO, bookingTo: null, closedWeekdays: [1], blocked: [] };
let view;            // Date pointing at the first of the displayed month
let selectedISO = null;

export async function initBooking() {
  const grid = document.getElementById("calGrid");
  if (!grid) return;

  avail = await loadAvailability();
  view = startMonth();
  renderCalendar();

  document.getElementById("calPrev").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("calNext").addEventListener("click", () => shiftMonth(1));

  const form = document.getElementById("bookingForm");
  form.addEventListener("submit", onSubmit);
  // clear a field's error as soon as the visitor fixes it
  form.addEventListener("input", (e) => setField(e.target.id, false));
  // validate name/email as the visitor leaves them
  const nameEl = document.getElementById("f-name"), emailEl = document.getElementById("f-email");
  nameEl?.addEventListener("blur", () => setField("f-name", !nameEl.value.trim()));
  emailEl?.addEventListener("blur", () => setField("f-email", !!emailEl.value.trim() && !EMAIL_RE.test(emailEl.value.trim())));
  // tapping the (readonly) date field jumps to the calendar
  document.getElementById("f-date")?.addEventListener("focus", () => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "center" }));

  if (!cfg.web3formsKey && !cfg.apiBase) console.info("[PULLY] booking: no web3formsKey/apiBase set — using mailto/DM fallback. Add a free key from web3forms.com to send email.");
}

async function loadAvailability() {
  const tryUrls = [];
  if (cfg.apiBase) tryUrls.push(cfg.apiBase.replace(/\/$/, "") + "/api/availability");
  tryUrls.push("./data/availability.json");
  for (const url of tryUrls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        return {
          bookingFrom: j.bookingFrom || todayISO,
          bookingTo: j.bookingTo || null,
          closedWeekdays: j.closedWeekdays || [],
          blocked: j.blocked || []
        };
      }
    } catch { /* try next */ }
  }
  return avail;
}

const dateAt = (isoStr) => new Date(isoStr + "T00:00:00");
function startMonth() {
  const from = dateAt(avail.bookingFrom || todayISO), now = dateAt(todayISO);
  const base = from > now ? from : now;
  return new Date(base.getFullYear(), base.getMonth(), 1);
}
function endMonth() {
  if (!avail.bookingTo) return null;
  const e = dateAt(avail.bookingTo);
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function shiftMonth(delta) { view = new Date(view.getFullYear(), view.getMonth() + delta, 1); renderCalendar(); }

// is a given Date bookable?
function dayState(d) {
  const dISO = iso(d);
  if (dISO < todayISO) return "closed";                                   // never book the past
  if (avail.bookingFrom && dISO < avail.bookingFrom) return "closed";
  if (avail.bookingTo && dISO > avail.bookingTo) return "closed";
  const wd = d.getDay() === 0 ? 7 : d.getDay();                           // Mon=1..Sun=7
  if (avail.closedWeekdays.includes(wd)) return "closed";
  if (avail.blocked.includes(dISO)) return "closed";
  return "open";
}

// first bookable day in the whole window (for the "next open" hint)
function firstOpenDay() {
  const start = new Date(Math.max(+dateAt(todayISO), +dateAt(avail.bookingFrom || todayISO)));
  const end = avail.bookingTo ? dateAt(avail.bookingTo) : new Date(start.getFullYear(), start.getMonth() + 6, 0);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) if (dayState(d) === "open") return new Date(d);
  return null;
}

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  document.getElementById("calMonth").textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;

  const startM = startMonth(), endM = endMonth();
  document.getElementById("calPrev").disabled = view.getFullYear() === startM.getFullYear() && view.getMonth() === startM.getMonth();
  document.getElementById("calNext").disabled = !!endM && (view.getFullYear() > endM.getFullYear() || (view.getFullYear() === endM.getFullYear() && view.getMonth() >= endM.getMonth()));

  grid.innerHTML = "";
  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;           // Mon-first
  const days = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDow; i++) { const e = document.createElement("div"); e.className = "cal__cell empty"; grid.appendChild(e); }
  for (let day = 1; day <= days; day++) {
    const d = new Date(year, month, day), dISO = iso(d), state = dayState(d);
    const cell = document.createElement("button");
    cell.type = "button"; cell.className = "cal__cell " + state; cell.textContent = day;
    if (dISO === todayISO) cell.classList.add("today");
    if (dISO === selectedISO) { cell.classList.add("selected"); cell.setAttribute("aria-pressed", "true"); }
    if (state === "open") { cell.setAttribute("aria-label", prettyDate(d) + " — open"); cell.addEventListener("click", () => selectDay(dISO, d)); }
    else { cell.disabled = true; cell.setAttribute("aria-label", prettyDate(d) + " — unavailable"); }
    grid.appendChild(cell);
  }
  renderHint();
}

function renderHint() {
  const hint = document.getElementById("calHint");
  if (!hint) return;
  if (selectedISO) { hint.innerHTML = `<b>selected</b> — ${esc(document.getElementById("f-date").value)}`; return; }
  const fo = firstOpenDay();
  if (!fo) { hint.innerHTML = `fully booked for now — <a href="${cfg.dm || cfg.instagram || "#"}" target="_blank" rel="noopener">message on instagram</a> to join the list.`; return; }
  hint.innerHTML = `next open — <button type="button" id="nextOpenBtn">${prettyDate(fo).replace(/,?\s\d{4}$/, "")}</button>`;
  hint.querySelector("#nextOpenBtn")?.addEventListener("click", () => { view = new Date(fo.getFullYear(), fo.getMonth(), 1); selectDay(iso(fo), fo); });
}

function selectDay(dISO, d) {
  selectedISO = dISO;
  const f = document.getElementById("f-date");
  f.value = prettyDate(d); f.dataset.iso = dISO;
  setField("f-date", false);
  renderCalendar();
}

const setField = (id, on) => { const el = document.getElementById(id); if (!el) return; el.closest(".field")?.classList.toggle("invalid", on); el.setAttribute("aria-invalid", on ? "true" : "false"); };
const fail = (el, msg) => { el.textContent = msg; el.className = "form__status err"; };
const done = (el, msg) => { el.textContent = msg; el.className = "form__status ok"; };

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const status = document.getElementById("formStatus");
  const btn = document.getElementById("bookSubmit");
  status.textContent = ""; status.className = "form__status";

  // honeypot — bots tick the hidden box; pretend success, send nothing
  if (form.botcheck && form.botcheck.checked) return done(status, "Sent! ♡");

  const data = Object.fromEntries(new FormData(form).entries());
  delete data.botcheck;
  ["name", "email", "contact", "placement", "size", "idea"].forEach(k => data[k] = (data[k] || "").trim());
  data.dateISO = document.getElementById("f-date").dataset.iso || "";

  const bad = (id, msg) => { setField(id, true); fail(status, msg); document.getElementById(id)?.focus(); return false; };
  if (!data.name) return bad("f-name", "Please add your name.");
  if (!EMAIL_RE.test(data.email)) return bad("f-email", "That email looks off — mind checking it?");
  if (!data.dateISO) return bad("f-date", "Pick a day on the calendar first.");
  if (!document.getElementById("f-consent").checked) { fail(status, "Please tick the consent box."); document.getElementById("f-consent")?.focus(); return; }

  btn.disabled = true; btn.textContent = "Sending…";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    if (cfg.web3formsKey) {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({
          access_key: cfg.web3formsKey,
          subject: `New tattoo booking — ${data.name} · ${data.date || data.dateISO}`,
          from_name: "PULLY — booking",
          replyto: data.email,
          botcheck: false,
          Name: data.name, Email: data.email, "Instagram / phone": data.contact || "-",
          "Preferred date": data.date || data.dateISO, Placement: data.placement || "-",
          Size: data.size || "-", Idea: data.idea || "-", Sent_from: location.href
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.message || "rejected");
      showConfirmation(form, data);
    } else if (cfg.apiBase) {
      const r = await fetch(cfg.apiBase.replace(/\/$/, "") + "/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctrl.signal });
      if (!r.ok) throw new Error("rejected");
      showConfirmation(form, data);
    } else {
      mailtoFallback(data);
      done(status, "Opening your email app — just hit send to finish. ♡");
    }
  } catch (err) {
    fail(status, err.name === "AbortError"
      ? "That took too long — check your connection and try again, or DM on Instagram."
      : "Couldn't send just now — please try again, or DM on Instagram and I'll sort it. ♡");
  } finally {
    clearTimeout(timer);
    btn.disabled = false; btn.textContent = "Send request";
  }
}

function showConfirmation(form, data) {
  let card = form.querySelector(".form__done");
  if (!card) { card = document.createElement("div"); card.className = "form__done"; card.setAttribute("tabindex", "-1"); form.appendChild(card); }
  card.innerHTML =
    `<p class="form__done-k">request sent ♡</p>` +
    `<h3 class="form__done-t">thank you — you're on pully's list.</h3>` +
    `<p class="form__done-p">she'll reply to <b>${esc(data.email)}</b> within a day to confirm <b>${esc(data.date || data.dateISO)}</b>. no deposit until it's confirmed.</p>` +
    `<div class="form__done-cta"><button type="button" class="link" id="againBtn">make another request</button>` +
    `<a class="link" href="${cfg.dm || cfg.instagram || "#"}" target="_blank" rel="noopener">message on instagram</a></div>`;
  form.classList.add("is-sent");
  card.querySelector("#againBtn")?.addEventListener("click", () => {
    form.classList.remove("is-sent"); form.reset(); card.remove();
    selectedISO = null; renderCalendar();
    document.getElementById("formStatus").textContent = "";
    form.querySelectorAll(".field.invalid").forEach(f => f.classList.remove("invalid"));
    document.getElementById("f-name")?.focus();
  });
  card.focus();
}

function mailtoFallback(d) {
  const subject = `Tattoo booking — ${d.name} (${d.date || d.dateISO})`;
  const body =
`Name: ${d.name}
Email: ${d.email}
Instagram/phone: ${d.contact || "-"}
Preferred date: ${d.date || d.dateISO}
Placement: ${d.placement || "-"}
Size: ${d.size || "-"}

Idea:
${d.idea || "-"}`;
  if (cfg.studioEmail) window.location.href = `mailto:${cfg.studioEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  else window.open(cfg.dm || cfg.instagram, "_blank", "noopener");
}
