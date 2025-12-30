// =======================================
// AKASA VA – FINAL UNIFIED MAP.JS
// Single map instance
// Works with clean flights.json keys
// Toggle flights ON/OFF
// =======================================

// ---------- MAP ----------
const map = L.map("map", { zoomControl: false }).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap contributors © CARTO" }
).addTo(map);

// ---------- GLOBALS ----------
const airportMarkers = {};
const flightLayer = L.layerGroup().addTo(map);
let animationInterval = null;
let flightsVisible = true;

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
      fillColor: isHub ? "#ff00ff" : "#ffcc00",
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

          const route = curvedLine(
            [from.lat, from.lng],
            [to.lat, to.lng]
          )
            .addTo(flightLayer)
            .bindTooltip(
              `<b>${f.flightNo}</b><br>
               Aircraft: ${f.aircraft}<br>
               Ticket: $${f.price}<br>
               Status: ${f.status}`,
              { sticky: true }
            )
            .on("mouseover", e => e.target.setStyle({ weight: 4 }))
            .on("mouseout", e => e.target.setStyle({ weight: 2 }));
        });
    });
  });
}

// ---------- CURVED ROUTE ----------
function curvedLine(from, to) {
  const offset = Math.min(
    0.25,
    Math.abs(from[0] - to[0]) * 0.3
  );

  const midLat = (from[0] + to[0]) / 2 + offset;
  const midLng = (from[1] + to[1]) / 2;

  return L.polyline(
    [from, [midLat, midLng], to],
    {
      color: "#ff9900",
      weight: 2,
      dashArray: "6 8",
      opacity: 0.9
    }
  );
}

// ---------- PLANE ANIMATION ----------
function startPlaneAnimation(airports, flights) {
  if (animationInterval) clearInterval(animationInterval);

  animationInterval = setInterval(() => {
    if (!flightsVisible) return;

    const f = flights[Math.floor(Math.random() * flights.length)];
    const from = airports[f.origin];
    const to = airports[f.destination];
    if (!from || !to) return;

    animatePlane(from, to);
  }, 6000);
}

function animatePlane(from, to) {
  const icon = L.divIcon({
    html: "✈️",
    className: "plane",
    iconSize: [24, 24]
  });

  const marker = L.marker([from.lat, from.lng], { icon })
    .addTo(flightLayer);

  let t = 0;
  const steps = 240;

  const interval = setInterval(() => {
    t++;
    const p = t / steps;

    const lat =
      from.lat + (to.lat - from.lat) * p +
      Math.sin(p * Math.PI) * 1.2;

    const lng =
      from.lng + (to.lng - from.lng) * p;

    const heading =
      Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180 / Math.PI;

    const el = marker.getElement();
    if (el) {
      el.style.transform = `rotate(${heading}deg)`;
      el.style.opacity =
        p < 0.1 ? p * 10 :
        p > 0.9 ? (1 - p) * 10 : 1;
    }

    marker.setLatLng([lat, lng]);

    if (t >= steps) {
      clearInterval(interval);
      flightLayer.removeLayer(marker);
    }
  }, 30);
}

// ---------- TOGGLE BUTTON ----------
function setupToggle() {
  const btn = document.getElementById("toggleFlights");
  if (!btn) return;

  btn.onclick = () => {
    if (flightsVisible) {
      map.removeLayer(flightLayer);
    } else {
      map.addLayer(flightLayer);
    }
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
      <span style="background:#ffcc00"></span> Destination<br>
      <span style="background:#ff00ff"></span> Hub (Mumbai)
    `;
    return div;
  };

  legend.addTo(map);
}
