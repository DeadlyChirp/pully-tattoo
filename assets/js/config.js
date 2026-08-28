/* Site configuration — edit these as the project moves to a backend.
   Plain global so it works without a build step. */
window.PULLY_CONFIG = {
  // ── BOOKING (pick one; checked in this order) ──
  // 1) Web3Forms: real booking email with NO backend. Get a free key at https://web3forms.com
  //    (enter Pully's email there → it emails each request straight to her). Paste the key here:
  web3formsKey: "",

  // 2) Cloudflare Worker base URL (advanced). Leave "" unless you build the worker.
  apiBase: "",

  // 3) Fallback only: her email — used by the mailto fallback if neither of the above is set.
  studioEmail: "",

  instagram: "https://www.instagram.com/pully.tattooist/",
  dm:        "https://www.instagram.com/pully.tattooist/",
  beacons:   "https://beacons.ai/linhlinhtattoo"
};
