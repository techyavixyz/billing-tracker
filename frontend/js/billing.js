const service = new URLSearchParams(location.search).get("service");
document.getElementById("service").innerText = service.toUpperCase();

let chart;
let activeFilters = null;

async function loadOverview() {
  activeFilters = null;

  const data = await fetchBilling(service, "monthly");
  updateSummaryAndChart(data, "period");
  loadTable({ service, entryType: "monthly" });
}

async function applyFilters() {
  const filters = { service };

  if (filterSku().value) filters.sku = filterSku().value;
  if (filterResource().value) filters.resourceType = filterResource().value;

  const mode = document.getElementById("filterMode").value;
  if (mode === "daily") {
    filters.entryType = "daily";
    if (filterDate().value) {
      filters.date = filterDate().value;
    }
  } else {
    filters.entryType = "monthly";
    if (filterMonth().value) {
      filters.month = filterMonth().value;
    }
  }

  activeFilters = filters;

  const rows = await fetchRaw(filters);

  const aggregated = aggregateRows(rows, mode);
  updateSummaryAndChart(aggregated, "period");
  renderTable(rows);
}

function clearFilters() {
  filterSku().value = "";
  filterResource().value = "";
  filterDate().value = "";
  filterMonth().value = "";
  document.getElementById("filterMode").value = "monthly";

  filterDate().style.display = "none";
  filterMonth().style.display = "block";

  loadOverview();
}

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

  const labels = data.map(d => d[labelKey]);
  const prices = data.map(d => d.price);
  const discountedPrices = data.map(d => d.discountedPrice);
  const usageData = data.map(d => d.usage);

  drawChart(labels, prices, discountedPrices, usageData);
}

function drawChart(labels, prices, discountedPrices, usageData) {
  const ctx = document.getElementById("trendChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Original Price (₹)",
          data: prices,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#ef4444",
          pointBorderColor: "#fff",
          pointBorderWidth: 2
        },
        {
          label: "Discounted Price (₹)",
          data: discountedPrices,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#fff",
          pointBorderWidth: 2
        },
        {
          label: "Usage",
          data: usageData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#cbd5e1',
            font: {
              size: 12,
              weight: '500'
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(2, 6, 23, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(59, 130, 246, 0.5)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (label.includes('Price')) {
                  label += '₹' + context.parsed.y.toFixed(2);
                } else {
                  label += context.parsed.y.toFixed(2);
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(59, 130, 246, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 11
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(59, 130, 246, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 11
            },
            callback: function(value) {
              return '₹' + value.toFixed(0);
            }
          },
          title: {
            display: true,
            text: 'Price (₹)',
            color: '#cbd5e1',
            font: {
              size: 12,
              weight: '600'
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 11
            }
          },
          title: {
            display: true,
            text: 'Usage',
            color: '#cbd5e1',
            font: {
              size: 12,
              weight: '600'
            }
          }
        }
      }
    }
  });
}

async function loadTable(query = { service }) {
  const qs = new URLSearchParams(query).toString();
  const rows = await fetch(`/api/billing/raw?${qs}`).then(r => r.json());
  renderTable(rows);
}

function renderTable(rows) {
  const tbody = document.querySelector("#billingTable tbody");
  tbody.innerHTML = "";

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 32px; color: #64748b;">
          No billing records found
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    let discountPercent = 0;

    if (r.price > 0) {
      discountPercent =
        ((r.price - r.discountedPrice) / r.price) * 100;
    }

    const dateObj = new Date(r.date);
    let dateDisplay;

    if (r.entryType === "monthly") {
      dateDisplay = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } else {
      dateDisplay = dateObj.toLocaleDateString();
    }

    tbody.innerHTML += `
      <tr>
        <td>${dateDisplay}</td>
        <td>${r.resourceType}</td>
        <td>${r.sku}</td>
        <td>${r.usage.toFixed(2)}</td>
        <td>₹${r.price.toFixed(2)}</td>
        <td>₹${r.discountedPrice.toFixed(2)}</td>
        <td>${discountPercent.toFixed(2)}%</td>
      </tr>
    `;
  });
}

document.getElementById("filterMode").addEventListener("change", () => {
  const mode = document.getElementById("filterMode").value;
  filterDate().style.display = mode === "daily" ? "block" : "none";
  filterMonth().style.display = mode === "monthly" ? "block" : "none";
});

const usageEl = () => document.getElementById("usage");
const priceEl = () => document.getElementById("price");
const discountEl = () => document.getElementById("discount");

const filterSku = () => document.getElementById("filterSku");
const filterResource = () => document.getElementById("filterResource");
const filterDate = () => document.getElementById("filterDate");
const filterMonth = () => document.getElementById("filterMonth");

loadOverview();
