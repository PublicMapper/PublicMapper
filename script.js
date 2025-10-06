// URL of your published Google Sheet CSV
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuT8A5dVlZLc7so9ycNYn-rX6kyknKKxz4gSUp5nKrPS5r91fnOb07P4yRzc3WNjJeHVjoMbTZGusK/pub?output=csv";

// Initialize map
const map = L.map("map").setView([40.7128, -73.94], 10.5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

// Helper: convert agent category to numeric weight for clusters
function agentWeight(category) {
  switch (category?.trim().toLowerCase()) {
    case "1 or 2": return 1;
    case "between 3 and 5": return 4;
    case "between 6 and 10": return 8;
    case "More than 10": return 15;
    default: return 1;
  }
}

// Helper: size points by reported agent count
function getMarkerRadius(category) {
  switch (category?.trim().toLowerCase()) {
    case "1 or 2": return 8;
    case "between 3 and 5": return 12;
    case "between 6 and 10": return 16;
    case "More than 10": return 20;
    default: return 10;
  }
}

// Marker cluster with agent-weight scaling
const markersCluster = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
    // sum weights of all child markers
    let totalWeight = 0;
    cluster.getAllChildMarkers().forEach(m => {
      totalWeight += m.options.agentWeight || 1;
    });

    // radius scales with total weight
    const radius = 10 + Math.sqrt(totalWeight) * 3;

    return L.divIcon({
      html: `<div style="
        width:${radius*2}px;
        height:${radius*2}px;
        background: rgba(255,0,0,0.6);
        border: 2px solid #000000;
        border-radius:50%;
        text-align:center;
        line-height:${radius*2}px;
        color:white;
        font-weight:bold;
      ">${cluster.getChildCount()}</div>`,
      className: '',
      iconSize: L.point(radius*2, radius*2)
    });
  }
});
map.addLayer(markersCluster);

let allMarkers = []; // store markers with date

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

      const agents = row["Approximate number of ICE agents"];
      const marker = L.circleMarker([lat, lon], {
        radius: getMarkerRadius(agents),
        color: "#000000",
        fillColor: "#ff0000",
        fillOpacity: 0.5,
        weight: 2,
        agentWeight: agentWeight(agents) // attach weight for cluster
      }).bindPopup(`
        <strong>Location:</strong> ${row["Location of ICE activity"]}<br>
        <strong>Borough:</strong> ${row["Borough of ICE activity"]}<br>
        <strong>Date:</strong> ${dateStr}<br>
        <strong>Time:</strong> ${row["Time of ICE activity"]}<br>
        <strong>Agents:</strong> ${agents}<br>
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

// Filter function (all / last 24h)
function applyFilter() {
  const filter = document.querySelector('input[name="timeFilter"]:checked')?.value || "all";
  markersCluster.clearLayers();
  const now = new Date();

  const filtered = allMarkers.filter(item => {
    if (filter === "all") return true;
    if (filter === "24h") {
      return (now - item.date) <= 24*60*60*1000;
    }
    return true;
  });

  filtered.forEach(item => markersCluster.addLayer(item.marker));
}

// Attach filter events
document.querySelectorAll('input[name="timeFilter"]').forEach(input => {
  input.addEventListener('change', applyFilter);
});

// Load data initially and refresh every 2 minutes
loadData();
setInterval(loadData, 120000);
