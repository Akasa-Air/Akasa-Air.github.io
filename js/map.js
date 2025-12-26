const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CARTO"
}).addTo(map);

// Plane icon
const planeIcon = L.divIcon({
  html: "✈️",
  className: "plane-icon",
  iconSize: [24, 24]
});

fetch("data/airports.json")
  .then(res => res.json())
  .then(airports => {

    const codes = Object.keys(airports);

    // Draw airport markers
    codes.forEach(code => {
      const a = airports[code];
      L.circleMarker([a.lat, a.lng], {
        radius: 6,
        fillColor: "#5b2ddb",
        color: "#ffffff",
        weight: 1,
        fillOpacity: 0.9
      })
      .addTo(map)
      .bindPopup(`<b>${code}</b><br>${a.name}`);
    });

    // Animate plane occasionally
    setInterval(() => {
      animateRandomFlight(airports, codes);
    }, 10000); // every 10 seconds
  });

function animateRandomFlight(airports, codes) {
  const fromCode = codes[Math.floor(Math.random() * codes.length)];
  let toCode = codes[Math.floor(Math.random() * codes.length)];

  if (fromCode === toCode) return;

  const from = airports[fromCode];
  const to = airports[toCode];

  const plane = L.marker([from.lat, from.lng], { icon: planeIcon }).addTo(map);

  const steps = 100;
  let step = 0;

  const latStep = (to.lat - from.lat) / steps;
  const lngStep = (to.lng - from.lng) / steps;

  const interval = setInterval(() => {
    step++;
    plane.setLatLng([
      from.lat + latStep * step,
      from.lng + lngStep * step
    ]);

    if (step >= steps) {
      clearInterval(interval);
      map.removeLayer(plane);
    }
  }, 50);
}
