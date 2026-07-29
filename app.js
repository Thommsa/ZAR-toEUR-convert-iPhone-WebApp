// ---- Config ----
const API_URL = "https://api.frankfurter.app/latest?from=ZAR&to=EUR";
const STORAGE_KEY = "zar_eur_rate_cache_v1";

// Baked-in fallback so the app is never blank on a brand-new install with
// no internet and no cache yet. Update this occasionally by hand — it's
// only ever a starting point, and gets replaced the moment a live fetch
// or a real cached rate is available.
const FALLBACK_RATE = 0.0525;
const FALLBACK_DATE = "2026-07-27T00:00:00Z";

// ---- State ----
let currentRate = null;    // always stored as ZAR->EUR rate
let rateTimestamp = null;  // ISO string, when the rate was fetched
let isFallback = false;    // true while showing the baked-in rate, not a real fetch/cache

// ---- Elements ----
const zarInput    = document.getElementById("zarInput");
const eurInput    = document.getElementById("eurInput");
const clearBtn    = document.getElementById("clearBtn");
const statusDot   = document.getElementById("statusDot");
const statusText  = document.getElementById("statusText");
const rateValue   = document.getElementById("rateValue");
const metaText    = document.getElementById("metaText");

// ---- Helpers ----
function saveCache(rate, timestamp) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rate, timestamp }));
  } catch (e) { /* storage might be unavailable in rare private-mode cases */ }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `today at ${timeStr}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} at ${timeStr}`;
}

function setStatus(mode, text) {
  // mode: 'live' | 'cached' | 'offline' | 'none'
  let cls = "";
  if (mode === "live") cls = " live";
  else if (mode === "cached") cls = " cached";
  else if (mode === "offline") cls = " offline";
  statusDot.className = "status-dot" + cls;
  statusText.textContent = text;
}

// Converts from whichever field the person is actively typing in,
// so either box can be the "source" at any time.
function convertFromZar() {
  if (currentRate == null) return;
  const raw = parseFloat(zarInput.value);
  eurInput.value = isNaN(raw) ? "" : (raw * currentRate).toFixed(2);
}

function convertFromEur() {
  if (currentRate == null) return;
  const raw = parseFloat(eurInput.value);
  zarInput.value = isNaN(raw) ? "" : (raw / currentRate).toFixed(2);
}

// Re-run whichever conversion currently has a value, e.g. after a
// fresh rate arrives, so the visible numbers stay in sync with it.
function reconvert() {
  if (document.activeElement === eurInput) {
    convertFromEur();
  } else if (zarInput.value !== "") {
    convertFromZar();
  } else if (eurInput.value !== "") {
    convertFromEur();
  }
}

function renderRateInfo() {
  if (currentRate == null) {
    rateValue.textContent = "—";
    metaText.textContent = "Waiting for a rate…";
    return;
  }
  rateValue.textContent = `1 ZAR = ${currentRate.toFixed(5)} EUR`;
  if (isFallback) {
    metaText.textContent = `Built-in rate · updates when online`;
  } else {
    metaText.textContent = `Last updated ${formatTimestamp(rateTimestamp)}`;
  }
}

async function fetchRate() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad response");
    const data = await res.json();
    const rate = data.rates && data.rates.EUR;
    if (typeof rate !== "number") throw new Error("Malformed response");

    currentRate = rate;
    rateTimestamp = new Date().toISOString();
    isFallback = false;
    saveCache(currentRate, rateTimestamp);

    setStatus("live", "Live");
    renderRateInfo();
    reconvert();
  } catch (err) {
    // Fall back silently to whatever is cached; only reach for the
    // baked-in fallback rate if we have nothing real to show at all.
    if (currentRate == null) {
      currentRate = FALLBACK_RATE;
      rateTimestamp = FALLBACK_DATE;
      isFallback = true;
      setStatus("offline", "Offline");
      renderRateInfo();
      reconvert();
    } else {
      setStatus("cached", isFallback ? "Offline" : "Cached");
    }
  }
}

// ---- Init ----
function init() {
  const cached = loadCache();
  if (cached && typeof cached.rate === "number") {
    currentRate = cached.rate;
    rateTimestamp = cached.timestamp;
    isFallback = false;
    setStatus("cached", "Cached");
    renderRateInfo();
  }
  // If there's no cache yet, leave the initial "Checking…" state as-is;
  // the background fetch below will either go live or drop to the
  // baked-in fallback rate, both of which update the UI themselves.

  // Try to get a fresh rate in the background.
  fetchRate();

  zarInput.addEventListener("input", convertFromZar);
  eurInput.addEventListener("input", convertFromEur);
  clearBtn.addEventListener("click", () => {
    zarInput.value = "";
    eurInput.value = "";
    zarInput.focus();
  });

  window.addEventListener("online", () => fetchRate());
  window.addEventListener("offline", () => {
    if (currentRate != null) {
      setStatus("offline", "Offline");
    }
  });
}

init();

// ---- Service worker (offline app shell) ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // If registration fails (e.g. running from file://), the app still
      // works online; it just won't be installable/offline-cached.
    });
  });
}
