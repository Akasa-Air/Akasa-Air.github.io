const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CARTO"
}).addTo(map);

// Plane icon
const planeIcon = L.divIcon({
  html: "✈️",
  className: "plane-icon",
  iconSize: [24, 24]
});

Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {

  // Draw destination dots
  Object.entries(airports).forEach(([code, a]) => {
    L.circleMarker([a.lat, a.lng], {
      radius: 6,
      fillColor: "#5b2ddb",
      color: "#fff",
      weight: 1,
      fillOpacity: 1
    }).addTo(map).bindPopup(`${code} – ${a.name}`);
  });

  // Animate one plane every 6 seconds
  setInterval(() => {
    const f = flights[Math.floor(Math.random() * flights.length)];
    animateFlight(
      airports[f.from],
      airports[f.to]
    );
  }, 6000);
});

function animateFlight(from, to) {
  if (!from || !to) return;

  const steps = 120;
  let i = 0;

  const latStep = (to.lat - from.lat) / steps;
  const lngStep = (to.lng - from.lng) / steps;

  let lat = from.lat;
  let lng = from.lng;

  const marker = L.marker([lat, lng], { icon: planeIcon }).addTo(map);

  const interval = setInterval(() => {
    lat += latStep;
    lng += lngStep;
    marker.setLatLng([lat, lng]);

    i++;
    if (i >= steps) {
      map.removeLayer(marker);
      clearInterval(interval);
    }
  }, 50);
}
