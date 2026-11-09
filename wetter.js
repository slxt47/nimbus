// Wetter (weather.slxt.org): jetzt, 24 Stunden und 14 Tage für einen Ort. Daten von Open-Meteo, direkt aus dem Browser.
// Kein Server-Teil, keine Schlüssel, keine Cookies. Ort und 10-Minuten-Cache bleiben im localStorage.
// Testen: ?ort=Wien (wird nicht gespeichert).
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const GRAZ = { name: 'Graz', lat: 47.0707, lon: 15.4395, zusatz: 'Steiermark, Österreich' };
  const CACHE_MS = 10 * 60 * 1000;
  const SPEICHER = { ort: 'wetter:ort', daten: 'wetter:daten' };

  const lesen = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const schreiben = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat/gesperrt */ } };

  // ---------------------------------------------------------------- Wettercodes (WMO) → Text + Symbol
  const CODES = {
    0: ['Klar', 'klar'], 1: ['Überwiegend klar', 'klar'], 2: ['Teils bewölkt', 'teils'], 3: ['Bedeckt', 'wolke'],
    45: ['Nebel', 'nebel'], 48: ['Nebel mit Reif', 'nebel'],
    51: ['Leichter Niesel', 'niesel'], 53: ['Niesel', 'niesel'], 55: ['Starker Niesel', 'niesel'],
    56: ['Gefrierender Niesel', 'eisregen'], 57: ['Starker gefrierender Niesel', 'eisregen'],
    61: ['Leichter Regen', 'regen'], 63: ['Regen', 'regen'], 65: ['Starker Regen', 'starkregen'],
    66: ['Gefrierender Regen', 'eisregen'], 67: ['Starker gefrierender Regen', 'eisregen'],
    71: ['Leichter Schneefall', 'schnee'], 73: ['Schneefall', 'schnee'], 75: ['Starker Schneefall', 'schnee'], 77: ['Schneegriesel', 'schnee'],
    80: ['Leichte Regenschauer', 'schauer'], 81: ['Regenschauer', 'schauer'], 82: ['Heftige Regenschauer', 'starkregen'],
    85: ['Leichte Schneeschauer', 'schnee'], 86: ['Schneeschauer', 'schnee'],
    95: ['Gewitter', 'gewitter'], 96: ['Gewitter mit Hagel', 'hagel'], 99: ['Schweres Gewitter mit Hagel', 'hagel'],
  };
  const code = (c) => CODES[c] || ['Unbekannt', 'wolke'];

  // ---------------------------------------------------------------- Symbole (eigene SVGs, Farben über CSS-Variablen)
  const SONNE = (cx, cy, r) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffc53d"/>` +
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4, x1 = cx + Math.cos(a) * (r + 4), y1 = cy + Math.sin(a) * (r + 4), x2 = cx + Math.cos(a) * (r + 8), y2 = cy + Math.sin(a) * (r + 8);
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#ffb020" stroke-width="3" stroke-linecap="round"/>`;
    }).join('');
  const MOND = (cx, cy, r) => `<path d="M${cx + r * 0.35} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.65} ${r * 1.55}A${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.35} ${cy - r}z" fill="#f3e6b0"/>`;
  const WOLKE = (dx = 0, dy = 0, farbe = 'var(--wolke)') =>
    `<path transform="translate(${dx} ${dy})" d="M18 50h30a10 10 0 0 0 1-20 13 13 0 0 0-25-3 9 9 0 0 0-6 23z" fill="${farbe}"/>`;
  const TROPFEN = (n, farbe = '#4f9dff') =>
    Array.from({ length: n }, (_, i) => `<path d="M${22 + i * 10} 56l-3 7" stroke="${farbe}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
  const FLOCKEN = (n) => Array.from({ length: n }, (_, i) => `<circle cx="${22 + i * 10}" cy="${59 + (i % 2) * 3}" r="2.6" fill="#e9f1ff" stroke="#9fb4e0" stroke-width="1"/>`).join('');
  function svg(art, tag = true) {
    const himmel = (x, y, r) => (tag ? SONNE(x, y, r) : MOND(x, y, r));
    const inhalt = {
      klar: tag ? SONNE(36, 36, 13) : MOND(32, 34, 15),
      teils: himmel(26, 24, 10) + WOLKE(4, 6),
      wolke: WOLKE(-8, -4, 'var(--wolke-dunkel)') + WOLKE(2, 4),
      nebel: WOLKE(0, -6) + '<path d="M12 50h40M16 57h34M12 64h38" stroke="var(--wolke-dunkel)" stroke-width="3.2" stroke-linecap="round"/>',
      niesel: WOLKE(0, -6) + TROPFEN(3, '#7db6ff').replace(/l-3 7/g, 'l-1.5 4'),
      regen: WOLKE(0, -6) + TROPFEN(3),
      starkregen: WOLKE(0, -6, 'var(--wolke-dunkel)') + TROPFEN(4).replace(/M(\d+) 56/g, (m, x) => `M${x - 4} 56`),
      schauer: himmel(24, 20, 9) + WOLKE(4, -2) + TROPFEN(3).replace(/M(\d+) 56/g, (m, x) => `M${+x + 4} 60`),
      eisregen: WOLKE(0, -6) + TROPFEN(2, '#4f9dff') + '<circle cx="42" cy="60" r="2.6" fill="#e9f1ff" stroke="#9fb4e0"/>',
      schnee: WOLKE(0, -6) + FLOCKEN(3),
      gewitter: WOLKE(0, -6, 'var(--wolke-dunkel)') + '<path d="M34 46l-6 11h7l-4 10 11-14h-7l4-7z" fill="#ffc53d" stroke="#e59a00" stroke-width="1"/>',
      hagel: WOLKE(0, -6, 'var(--wolke-dunkel)') + '<path d="M30 46l-5 9h6l-3 8 9-11h-6l3-6z" fill="#ffc53d"/>' + '<circle cx="44" cy="57" r="3" fill="#fff" stroke="#9fb4e0"/><circle cx="19" cy="60" r="3" fill="#fff" stroke="#9fb4e0"/>',
    }[art];
    return `<svg viewBox="0 0 72 72" focusable="false">${inhalt}</svg>`;
  }

  // ---------------------------------------------------------------- Formatierung
  const WOCHENTAG = new Intl.DateTimeFormat('de-AT', { weekday: 'long', timeZone: 'UTC' });
  const KURZ = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const LANG = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  // Open-Meteo liefert Ortszeit ohne Zone ("2026-11-09T14:00"): als UTC lesen und als UTC formatieren = Ortszeit bleibt.
  const alsDatum = (s) => new Date(s.length === 10 ? `${s}T00:00Z` : `${s}Z`);
  const uhrzeit = (s) => s.slice(11, 16);
  const grad = (t) => (t == null ? '–' : `${Math.round(t)}°`);
  const RICHTUNG = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const RICHTUNG_LANG = ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest'];
  const richtung = (d) => Math.round(((d % 360) + 360) % 360 / 45) % 8;
  const zahl = (n, stellen = 0) => n.toLocaleString('de-AT', { maximumFractionDigits: stellen, minimumFractionDigits: 0 });
  const uvText = (u) => (u < 3 ? 'niedrig' : u < 6 ? 'mäßig' : u < 8 ? 'hoch' : u < 11 ? 'sehr hoch' : 'extrem');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Temperatur → Farbe für die Spannen-Balken (kalt blau … warm orange)
  function farbe(t) {
    const stops = [[-15, [120, 140, 255]], [0, [89, 165, 255]], [10, [127, 209, 166]], [20, [255, 207, 90]], [30, [255, 138, 76]], [40, [230, 70, 60]]];
    if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
    for (let i = 1; i < stops.length; i++) {
      const [t1, c1] = stops[i];
      const [t0, c0] = stops[i - 1];
      if (t <= t1) {
        const f = (t - t0) / (t1 - t0);
        return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * f)).join(',')})`;
      }
    }
    return `rgb(${stops[stops.length - 1][1]})`;
  }

  // ---------------------------------------------------------------- Ort
  const url = new URLSearchParams(location.search);
  let ort = lesen(SPEICHER.ort) || GRAZ;
  const ortAusUrl = url.get('ort');

  function ortZeigen() {
    $('ort-name').textContent = ort.name;
    $('ort-jetzt').textContent = ort.name;
    $('ort-titel-h1').textContent = ort.name;
    document.title = `Wetter ${ort.name} – 14 Tage Prognose`;
  }

  // ---------------------------------------------------------------- Daten
  const API = 'https://api.open-meteo.com/v1/forecast';
  function anfrageUrl(o) {
    const p = new URLSearchParams({
      latitude: o.lat.toFixed(4), longitude: o.lon.toFixed(4), timezone: 'auto', forecast_days: '14',
      wind_speed_unit: 'kmh',
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max',
    });
    return `${API}?${p}`;
  }

  let laeuft = null;
  async function laden(erzwingen = false) {
    const schluessel = `${ort.lat.toFixed(3)},${ort.lon.toFixed(3)}`;
    const cache = lesen(SPEICHER.daten);
    if (!erzwingen && cache && cache.schluessel === schluessel && Date.now() - cache.zeit < CACHE_MS) {
      zeichnen(cache.daten, cache.zeit);
      return;
    }
    if (laeuft) laeuft.abort();
    laeuft = new AbortController();
    try {
      const r = await fetch(anfrageUrl(ort), { signal: laeuft.signal });
      if (!r.ok) throw new Error(`Open-Meteo antwortet mit ${r.status}`);
      const d = await r.json();
      if (!d.daily || !d.hourly || !d.current) throw new Error('Unvollständige Antwort');
      const zeit = Date.now();
      schreiben(SPEICHER.daten, { schluessel, zeit, daten: d });
      $('fehler').hidden = true;
      zeichnen(d, zeit);
    } catch (e) {
      if (e.name === 'AbortError') return;
      $('fehler-text').textContent = navigator.onLine === false
        ? 'Keine Internetverbindung. Das Wetter wird geladen, sobald du wieder online bist.'
        : 'Das Wetter konnte gerade nicht geladen werden.';
      $('fehler').hidden = false;
      if (cache && cache.schluessel === schluessel) zeichnen(cache.daten, cache.zeit);
      else $('jetzt').setAttribute('aria-busy', 'false');
    }
  }

  // ---------------------------------------------------------------- Zeichnen
  function zeichnen(d, zeit) {
    const c = d.current, h = d.hourly, t = d.daily;
    const [text, art] = code(c.weather_code);
    const tag = c.is_day === 1;

    // Jetzt
    $('jetzt-symbol').innerHTML = svg(art, tag);
    $('jetzt-temp').textContent = Math.round(c.temperature_2m);
    $('jetzt-text').textContent = text;
    $('jetzt-neben').textContent = `Gefühlt ${grad(c.apparent_temperature)} · Heute ${grad(t.temperature_2m_min[0])} bis ${grad(t.temperature_2m_max[0])}`;
    const r = richtung(c.wind_direction_10m);
    const werte = [
      ['Wind', `${zahl(c.wind_speed_10m)} km/h <span class="pfeil" aria-hidden="true">${RICHTUNG[r]}</span><span class="sr-only"> aus ${RICHTUNG_LANG[r]}</span>`],
      ['Böen', `${zahl(c.wind_gusts_10m)} km/h`],
      ['Luftfeuchte', `${zahl(c.relative_humidity_2m)} %`],
      ['Niederschlag', `${zahl(c.precipitation, 1)} mm`],
      ['Bewölkung', `${zahl(c.cloud_cover)} %`],
      ['Luftdruck', `${zahl(c.pressure_msl)} hPa`],
      ['UV heute', `${zahl(t.uv_index_max[0], 1)} (${uvText(t.uv_index_max[0])})`],
      ['Sonne', `${uhrzeit(t.sunrise[0])} – ${uhrzeit(t.sunset[0])}`],
    ];
    const dl = $('jetzt-werte');
    dl.replaceChildren(...werte.map(([k, v]) => { const div = el('div'); div.append(el('dt', null, esc(k)), el('dd', null, v)); return div; }));
    $('jetzt').setAttribute('aria-busy', 'false');

    // 24 Stunden ab der aktuellen Stunde
    const jetztStunde = c.time.slice(0, 13);
    let start = h.time.findIndex((s) => s.slice(0, 13) === jetztStunde);
    if (start < 0) start = 0;
    const stunden = $('stunden');
    stunden.replaceChildren();
    for (let i = start; i < Math.min(start + 25, h.time.length); i++) {
      // „Jetzt“ zeigt dieselben Werte wie oben (aktuell), nicht die der vollen Stunde.
      const istJetzt = i === start;
      const [htext, hart] = code(istJetzt ? c.weather_code : h.weather_code[i]);
      const temp = istJetzt ? c.temperature_2m : h.temperature_2m[i];
      const hTag = istJetzt ? c.is_day === 1 : h.is_day[i] === 1;
      const p = h.precipitation_probability[i];
      const li = el('li', i === start ? 'jetzt-h' : '');
      const zeitText = i === start ? 'Jetzt' : uhrzeit(h.time[i]);
      li.innerHTML =
        `<span class="zeit">${zeitText}</span>` +
        `<span class="symbol" aria-hidden="true">${svg(hart, hTag)}</span>` +
        `<span class="t">${grad(temp)}</span>` +
        `<span class="r">${p >= 10 ? `${p} %` : ''}</span>` +
        `<span class="sr-only">${esc(htext)}${p >= 10 ? `, Regenwahrscheinlichkeit ${p} Prozent` : ''}</span>`;
      stunden.append(li);
    }
    const regenBald = h.precipitation_probability.slice(start, start + 6).some((p) => p >= 50);
    $('stunden-hinweis').textContent = regenBald ? 'In den nächsten Stunden ist Regen wahrscheinlich.' : '';

    // 14 Tage
    const tiefst = Math.min(...t.temperature_2m_min), hoechst = Math.max(...t.temperature_2m_max);
    const span = Math.max(1, hoechst - tiefst);
    const tage = $('tage');
    tage.replaceChildren();
    t.time.forEach((tagS, i) => {
      const [dtext, dart] = code(t.weather_code[i]);
      const d0 = alsDatum(tagS);
      const name = i === 0 ? 'Heute' : i === 1 ? 'Morgen' : WOCHENTAG.format(d0);
      const min = t.temperature_2m_min[i], max = t.temperature_2m_max[i];
      const p = t.precipitation_probability_max[i], mm = t.precipitation_sum[i];
      const li = el('li', i === 7 ? 'unsicher-start' : '');
      if (i === 7) li.append(el('span', 'hinweis-tag', 'Ab hier unsicherer'));
      const links = ((min - tiefst) / span) * 100, breite = Math.max(4, ((max - min) / span) * 100);
      li.insertAdjacentHTML('beforeend',
        `<span class="tag"><b>${esc(name)}</b><small>${KURZ.format(d0)}</small></span>` +
        `<span class="symbol" aria-hidden="true">${svg(dart, true)}</span>` +
        `<span class="r">${p != null && p >= 10 ? `${p} %` : ''}</span>` +
        `<span class="min">${grad(min)}</span>` +
        `<span class="spanne" aria-hidden="true"><i></i></span>` +
        `<span class="max">${grad(max)}</span>` +
        `<span class="mehr">${mm >= 0.1 ? `${zahl(mm, 1)} mm` : ''}<span>${zahl(t.wind_speed_10m_max[i])} km/h ${RICHTUNG[richtung(t.wind_direction_10m_dominant[i])]}</span></span>` +
        `<span class="sr-only">${esc(LANG.format(d0))}: ${esc(dtext)}, ${Math.round(min)} bis ${Math.round(max)} Grad` +
        `${p != null && p >= 10 ? `, Regenwahrscheinlichkeit ${p} Prozent` : ''}${mm >= 0.1 ? `, ${zahl(mm, 1)} Millimeter` : ''}` +
        `, Wind bis ${zahl(t.wind_speed_10m_max[i])} Kilometer pro Stunde aus ${RICHTUNG_LANG[richtung(t.wind_direction_10m_dominant[i])]}</span>`);
      // Sichtbare Teile sind für Screenreader doppelt: verstecken, die Zusammenfassung oben liest alles vor.
      li.querySelectorAll(':scope > span:not(.sr-only):not(.hinweis-tag)').forEach((s) => s.setAttribute('aria-hidden', 'true'));
      const balken = li.querySelector('.spanne i');
      balken.style.left = `${links}%`;
      balken.style.width = `${Math.min(breite, 100 - links)}%`;
      balken.style.background = `linear-gradient(90deg, ${farbe(min)}, ${farbe(max)})`;
      tage.append(li);
    });

    const stand = new Date(zeit).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
    $('stand').textContent = ` · Stand ${stand}`;
  }

  // ---------------------------------------------------------------- Ort-Fenster
  const fenster = $('ort-fenster'), schleier = $('schleier'), knopf = $('ort-knopf');
  function oeffnen() {
    fenster.hidden = false; schleier.hidden = false; knopf.setAttribute('aria-expanded', 'true');
    $('ort-eingabe').focus();
  }
  function schliessen() {
    fenster.hidden = true; schleier.hidden = true; knopf.setAttribute('aria-expanded', 'false');
    $('ort-treffer').replaceChildren(); $('ort-status').textContent = '';
    knopf.focus();
  }
  function setzen(neu, merken = true) {
    ort = neu;
    if (merken) schreiben(SPEICHER.ort, ort);
    ortZeigen();
    laden();
  }
  knopf.addEventListener('click', () => (fenster.hidden ? oeffnen() : schliessen()));
  $('ort-zu').addEventListener('click', schliessen);
  schleier.addEventListener('click', schliessen);
  document.addEventListener('keydown', (e) => {
    if (fenster.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); schliessen(); return; }
    if (e.key === 'Tab') {   // Fokus bleibt im Fenster (aria-modal)
      const f = [...fenster.querySelectorAll('button, input, a[href]')].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  $('ort-suche').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('ort-eingabe').value.trim();
    const liste = $('ort-treffer'), status = $('ort-status');
    liste.replaceChildren();
    if (q.length < 2) { status.textContent = 'Bitte mindestens 2 Zeichen eingeben.'; return; }
    status.textContent = 'Suche …';
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: q, count: '8', language: 'de', format: 'json' })}`);
      const d = await r.json();
      const treffer = d.results || [];
      status.textContent = treffer.length ? `${treffer.length} Treffer` : `Nichts gefunden für „${q}“.`;
      for (const x of treffer) {
        const zusatz = [x.admin1, x.country].filter(Boolean).join(', ');
        const b = el('button', null, `${esc(x.name)} <small>${esc(zusatz)}</small>`);
        b.type = 'button';
        b.addEventListener('click', () => { setzen({ name: x.name, lat: x.latitude, lon: x.longitude, zusatz }); schliessen(); });
        const li = el('li'); li.append(b); liste.append(li);
      }
    } catch {
      status.textContent = 'Die Suche hat gerade nicht geklappt. Bitte gleich noch einmal versuchen.';
    }
  });
  $('ort-gps').addEventListener('click', () => {
    const status = $('ort-status');
    if (!navigator.geolocation) { status.textContent = 'Dieser Browser kann den Standort nicht bestimmen.'; return; }
    status.textContent = 'Standort wird bestimmt …';
    navigator.geolocation.getCurrentPosition(
      (p) => { setzen({ name: 'Mein Standort', lat: p.coords.latitude, lon: p.coords.longitude, zusatz: '' }); schliessen(); },
      () => { status.textContent = 'Kein Zugriff auf den Standort. Du kannst ihn in den Browser-Einstellungen erlauben oder einen Ort suchen.'; },
      { timeout: 10000, maximumAge: 600000 },
    );
  });
  $('ort-standard').addEventListener('click', () => { setzen(GRAZ); schliessen(); });
  $('nochmal').addEventListener('click', () => laden(true));

  // ---------------------------------------------------------------- Start
  async function start() {
    if (ortAusUrl) {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: ortAusUrl, count: '1', language: 'de', format: 'json' })}`);
        const x = ((await r.json()).results || [])[0];
        if (x) ort = { name: x.name, lat: x.latitude, lon: x.longitude, zusatz: [x.admin1, x.country].filter(Boolean).join(', ') };
      } catch { /* bleibt beim gespeicherten Ort */ }
    }
    ortZeigen();
    laden();
  }
  start();
  setInterval(() => { if (!document.hidden) laden(); }, CACHE_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) laden(); });
  window.addEventListener('online', () => laden(true));
})();
