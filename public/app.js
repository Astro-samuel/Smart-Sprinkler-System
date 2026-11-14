// Smart Sprinkler prototype frontend. All state lives in memory; nothing is persisted.

const $ = (id) => document.getElementById(id);
const DEMO_LOCATION = { name: "Vancouver, BC (demo)", latitude: 49.2606, longitude: -123.246 };

const state = {
  location: null,
  data: null,
};

// ---------------------------------------------------------------------------
// Weather code → label/icon (WMO codes used by Open-Meteo)
// ---------------------------------------------------------------------------
const WMO = {
  0: ["Clear sky", "sun", "moon"], 1: ["Mainly clear", "sun", "moon"], 2: ["Partly cloudy", "partly", "cloud"],
  3: ["Overcast", "cloud"], 45: ["Fog", "fog"], 48: ["Freezing fog", "fog"],
  51: ["Light drizzle", "rain"], 53: ["Drizzle", "rain"], 55: ["Heavy drizzle", "rain"],
  56: ["Freezing drizzle", "rain"], 57: ["Freezing drizzle", "rain"],
  61: ["Light rain", "rain"], 63: ["Rain", "rain"], 65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "rain"], 67: ["Freezing rain", "rain"],
  71: ["Light snow", "snow"], 73: ["Snow", "snow"], 75: ["Heavy snow", "snow"], 77: ["Snow grains", "snow"],
  80: ["Rain showers", "rain"], 81: ["Rain showers", "rain"], 82: ["Violent showers", "storm"],
  85: ["Snow showers", "snow"], 86: ["Snow showers", "snow"],
  95: ["Thunderstorm", "storm"], 96: ["Thunderstorm, hail", "storm"], 99: ["Thunderstorm, hail", "storm"],
};
const wmo = (code, isDay = true) => {
  const [label, day, night] = WMO[code] ?? ["Unknown", "cloud"];
  return { label, icon: !isDay && night ? night : day };
};

// Drawn weather glyphs (24px grid, stroke inherits from CSS). Static trusted markup.
const CLOUD = "M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 6.5 4.3 4.3 0 0 0 7 15z";
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  cloud: '<path d="M7 19h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 10.5 4.3 4.3 0 0 0 7 19z"/>',
  partly: '<circle cx="8" cy="8" r="2.8"/><path d="M8 2.5v1M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .4-6.97A4.8 4.8 0 0 0 9 12.3 3.9 3.9 0 0 0 9 20z"/>',
  rain: `<path d="${CLOUD}"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>`,
  snow: `<path d="${CLOUD}"/><path d="M8 19h.01M12 20h.01M16 19h.01" stroke-width="2.4"/>`,
  storm: `<path d="${CLOUD}"/><path d="M12.5 14.5 10.5 18h3l-2 3.5"/>`,
  fog: '<path d="M4 8h16M6 12h12M4 16h16"/>',
};
const icon = (name, cls = "ico") => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", cls);
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONS[name] ?? ICONS.cloud;
  return s;
};

const ACTION_LABEL = { WATER: "Water", REDUCE: "Reduce", DELAY: "Delay", SKIP: "Skip", OFF: "Off" };

// Care-tag water level: how many of three drops are filled for each action.
const DROP_LEVEL = { WATER: 3, REDUCE: 2, DELAY: 1, SKIP: 0, OFF: 0 };
const DROP_PATH = "M12 2.5c3.4 3.9 5.5 6.8 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.600 2.100-5.500 5.500-9.400z";
function drops(action, cls = "drops") {
  const level = DROP_LEVEL[action] ?? 0;
  const wrap = el("span", { class: cls, "aria-hidden": "true" });
  for (let i = 0; i < 3; i++) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", i < level ? "drop on" : "drop");
    s.innerHTML = `<path d="${DROP_PATH}"/>`;
    wrap.append(s);
  }
  return wrap;
}
const fmt = (n, d = 0) => (n == null ? "–" : Number(n).toFixed(d));
const dayName = (iso, opts = { weekday: "short" }) =>
  new Date(iso + "T12:00:00").toLocaleDateString(undefined, opts);

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function api(path, params) {
  const url = `${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------
function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        name: "My location",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

async function useGps() {
  showStatus("Finding your location…");
  try {
    const loc = await getBrowserLocation();
    await setLocation(loc);
  } catch (err) {
    const msg = err.code === 1 ? "Location permission was denied." : "Couldn't get your location.";
    showStatus(`${msg} Search for your city instead.`, { error: true, action: { label: "Choose location", run: openDialog } });
    openDialog();
  }
}

async function setLocation(loc) {
  state.location = loc;
  $("locationName").textContent = loc.name;
  await loadDashboard();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function showStatus(text, { error = false, action = null } = {}) {
  $("status").hidden = false;
  $("dashboard").hidden = true; // never show the previous location's data under a new status
  $("status").classList.toggle("error", error);
  $("status").querySelector(".spinner").hidden = error;
  $("statusText").textContent = text;
  const btn = $("statusAction");
  btn.hidden = !action;
  btn.onclick = action ? action.run : null;
  if (action) btn.textContent = action.label;
}

async function loadDashboard() {
  const { latitude, longitude } = state.location;
  showStatus("Checking the weather…");
  try {
    state.data = await api("/api/dashboard", { lat: latitude.toFixed(4), lon: longitude.toFixed(4) });
  } catch (err) {
    showStatus(`Couldn't load weather: ${err.message}.`, { error: true, action: { label: "Try again", run: loadDashboard } });
    return;
  }
  $("status").hidden = true;
  $("dashboard").hidden = false;
  render(state.data);
}

function render(d) {
  renderRecommendation(d.recommendation);
  renderNow(d.weather.current, d.weather.daily[0]);
  renderHourly(d.weather.hourly);
  renderSchedule(d.schedule);
  renderForecast(d.weather.daily);
  renderSavings(d.savings);
  zones.init(d.zones, d.recommendation);
}

function renderRecommendation(rec) {
  const card = $("recCard");
  card.className = `hero a-${rec.action}`;
  $("recAction").textContent = ACTION_LABEL[rec.action];
  $("recDrops").replaceChildren(drops(rec.action, "drops drops-lg-in"));
  $("recDrops").setAttribute("aria-label", `Water level ${DROP_LEVEL[rec.action]} of 3`);
  $("recHeadline").textContent = rec.headline;
  $("recReasons").replaceChildren(...rec.reasons.map((r) => el("li", {}, r)));
  const m = rec.metrics;
  const items = [
    [`${fmt(m.rain_last_48h_mm, 1)} mm`, "Rain, last 48 h"],
    [`${fmt(m.rain_next_24h_mm, 1)} mm`, `Rain, next 24 h (${m.rain_prob_next_24h}%)`],
    [`${fmt(m.lawn_demand_mm, 1)} mm`, "Lawn water use, 3 days"],
    [`${fmt(Math.max(0, m.water_deficit_mm), 1)} mm`, "Water deficit"],
    [`${fmt(m.min_temp_c)}°C`, "Today's low"],
    [`${fmt(m.wind_kmh)} km/h`, "Wind now"],
  ];
  $("recMetrics").replaceChildren(
    ...items.map(([v, label]) => el("div", { class: "metric" }, el("dt", {}, label), el("dd", {}, v))),
  );
}

function renderNow(c, today) {
  const w = wmo(c.weather_code, c.is_day);
  $("nowIcon").replaceChildren(icon(w.icon, "now-svg"));
  $("nowTemp").textContent = `${fmt(c.temperature_c)}°C`;
  $("nowDesc").textContent = `${w.label} · feels like ${fmt(c.feels_like_c)}°C`;
  const rows = [
    ["Humidity", `${fmt(c.humidity_pct)}%`],
    ["Wind", `${fmt(c.wind_kmh)} km/h`],
    ["High / Low", `${fmt(today.temp_max_c)}° / ${fmt(today.temp_min_c)}°`],
    ["Rain today", `${fmt(today.precip_mm, 1)} mm`],
    ["Evap. (ET₀)",`${fmt(today.et0_mm, 1)} mm`],
    ["Sunrise", today.sunrise?.slice(11) ?? "–"],
  ];
  $("nowDetails").replaceChildren(
    ...rows.map(([k, v]) => el("div", {}, el("dt", {}, k), el("dd", {}, v))),
  );
}

function renderHourly(hours) {
  const peak = hours.reduce((best, h) => ((h.precip_prob ?? 0) > (best?.precip_prob ?? 0) ? h : best), null);
  const peakP = peak?.precip_prob ?? 0;
  const summary = peakP > 0 ? `Peaks at ${peakP}% around ${peak.time.slice(11)}.` : "Dry all day.";
  $("hourlySummary").textContent = summary;
  $("hourly").setAttribute("aria-label", `Hourly chance of rain, next 24 hours. ${summary}`);
  $("hourly").replaceChildren(
    ...hours.map((h) => {
      const p = h.precip_prob ?? 0;
      const bar = el("div", { class: `hbar${peakP > 0 && h === peak ? " peak" : ""}`, title: `${h.time.slice(11)} · ${p}% · ${fmt(h.precip_mm, 1)} mm` });
      const fill = el("i");
      fill.style.height = `${Math.max(2, p)}%`;
      bar.append(fill);
      return bar;
    }),
  );
  if (hours.every((h) => !h.precip_prob)) {
    $("hourly").append(el("p", { class: "hourly-empty muted" }, "No rain expected"));
  }
  $("hourlyStart").textContent = hours[0]?.time.slice(11) ?? "";
  $("hourlyMid").textContent = hours[Math.floor(hours.length / 2)]?.time.slice(11) ?? "";
  $("hourlyEnd").textContent = hours.at(-1)?.time.slice(11) ?? "";
}

function renderSchedule(plan) {
  const days = plan.filter((p) => p.scheduled).map((p) => p.weekday).join(", ");
  $("scheduleNote").textContent = `Programmed: ${days || "–"} at ${plan.find((p) => p.start)?.start ?? "06:00"}`;
  $("schedule").replaceChildren(
    ...plan.map((p, i) =>
      el(
        "div",
        { class: `day a-${p.action}${i === 0 ? " today" : ""}`, title: p.reason },
        el("span", { class: "act" }, ACTION_LABEL[p.action]),
        el("span", { class: "wd" }, i === 0 ? "Today" : p.weekday),
        el("span", { class: "dt" }, dayName(p.date, { month: "short", day: "numeric" })),
        drops(p.action),
        el("span", { class: `why${p.run_minutes ? " mins" : ""}` }, p.run_minutes ? `${p.run_minutes} min` : p.reason),
      ),
    ),
  );
}

function renderForecast(daily) {
  $("forecast").replaceChildren(
    ...daily.map((d, i) => {
      const w = wmo(d.weather_code);
      return el(
        "li",
        {},
        el("span", {}, i === 0 ? "Today" : dayName(d.date)),
        el("span", { title: w.label }, icon(w.icon)),
        el("span", { class: "f-rain" }, d.precip_mm > 0.1 ? `${fmt(d.precip_mm, 1)} mm · ${d.precip_prob ?? "–"}%` : ""),
        el("span", { class: "f-temp" }, `${fmt(d.temp_max_c)}°`, el("span", { class: "lo" }, `${fmt(d.temp_min_c)}°`)),
      );
    }),
  );
}

function renderSavings(s) {
  animateNumber($("savedLitres"), s.saved_litres);
  $("baseLitres").textContent = `${s.baseline_litres.toLocaleString()} L`;
  $("planLitres").textContent = `${s.planned_litres.toLocaleString()} L`;
  const planShare = s.baseline_litres > 0 ? s.planned_litres / s.baseline_litres : 0;
  requestAnimationFrame(() => {
    $("baseBar").style.transform = "scaleX(1)";
    $("savedBar").style.transform = `scaleX(${planShare})`;
  });
  $("savingsText").textContent =
    `${s.skipped_cycles} of ${s.scheduled_cycles} scheduled cycles skipped. ` +
    `A fixed timer would use ${s.baseline_litres.toLocaleString()} L this week; ` +
    `the smart plan uses ${s.planned_litres.toLocaleString()} L (${s.saved_percent}% less).`;
}

function animateNumber(node, target) {
  const start = performance.now();
  const dur = 700;
  const step = (t) => {
    const k = Math.min(1, (t - start) / dur);
    node.textContent = Math.round(target * (1 - (1 - k) ** 3)).toLocaleString();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Zones: mock controller. Swap `controller` for real device calls later
// (e.g. fetch('/api/zones/1/start') → ESP32 / MQTT bridge).
// ---------------------------------------------------------------------------
const controller = {
  async start(zoneId, minutes) { console.info(`[mock] start zone ${zoneId} for ${minutes} min`); return true; },
  async stop(zoneId) { console.info(`[mock] stop zone ${zoneId}`); return true; },
};

const zones = {
  list: [],
  running: null, // { id, endsAt, totalMs, timer }
  initialized: false,

  init(list, rec) {
    this.list = list;
    this.defaultMinutes = rec.run_minutes || rec.base_minutes;
    if (this.running) this.stop(this.running.id);
    this.render();
  },

  msPerMinute() { return $("demoSpeed").checked ? 1000 : 60000; },

  render() {
    $("zones").replaceChildren(
      ...this.list.map((z) => {
        const opts = [5, 10, 15, 20, 30];
        if (!opts.includes(this.defaultMinutes)) opts.push(this.defaultMinutes);
        opts.sort((a, b) => a - b);
        const select = el("select", { "aria-label": `Run time for ${z.name}`, id: `zmin-${z.id}` },
          ...opts.map((m) => {
            const o = el("option", { value: m }, `${m} min`);
            if (m === this.defaultMinutes) o.selected = true;
            return o;
          }),
        );
        const btn = el("button", { class: "btn primary", type: "button", id: `zbtn-${z.id}`, "aria-label": `Start ${z.name}` }, "Start");
        btn.addEventListener("click", () => (this.running?.id === z.id ? this.stop(z.id) : this.start(z.id)));
        return el("div", { class: "zone", id: `zone-${z.id}` },
          el("div", { class: "zone-head" },
            el("span", { class: "zone-name" }, z.name),
            el("span", { class: "zone-state", id: `zstate-${z.id}` }, "IDLE"),
          ),
          el("div", { class: "zone-timer", id: `ztimer-${z.id}` }, "00:00"),
          el("div", { class: "zone-progress" }, el("div", { id: `zprog-${z.id}` })),
          el("div", { class: "zone-info muted small", id: `zinfo-${z.id}` }, `${z.flow_lpm} L/min`),
          el("div", { class: "zone-controls" }, select, btn),
        );
      }),
    );
  },

  async start(id) {
    if (this.running) await this.stop(this.running.id);
    const minutes = Number($(`zmin-${id}`).value);
    await controller.start(id, minutes);
    const totalMs = minutes * this.msPerMinute();
    this.running = { id, minutes, totalMs, startedAt: Date.now(), timer: setInterval(() => this.tick(), 200) };
    $(`zone-${id}`).classList.add("running");
    $(`zstate-${id}`).textContent = "RUNNING";
    $(`zbtn-${id}`).textContent = "Stop";
    $(`zbtn-${id}`).setAttribute("aria-label", `Stop ${this.list.find((x) => x.id === id).name}`);
    $(`zbtn-${id}`).className = "btn stop";
    $(`zmin-${id}`).disabled = true;
    this.tick();
  },

  async stop(id, finished = false) {
    if (!this.running || this.running.id !== id) return;
    const { timer, startedAt, totalMs, minutes } = this.running;
    clearInterval(timer);
    this.running = null;
    await controller.stop(id);
    const z = this.list.find((x) => x.id === id);
    const ranMin = Math.min(minutes, ((Date.now() - startedAt) / totalMs) * minutes);
    $(`zone-${id}`).classList.remove("running");
    $(`zstate-${id}`).textContent = finished ? "DONE" : "IDLE";
    $(`zbtn-${id}`).textContent = "Start";
    $(`zbtn-${id}`).setAttribute("aria-label", `Start ${z.name}`);
    $(`zbtn-${id}`).className = "btn primary";
    $(`zmin-${id}`).disabled = false;
    $(`ztimer-${id}`).textContent = "00:00";
    $(`zprog-${id}`).style.transform = "scaleX(0)";
    $(`zinfo-${id}`).textContent = `${z.flow_lpm} L/min · last run used ≈ ${Math.round(ranMin * z.flow_lpm)} L`;
  },

  tick() {
    const r = this.running;
    if (!r) return;
    const elapsed = Date.now() - r.startedAt;
    const left = Math.max(0, r.totalMs - elapsed);
    // Display in "simulated" minutes:seconds regardless of demo speed.
    const simSecLeft = Math.ceil((left / r.totalMs) * r.minutes * 60);
    const mm = String(Math.floor(simSecLeft / 60)).padStart(2, "0");
    const ss = String(simSecLeft % 60).padStart(2, "0");
    $(`ztimer-${r.id}`).textContent = `${mm}:${ss}`;
    $(`zprog-${r.id}`).style.transform = `scaleX(${Math.min(1, elapsed / r.totalMs)})`;
    if (left <= 0) this.stop(r.id, true);
  },
};

// ---------------------------------------------------------------------------
// Location dialog
// ---------------------------------------------------------------------------
function openDialog() {
  const dlg = $("locationDialog");
  if (!dlg.open) dlg.showModal();
  $("searchInput").focus();
}

$("locationBtn").addEventListener("click", openDialog);
$("closeDialog").addEventListener("click", () => $("locationDialog").close());
$("gpsBtn").addEventListener("click", () => { $("locationDialog").close(); useGps(); });
$("demoBtn").addEventListener("click", () => { $("locationDialog").close(); setLocation(DEMO_LOCATION); });

$("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("searchInput").value.trim();
  const list = $("searchResults");
  list.replaceChildren(el("li", { class: "muted small" }, "Searching…"));
  try {
    const { results } = await api("/api/geocode", { q });
    if (!results.length) {
      list.replaceChildren(el("li", { class: "muted small" }, "No matches. Try a nearby city."));
      return;
    }
    list.replaceChildren(
      ...results.map((r) => {
        const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
        const b = el("button", { type: "button" }, label);
        b.addEventListener("click", () => {
          $("locationDialog").close();
          setLocation({ name: [r.name, r.admin1].filter(Boolean).join(", "), latitude: r.latitude, longitude: r.longitude });
        });
        return el("li", {}, b);
      }),
    );
  } catch (err) {
    list.replaceChildren(el("li", { class: "muted small" }, err.message));
  }
});

// ---------------------------------------------------------------------------
// Tiny DOM helper
// ---------------------------------------------------------------------------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

// Boot
useGps();
