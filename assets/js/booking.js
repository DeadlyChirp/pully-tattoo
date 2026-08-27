/* Booking: availability calendar + request form.
   Works static (email/DM fallback) or against a Cloudflare Worker when cfg.apiBase is set. */

const cfg = window.PULLY_CONFIG || {};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
// Local-calendar ISO (NOT toISOString, which is UTC and drifts a day in +7 timezones like Hà Nội)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = iso(new Date());

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
  form.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("invalid"));
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

function startMonth() {
  const from = new Date((avail.bookingFrom || todayISO) + "T00:00:00");
  const now = new Date(todayISO + "T00:00:00");
  const base = from > now ? from : now;
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function shiftMonth(delta) {
  view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
  renderCalendar();
}

// is a given Date bookable?
function dayState(d) {
  const dISO = iso(d);
  if (avail.bookingFrom && dISO < avail.bookingFrom) return "closed";
  if (avail.bookingTo && dISO > avail.bookingTo) return "closed";
  // weekday: JS Sunday=0..Saturday=6 → map to Mon=1..Sun=7 to match config (1=Mon)
  const wd = d.getDay() === 0 ? 7 : d.getDay();
  if (avail.closedWeekdays.includes(wd)) return "closed";
  if (avail.blocked.includes(dISO)) return "closed";
  return "open";
}

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  document.getElementById("calMonth").textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;

  // disable prev when at/under the start month
  const startM = startMonth();
  document.getElementById("calPrev").disabled =
    view.getFullYear() === startM.getFullYear() && view.getMonth() === startM.getMonth();

  grid.innerHTML = "";
  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first
  const days = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDow; i++) {
    const e = document.createElement("div");
    e.className = "cal__cell empty";
    grid.appendChild(e);
  }
  for (let day = 1; day <= days; day++) {
    const d = new Date(year, month, day);
    const dISO = iso(d);
    const state = dayState(d);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal__cell " + state;
    cell.textContent = day;
    if (dISO === todayISO) cell.classList.add("today");
    if (dISO === selectedISO) cell.classList.add("selected");
    if (state === "open") {
      cell.addEventListener("click", () => selectDay(dISO, d));
    } else {
      cell.disabled = true;
    }
    grid.appendChild(cell);
  }
}

function selectDay(dISO, d) {
  selectedISO = dISO;
  const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const f = document.getElementById("f-date");
  f.value = label;
  f.dataset.iso = dISO;
  renderCalendar();
}

const markField = (id, on) => document.getElementById(id)?.closest(".field")?.classList.toggle("invalid", on);
const clearInvalid = (form) => form.querySelectorAll(".field.invalid").forEach(f => f.classList.remove("invalid"));

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const status = document.getElementById("formStatus");
  const btn = document.getElementById("bookSubmit");
  status.className = "form__status"; status.textContent = "";
  clearInvalid(form);

  // honeypot — bots tick it; pretend success, send nothing
  if (form.botcheck && form.botcheck.checked) return done(status, "Sent! ♡");

  const data = Object.fromEntries(new FormData(form).entries());
  delete data.botcheck;
  data.dateISO = document.getElementById("f-date").dataset.iso || "";

  if (!data.name) { markField("f-name", true); return fail(status, "Please add your name."); }
  if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { markField("f-email", true); return fail(status, "That email looks off — mind checking it?"); }
  if (!data.dateISO) { markField("f-date", true); return fail(status, "Pick a day on the calendar first."); }
  if (!document.getElementById("f-consent").checked) return fail(status, "Please tick the consent box.");

  btn.disabled = true; btn.textContent = "Sending…";
  try {
    if (cfg.web3formsKey) {
      // No backend needed — Web3Forms emails the studio directly (works on static hosting).
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: cfg.web3formsKey,
          subject: `New tattoo booking — ${data.name} (${data.date || data.dateISO})`,
          from_name: "PULLY — booking",
          replyto: data.email,
          botcheck: false,
          Name: data.name, Email: data.email, "Instagram / phone": data.contact || "-",
          "Preferred date": data.date || data.dateISO, Placement: data.placement || "-",
          Size: data.size || "-", Idea: data.idea || "-"
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.message || "Request failed");
      done(status, "Sent! Pully will reply by email to confirm. ♡");
      form.reset(); selectedISO = null; renderCalendar();
    } else if (cfg.apiBase) {
      const r = await fetch(cfg.apiBase.replace(/\/$/, "") + "/api/book", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
      });
      if (!r.ok) throw new Error("Request failed");
      done(status, "Sent! Pully will reply by email to confirm. ♡");
      form.reset(); selectedISO = null; renderCalendar();
    } else {
      // Nothing configured yet → open the visitor's email client, pre-filled.
      mailtoFallback(data);
      done(status, "Opening your email app — just hit send to finish. ♡");
    }
  } catch (err) {
    fail(status, "Couldn't send just now — please DM on Instagram and I'll sort it. ♡");
  } finally {
    btn.disabled = false; btn.textContent = "Send request";
  }
}

function mailtoFallback(d) {
  const to = cfg.studioEmail || "";
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
  if (to) {
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } else {
    // truly no destination configured → send them to DM
    window.open(cfg.dm || cfg.instagram, "_blank", "noopener");
  }
}

const fail = (el, msg) => { el.textContent = msg; el.classList.add("err"); };
const done = (el, msg) => { el.textContent = msg; el.classList.add("ok"); };
