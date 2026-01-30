const service = new URLSearchParams(location.search).get("service");
document.getElementById("service").innerText = service.toUpperCase();

let chart;
let activeFilters = null;

/* -------------------------
   DEFAULT OVERVIEW (MONTHLY)
--------------------------*/
async function loadOverview() {
  activeFilters = null;

  const data = await fetchBilling(service, "monthly");
  updateSummaryAndChart(data, "period");
  loadTable({ service });
}

/* -------------------------
   APPLY FILTERS (DRILL-DOWN)
--------------------------*/
async function applyFilters() {
  const filters = { service };

  if (filterSku().value) filters.sku = filterSku().value;
  if (filterResource().value) filters.resourceType = filterResource().value;

  const mode = document.getElementById("filterMode").value;
  if (mode === "daily" && filterDate().value) {
    filters.date = filterDate().value;
  }
  if (mode === "monthly" && filterMonth().value) {
    filters.month = filterMonth().value;
  }

  activeFilters = filters;

  const rows = await fetchRaw(filters);

  // aggregate filtered rows
  const aggregated = aggregateRows(rows, mode);
  updateSummaryAndChart(aggregated, "period");
  renderTable(rows);
}

/* -------------------------
   CLEAR FILTERS → OVERVIEW
--------------------------*/
function clearFilters() {
  filterSku().value = "";
  filterResource().value = "";
  filterDate().value = "";
  filterMonth().value = "";

  loadOverview();
}

/* -------------------------
   AGGREGATION LOGIC (JS)
--------------------------*/
function aggregateRows(rows, mode) {
  const map = {};

  rows.forEach(r => {
    const key =
      mode === "daily"
        ? new Date(r.date).toISOString().slice(0, 10)
        : new Date(r.date).toISOString().slice(0, 7);

    if (!map[key]) {
      map[key] = { period: key, usage: 0, price: 0, discountedPrice: 0 };
    }

    map[key].usage += r.usage;
    map[key].price += r.price;
    map[key].discountedPrice += r.discountedPrice;
  });

  return Object.values(map).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
}

/* -------------------------
   UPDATE CARDS + CHART
--------------------------*/
function updateSummaryAndChart(data, labelKey) {
  let usage = 0, price = 0, discount = 0;

  data.forEach(d => {
    usage += d.usage;
    price += d.price;
    discount += d.discountedPrice;
  });

  usageEl().innerText = usage.toFixed(2);
  priceEl().innerText = price.toFixed(2);
  discountEl().innerText = discount.toFixed(2);

  drawChart(data.map(d => d[labelKey]), data.map(d => d.discountedPrice));
}

function drawChart(labels, values) {
  const ctx = document.getElementById("trendChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Discounted Cost",
        data: values,
        borderColor: "#3b82f6",
        tension: 0.3,
        fill: false
      }]
    }
  });
}

/* -------------------------
   TABLE
--------------------------*/
async function loadTable(query = { service }) {
    const qs = new URLSearchParams(query).toString();
    const rows = await fetch(`/api/billing/raw?${qs}`).then(r => r.json());
  
    const tbody = document.querySelector("#billingTable tbody");
    tbody.innerHTML = "";
  
    rows.forEach(r => {
      let discountPercent = 0;
  
      if (r.price > 0) {
        discountPercent =
          ((r.price - r.discountedPrice) / r.price) * 100;
      }
  
      tbody.innerHTML += `
        <tr>
          <td>${new Date(r.date).toLocaleDateString()}</td>
          <td>${r.resourceType}</td>
          <td>${r.sku}</td>
          <td>${r.usage}</td>
          <td>${r.price.toFixed(2)}</td>
          <td>${r.discountedPrice.toFixed(2)}</td>
          <td>${discountPercent.toFixed(2)}%</td>
        </tr>
      `;
    });
  }
  
/* -------------------------
   FILTER UI TOGGLES
--------------------------*/
document.getElementById("filterMode").addEventListener("change", () => {
  const mode = document.getElementById("filterMode").value;
  filterDate().style.display = mode === "daily" ? "block" : "none";
  filterMonth().style.display = mode === "monthly" ? "block" : "none";
});

/* -------------------------
   HELPERS
--------------------------*/
const usageEl = () => document.getElementById("usage");
const priceEl = () => document.getElementById("price");
const discountEl = () => document.getElementById("discount");

const filterSku = () => document.getElementById("filterSku");
const filterResource = () => document.getElementById("filterResource");
const filterDate = () => document.getElementById("filterDate");
const filterMonth = () => document.getElementById("filterMonth");

/* -------------------------
   INIT
--------------------------*/
loadOverview();
