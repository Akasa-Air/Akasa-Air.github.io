// ==========================
// MAP INITIALIZATION
// ==========================
const map = L.map("map", {
  zoomControl: false
}).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ==========================
// GLOBAL STATE
// ==========================
let airportsData = {};
let routesData = [];
let honRoutesData = [];
let routeLayer = L.layerGroup().addTo(map);
let planeLayer = L.layerGroup().addTo(map);

// ==========================
// LOAD DATA
// ==========================
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json()),
  fetch("data/hon-circle.json").then(r => r.json())
]).then(([airports, flights, honFlights]) => {
  airportsData = airports;
  routesData = flights;
  honRoutesData = honFlights;

  drawAirports();
  startRandomAnimation();
});

// ==========================
// DRAW AIRPORTS
// ==========================
function drawAirports() {
  Object.entries(airportsData).forEach(([icao, a]) => {
    const isHub = icao === "VABB"; // Mumbai hub

    const marker = L.circleMarker([a.lat, a.lng], {
      radius: isHub ? 10 : 6,
      fillColor: isHub ? "#ff2d55" : "#ffcc00",
      fillOpacity: 0.95,
      color: "#000",
      weight: 1
    }).addTo(map);

    marker.bindPopup(`<b>${icao}</b><br>${a.city}`);

    marker.on("click", () => {
      drawRoutesFromAirport(icao);
    });
  });
}

// ==========================
// DRAW ROUTES FROM AIRPORT
// ==========================
function drawRoutesFromAirport(icao) {
  routeLayer.clearLayers();

  const allRoutes = [...routesData, ...honRoutesData];

  allRoutes.forEach(r => {
    if (r["ORIGIN ICAO"] !== icao) return;

    const from = airportsData[r["ORIGIN ICAO"]];
    const to = airportsData[r["DESTINATION ICAO"]];
    if (!from || !to) return;

    const isHON = honRoutesData.includes(r);

    const curve = generateCurve(
      [from.lat, from.lng],
      [to.lat, to.lng]
    );

    const polyline = L.polyline(curve, {
      color: isHON ? "#00d4ff" : "#ffcc00",
      weight: 2,
      dashArray: "6,8",
      opacity: 0.8
    }).addTo(routeLayer);

    polyline.bindTooltip(
      `<b>${r["ROUTE FLIGHT NO."]}</b><br>
       Aircraft: ${r["ASSIGNED AIRCRAFTS"]}<br>
       Price: $${r["Ticket Price"]}<br>
       Status: ${r["Status"]}`,
      { sticky: true }
    );

    polyline.on("mouseover", () => polyline.setStyle({ weight: 4 }));
    polyline.on("mouseout", () => polyline.setStyle({ weight: 2 }));
  });
}

// ==========================
// CURVE GENERATOR
// ==========================
function generateCurve(from, to) {
  const latlngs = [];
  const steps = 80;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat =
      from[0] * (1 - t) + to[0] * t + Math.sin(Math.PI * t) * 2;
    const lng =
      from[1] * (1 - t) + to[1] * t;
    latlngs.push([lat, lng]);
  }
  return latlngs;
}

// ==========================
// PLANE ANIMATION
// ==========================
function startRandomAnimation() {
  setInterval(() => {
    animatePlane();
  }, 6000);
}

function animatePlane() {
  const r = routesData[Math.floor(Math.random() * routesData.length)];
  const from = airportsData[r["ORIGIN ICAO"]];
  const to = airportsData[r["DESTINATION ICAO"]];
  if (!from || !to) return;

  const path = generateCurve(
    [from.lat, from.lng],
    [to.lat, to.lng]
  );

  const plane = L.marker(path[0], {
    icon: L.divIcon({
      html: "✈️",
      className: "plane-icon",
      iconSize: [20, 20]
    }),
    opacity: 0
  }).addTo(planeLayer);

  let i = 0;
  const interval = setInterval(() => {
    if (i >= path.length) {
      clearInterval(interval);
      map.removeLayer(plane);
      return;
    }

    const next = path[Math.min(i + 1, path.length - 1)];
    const curr = path[i];
    const heading = Math.atan2(
      next[1] - curr[1],
      next[0] - curr[0]
    ) * (180 / Math.PI);

    plane.setLatLng(curr);
    plane.setOpacity(i < 10 || i > path.length - 10 ? 0.3 : 1);

    plane.getElement().style.transform =
      `rotate(${heading}deg)`;

    i++;
  }, 60);
}
