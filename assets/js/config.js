/* Site configuration — edit these as the project moves to a backend.
   Plain global so it works without a build step. */
window.PULLY_CONFIG = {
  // Cloudflare Worker base URL. Leave "" to run fully static (form falls back to email/DM).
  // e.g. "https://pully-booking.<your-subdomain>.workers.dev"
  apiBase: "",

  // Her email — used for the mailto fallback when there's no backend yet.
  studioEmail: "",

  instagram: "https://www.instagram.com/pully.tattooist/",
  dm:        "https://ig.me/m/pully.tattooist",
  beacons:   "https://beacons.ai/linhlinhtattoo"
};
