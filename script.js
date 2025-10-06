// URL of your published Google Sheet CSV
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuT8A5dVlZLc7so9ycNYn-rX6kyknKKxz4gSUp5nKrPS5r91fnOb07P4yRzc3WNjJeHVjoMbTZGusK/pub?output=csv";

// Initialize map
const map = L.map("map").setView([40.7128, -74.0060], 11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

// Marker cluster
const markersCluster = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
    // number of child markers
    const count = cluster.getChildCount();

    // radius scales with number of points
    const radius = 15 + Math.min(count, 20); // 15 minimum, grows slowly

    // Create a div with no extra styles from leaflet.markercluster CSS
    return L.divIcon({
      html: `<svg width="${radius*2}" height="${radius*2}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="rgba(255,0,0,0.6)" />
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12" fill="white">${count}</text>
      </svg>`,
      className: '', // remove default 'marker-cluster' class
      iconSize: L.point(radius*2, radius*2)
    });
  }
});

map.addLayer(markersCluster);

let allMarkers = []; // store all markers with dates

// Helper: size points by reported agent count
function getMarkerRadius(category) {
  switch (category?.trim().toLowerCase()) {
    case "1 or 2": return 8;
    case "3 to 5": return 12;
    case "6 to 10": return 16;
    case "more than 10": return 20;
    default: return 10;
  }
}

// Load and plot data
async function loadData() {
  try {
    const response = await fetch(sheetURL);
    const rawText = await response.text();
    const results = Papa.parse(rawText, { header: true, skipEmptyLines: true });

    markersCluster.clearLayers();
    allMarkers = [];

    results.data.forEach(row => {
      const lat = parseFloat(row["Latitude"]);
      const lon = parseFloat(row["Longitude"]);
      if (isNaN(lat) || isNaN(lon)) return;

      const dateStr = row["Date of ICE activity"];
      const dateObj = new Date(dateStr);
      const marker = L.circleMarker([lat, lon], {
        radius: getMarkerRadius(row["Approximate number of ICE agents"]),
        color: "#000000",
        fillColor: "#ff0000",
        fillOpacity: 0.5,
        weight: 2
      }).bindPopup(`
        <strong>Location:</strong> ${row["Location of ICE activity"]}<br>
        <strong>Borough:</strong> ${row["Borough of ICE activity"]}<br>
        <strong>Date:</strong> ${dateStr}<br>
        <strong>Time:</strong> ${row["Time of ICE activity"]}<br>
        <strong>Agents:</strong> ${row["Approximate number of ICE agents"]}<br>
        <strong>Description:</strong> ${row["Description of ICE activity"]}
      `);

      allMarkers.push({ marker, date: dateObj });
    });

    applyFilter();
    console.log("Markers loaded:", allMarkers.length);

  } catch (err) {
    console.error("Error loading CSV:", err);
  }
}

// Filter function
function applyFilter() {
  const filter = document.querySelector('input[name="timeFilter"]:checked').value;
  markersCluster.clearLayers();
  const now = new Date();

  const filtered = allMarkers.filter(item => {
    if (filter === "all") return true;
    if (filter === "24h") {
      const diff = now - item.date;
      return diff <= 24*60*60*1000;
    }
  });

  filtered.forEach(item => markersCluster.addLayer(item.marker));
}

// Attach filter events
document.querySelectorAll('input[name="timeFilter"]').forEach(input => {
  input.addEventListener('change', applyFilter);
});

loadData();
setInterval(loadData, 120000); // refresh every 2 minutes
