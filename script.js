const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuT8A5dVlZLc7so9ycNYn-rX6kyknKKxz4gSUp5nKrPS5r91fnOb07P4yRzc3WNjJeHVjoMbTZGusK/pub?output=csv";

// Initialize map
const map = L.map("map").setView([40.7128, -74.0060], 11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OSM &copy; CARTO',
  subdomains:'abcd',
  maxZoom:20
}).addTo(map);

// Marker cluster with size scaling
const markers = L.markerClusterGroup({
  iconCreateFunction: cluster => {
    const count = cluster.getChildCount();
    const size = Math.min(40 + count, 80); // scale size with number of points
    return L.divIcon({
      html: `<div style="
        background-color: rgba(255,0,0,0.8);
        border: 2px solid #000;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:bold;
        color:#000;
      ">${count}</div>`,
      className: 'custom-cluster',
      iconSize: L.point(size, size)
    });
  }
});
map.addLayer(markers);

// Marker size by agent count
function getRadius(agents) {
  switch (agents?.toLowerCase()) {
    case "1 or 2": return 10;
    case "3 to 5": return 14;
    case "6 to 10": return 18;
    case "more than 10": return 22;
    default: return 12;
  }
}

// Load and plot data
async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();
  const data = Papa.parse(text, {header:true, skipEmptyLines:true}).data;

  markers.clearLayers();

  data.forEach(row => {
    const lat = parseFloat(row["Latitude"]);
    const lon = parseFloat(row["Longitude"]);
    if (isNaN(lat) || isNaN(lon)) return;

    const marker = L.circleMarker([lat, lon], {
      radius: getRadius(row["Approximate number of ICE agents"]),
      color: "#000",
      fillColor: "#f00",
      fillOpacity: 0.5,
      weight: 2
    });

    marker.bindPopup(`
      <strong>Location:</strong> ${row["Location of ICE activity"]}<br>
      <strong>Borough:</strong> ${row["Borough of ICE activity"]}<br>
      <strong>Date:</strong> ${row["Date of ICE activity"]}<br>
      <strong>Time:</strong> ${row["Time of ICE activity"]}<br>
      <strong>Agents:</strong> ${row["Approximate number of ICE agents"]}<br>
      <strong>Description:</strong> ${row["Description of ICE activity"]}
    `);

    markers.addLayer(marker);
  });
}

loadData();
setInterval(loadData, 120000); // refresh every 2 min
