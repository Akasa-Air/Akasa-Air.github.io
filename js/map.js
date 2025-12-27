document.addEventListener("DOMContentLoaded", () => {

  /* ================= MAP ================= */
  const map = L.map("map", {
    zoomControl: false
  }).setView([22.5, 78.9], 5);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap © CARTO" }
  ).addTo(map);

  /* ================= STATE ================= */
  let animationEnabled = true;
  let activeRoutes = [];

  /* ================= HELPERS ================= */
  function bearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }

  function curvedPath(from, to, steps = 120) {
    const points = [];
    const offset = 0.15;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat =
        from.lat + (to.lat - from.lat) * t +
        Math.sin(Math.PI * t) * offset;
      const lng =
        from.lng + (to.lng - from.lng) * t;
      points.push([lat, lng]);
    }
    return points;
  }

  /* ================= LOAD DATA ================= */
  Promise.all([
    fetch("data/airports.json").then(r => r.json()),
    fetch("data/routes.json").then(r => r.json())
  ]).then(([airports, routes]) => {

    /* ===== AIRPORT MARKERS ===== */
    Object.entries(airports).forEach(([icao, a]) => {
      L.circleMarker([a.lat, a.lng], {
        radius: 6,
        fillColor: "#ff6a00",
        fillOpacity: 0.95,
        color: "#000",
        weight: 1
      })
      .addTo(map)
      .bindPopup(`<b>${icao}</b><br>${a.name}`)
      .on("click", () => showRoutesFrom(icao));
    });

    /* ===== ROUTES ON SELECTION ===== */
    function showRoutesFrom(icao) {
      activeRoutes.forEach(r => map.removeLayer(r));
      activeRoutes = [];

      routes
        .filter(r => r.origin === icao)
        .forEach(route => {
          const from = airports[route.origin];
          const to = airports[route.destination];
          if (!from || !to) return;

          const path = curvedPath(from, to);

          const line = L.polyline(path, {
            dashArray: "6 10",
            color: "#ffcc00",
            weight: 2,
            opacity: 0.7
          })
          .addTo(map)
          .on("mouseover", e => {
            e.target.setStyle({ weight: 4, opacity: 1 });
            e.target.bindTooltip(
              `<b>${route.flightNo}</b><br>
               ${route.aircraft}<br>
               ₹${route.price}<br>
               ${route.status}`,
              { sticky: true }
            ).openTooltip();
          })
          .on("mouseout", e => {
            e.target.setStyle({ weight: 2, opacity: 0.7 });
          });

          activeRoutes.push(line);

          if (animationEnabled) animatePlane(from, to);
        });
    }

    /* ===== PLANE ANIMATION ===== */
    function animatePlane(from, to) {
      const path = curvedPath(from, to);
      const heading = bearing(
        from.lat * Math.PI / 180,
        from.lng * Math.PI / 180,
        to.lat * Math.PI / 180,
        to.lng * Math.PI / 180
      );

      const plane = L.marker(path[0], {
        icon: L.divIcon({
          html: `<div style="
            transform: rotate(${heading}deg);
            font-size:18px;
            opacity:0.8">✈️</div>`
        })
      }).addTo(map);

      let i = 0;
      const timer = setInterval(() => {
        if (!animationEnabled || i >= path.length) {
          clearInterval(timer);
          map.removeLayer(plane);
          return;
        }
        plane.setLatLng(path[i]);
        i++;
      }, 45); // SLOWER & SMOOTHER
    }

  });

  /* ================= TOGGLE ================= */
  window.toggleFlights = () => {
    animationEnabled = !animationEnabled;
    alert("Flight animation: " + (animationEnabled ? "ON" : "OFF"));
  };

});
