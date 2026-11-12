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
  0: ["Clear sky", "☀️", "🌙"], 1: ["Mainly clear", "🌤️", "🌙"], 2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Freezing fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm, hail", "⛈️"], 99: ["Thunderstorm, hail", "⛈️"],
};
const wmo = (code, isDay = true) => {
  const [label, day, night] = WMO[code] ?? ["Unknown", "❔"];
  return { label, icon: !isDay && night ? night : day };
};

const ACTION_LABEL = { WATER: "WATER", REDUCE: "REDUCE", DELAY: "DELAY", SKIP: "SKIP", OFF: "OFF" };
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
    showStatus(`${msg} Search for your city instead.`, { error: true });
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
function showStatus(text, { error = false } = {}) {
  $("status").hidden = false;
  $("status").classList.toggle("error", error);
  $("status").querySelector(".spinner").hidden = error;
  $("statusText").textContent = text;
}

async function loadDashboard() {
  const { latitude, longitude } = state.location;
  showStatus("Checking the weather…");
  try {
    state.data = await api("/api/dashboard", { lat: latitude.toFixed(4), lon: longitude.toFixed(4) });
  } catch (err) {
    showStatus(`Couldn't load weather: ${err.message}`, { error: true });
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
  card.className = `card rec span-2 a-${rec.action}`;
  $("recAction").className = `pill a-${rec.action}`;
  $("recAction").textContent = ACTION_LABEL[rec.action];
  $("recHeadline").textContent = rec.headline;
  $("recReasons").replaceChildren(...rec.reasons.map((r) => el("li", {}, r)));
  const m = rec.metrics;
  const items = [
    [`${fmt(m.rain_last_48h_mm, 1)} mm`, "Rain, last 48 h"],
    [`${fmt(m.rain_next_24h_mm, 1)} mm`, `Rain, next 24 h (${m.rain_prob_next_24h}%)`],
    [`${fmt(m.lawn_demand_mm, 1)} mm`, "Lawn water use, 3 days"],
    [`${fmt(Math.max(0, m.water_deficit_mm), 1)} mm`, "Water deficit"],
    [`${fmt(m.min_temp_c)}°C`, "Today's low"],
    [`${fmt(m.wind_kmh)} km/h`, "Wind now"],
  ];
  $("recMetrics").replaceChildren(
    ...items.map(([v, label]) => el("div", { class: "metric" }, el("b", {}, v), el("span", {}, label))),
  );
}

function renderNow(c, today) {
  const w = wmo(c.weather_code, c.is_day);
  $("nowIcon").textContent = w.icon;
  $("nowTemp").textContent = `${fmt(c.temperature_c)}°C`;
  $("nowDesc").textContent = `${w.label} · feels like ${fmt(c.feels_like_c)}°C`;
  const rows = [
    ["Humidity", `${fmt(c.humidity_pct)}%`],
    ["Wind", `${fmt(c.wind_kmh)} km/h`],
    ["High / Low", `${fmt(today.temp_max_c)}° / ${fmt(today.temp_min_c)}°`],
    ["Rain today", `${fmt(today.precip_mm, 1)} mm`],
    ["Evap. (ET₀)",`${fmt(today.et0_mm, 1)} mm`],
    ["Sunrise", today.sunrise?.slice(11) ?? "–"],
  ];
  $("nowDetails").replaceChildren(
    ...rows.map(([k, v]) => el("div", {}, el("dt", {}, k), el("dd", {}, v))),
  );
}

function renderHourly(hours) {
  $("hourly").replaceChildren(
    ...hours.map((h) => {
      const p = h.precip_prob ?? 0;
      const bar = el("div", { class: "hbar", title: `${h.time.slice(11)} · ${p}% · ${fmt(h.precip_mm, 1)} mm` });
      const fill = el("i");
      fill.style.height = `${Math.max(2, p)}%`;
      bar.append(fill);
      return bar;
    }),
  );
  if (hours.every((h) => !h.precip_prob)) {
    $("hourly").append(el("p", { class: "hourly-empty muted" }, "☀️ No rain expected"));
  }
  $("hourlyStart").textContent = hours[0]?.time.slice(11) ?? "";
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
        el("span", { class: "wd" }, i === 0 ? "Today" : p.weekday),
        el("span", { class: "dt" }, dayName(p.date, { month: "short", day: "numeric" })),
        el("span", { class: "act" }, p.action === "OFF" ? "—" : ACTION_LABEL[p.action]),
        el("span", { class: "why" }, p.run_minutes ? `${p.run_minutes} min` : p.reason),
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
        el("span", { title: w.label }, w.icon),
        el("span", { class: "f-rain" }, d.precip_mm > 0.1 ? `💧 ${fmt(d.precip_mm, 1)} mm · ${d.precip_prob ?? "–"}%` : ""),
        el("span", { class: "f-temp" }, `${fmt(d.temp_max_c)}°`, el("span", { class: "lo" }, `${fmt(d.temp_min_c)}°`)),
      );
    }),
  );
}

function renderSavings(s) {
  animateNumber($("savedLitres"), s.saved_litres);
  requestAnimationFrame(() => ($("savedBar").style.width = `${s.saved_percent}%`));
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
        const btn = el("button", { class: "btn primary", type: "button", id: `zbtn-${z.id}` }, "Start");
        btn.addEventListener("click", () => (this.running?.id === z.id ? this.stop(z.id) : this.start(z.id)));
        return el("div", { class: "zone", id: `zone-${z.id}` },
          el("div", { class: "zone-head" },
            el("span", { class: "zone-name" }, z.name),
            el("span", { class: "zone-state", id: `zstate-${z.id}` }, "IDLE"),
          ),
          el("div", { class: "zone-timer", id: `ztimer-${z.id}` }, "00:00"),
          el("div", { class: "zone-progress" }, el("div", { id: `zprog-${z.id}` })),
          el("div", { class: "muted small", id: `zinfo-${z.id}` }, `${z.flow_lpm} L/min`),
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
    $(`zbtn-${id}`).className = "btn primary";
    $(`zmin-${id}`).disabled = false;
    $(`ztimer-${id}`).textContent = "00:00";
    $(`zprog-${id}`).style.width = "0";
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
    $(`zprog-${r.id}`).style.width = `${(elapsed / r.totalMs) * 100}%`;
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
