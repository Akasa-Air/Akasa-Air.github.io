// =======================================
// AKASA VA – FINAL MAP.JS (SMOOTH + DARK)
// =======================================

// ---------- MAP ----------
const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true
}).setView([22.5, 78.9], 5);

// Dark mode basemap
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ---------- GLOBALS ----------
const airportMarkers = {};
const flightLayer = L.layerGroup().addTo(map);
let flightsVisible = true;
let animationInterval = null;

// ---------- LOAD DATA ----------
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {
  drawAirports(airports);
  enableAirportSelection(airports, flights);
  startPlaneAnimation(airports, flights);
  addLegend();
  setupToggle();
});

// ---------- AIRPORT MARKERS ----------
function drawAirports(airports) {
  Object.entries(airports).forEach(([icao, a]) => {
    const isHub = icao === "VABB";

    const marker = L.circleMarker([a.lat, a.lng], {
      radius: isHub ? 10 : 6,
      fillColor: isHub ? "#ff00ff" : "#ff6a00",
      fillOpacity: 0.95,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(
        `<b>${icao}</b><br>${a.city}${isHub ? "<br><b>Akasa Hub</b>" : ""}`
      );

    airportMarkers[icao] = marker;
  });
}

// ---------- ROUTE SELECTION ----------
function enableAirportSelection(airports, flights) {
  Object.entries(airportMarkers).forEach(([icao, marker]) => {
    marker.on("click", () => {
      flightLayer.clearLayers();

      flights
        .filter(f => f.origin === icao)
        .forEach(f => {
          const from = airports[f.origin];
          const to = airports[f.destination];
          if (!from || !to) return;

          curvedLine([from.lat, from.lng], [to.lat, to.lng])
            .addTo(flightLayer)
            .bindTooltip(
              `<b>${f.flightNo}</b><br>
               Aircraft: ${f.aircraft}<br>
               Ticket: $${f.price}<br>
               Status: ${f.status}`,
              { sticky: true }
            );
        });
    });
  });
}

// ---------- CURVED ROUTE ----------
function curvedLine(from, to) {
  const offset = Math.min(0.25, Math.abs(from[0] - to[0]) * 0.3);
  const midLat = (from[0] + to[0]) / 2 + offset;
  const midLng = (from[1] + to[1]) / 2;

  return L.polyline(
    [from, [midLat, midLng], to],
    {
      color: "#ff6a00",
      weight: 2,
      dashArray: "6 8",
      opacity: 0.9
    }
  );
}

// ---------- PLANE ANIMATION (SMOOTH) ----------
function startPlaneAnimation(airports, flights) {
  if (animationInterval) clearInterval(animationInterval);

  animationInterval = setInterval(() => {
    if (!flightsVisible) return;

    const f = flights[Math.floor(Math.random() * flights.length)];
    const from = airports[f.origin];
    const to = airports[f.destination];
    if (!from || !to) return;

    animatePlane(from, to);
  }, 5500);
}

function animatePlane(from, to) {
  const icon = L.divIcon({
    html: "✈️",
    className: "plane",
    iconSize: [24, 24]
  });

  const marker = L.marker([from.lat, from.lng], { icon })
    .addTo(flightLayer);

  const start = performance.now();
  const duration = 6000;

  // correct heading
  const heading =
    Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180 / Math.PI;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);

    // easing (smooth accel/decel)
    const p = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const lat =
      from.lat + (to.lat - from.lat) * p +
      Math.sin(p * Math.PI) * 1.2;

    const lng =
      from.lng + (to.lng - from.lng) * p;

    marker.setLatLng([lat, lng]);

    const el = marker.getElement();
    if (el) {
      el.style.transform = `rotate(${heading}deg)`;
      el.style.opacity =
        p < 0.1 ? p * 10 :
        p > 0.9 ? (1 - p) * 10 : 1;
    }

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      flightLayer.removeLayer(marker);
    }
  }

  requestAnimationFrame(step);
}

// ---------- TOGGLE ----------
function setupToggle() {
  const btn = document.getElementById("toggleFlights");
  if (!btn) return;

  btn.onclick = () => {
    flightsVisible
      ? map.removeLayer(flightLayer)
      : map.addLayer(flightLayer);

    flightsVisible = !flightsVisible;
  };
}

// ---------- LEGEND ----------
function addLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Akasa VA</strong><br>
      <span style="background:#ff6a00"></span> Route<br>
      <span style="background:#ff00ff"></span> Hub (Mumbai)
    `;
    return div;
  };

  legend.addTo(map);
}
