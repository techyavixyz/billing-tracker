const service = new URLSearchParams(location.search).get("service");
document.getElementById("service").innerText = service.toUpperCase();

let costChart;
let usageChart;
let activeFilters = null;
let currentCostChartType = "line";
let currentUsageChartType = "bar";
let currentChartData = null;

const RESOURCE_COLORS = [
  { bg: "rgba(59, 130, 246, 0.8)", border: "#3b82f6" },
  { bg: "rgba(16, 185, 129, 0.8)", border: "#10b981" },
  { bg: "rgba(251, 191, 36, 0.8)", border: "#fbbf24" },
  { bg: "rgba(239, 68, 68, 0.8)", border: "#ef4444" },
  { bg: "rgba(168, 85, 247, 0.8)", border: "#a855f7" },
  { bg: "rgba(236, 72, 153, 0.8)", border: "#ec4899" },
  { bg: "rgba(14, 165, 233, 0.8)", border: "#0ea5e9" },
  { bg: "rgba(34, 197, 94, 0.8)", border: "#22c55e" },
  { bg: "rgba(249, 115, 22, 0.8)", border: "#f97316" },
  { bg: "rgba(99, 102, 241, 0.8)", border: "#6366f1" }
];

async function loadOverview() {
  activeFilters = null;

  const data = await fetchBilling(service, "monthly");
  document.getElementById("filterStatus").innerHTML = '<span style="color: #60a5fa;">Monthly view - All data</span>';

  const rows = await fetchRaw({ service, entryType: "monthly" });
  updateSummaryAndCharts(rows, "monthly");
  loadTable({ service, entryType: "monthly" });
}

async function applyFilters() {
  const filters = { service };

  const resourceVal = filterResource().value.trim();
  const skuVal = filterSku().value.trim();
  const startDateVal = filterStartDate().value.trim();
  const endDateVal = filterEndDate().value.trim();

  if (resourceVal) filters.resourceType = resourceVal;
  if (skuVal) filters.sku = skuVal;

  const mode = document.getElementById("filterMode").value;
  filters.entryType = mode;

  if (mode === "daily") {
    if (filterDate().value) {
      filters.date = filterDate().value;
    }
  } else {
    if (filterMonth().value) {
      filters.month = filterMonth().value;
    }
  }

  activeFilters = filters;

  let rows = await fetchRaw(filters);

  if (startDateVal || endDateVal) {
    rows = rows.filter(r => {
      const rowDate = new Date(r.date);
      if (startDateVal && rowDate < new Date(startDateVal)) return false;
      if (endDateVal) {
        const endDate = new Date(endDateVal);
        endDate.setHours(23, 59, 59, 999);
        if (rowDate > endDate) return false;
      }
      return true;
    });
  }

  if (rows.length === 0) {
    document.getElementById("filterStatus").innerHTML = `<span style="color: #f97316;">No data found for selected filters</span>`;
    updateSummaryAndCharts([], mode);
    renderTable([]);
    return;
  }

  let statusMsg = `Chart showing <strong>${mode}</strong> view`;
  const filterParts = [];
  if (resourceVal) filterParts.push(`Resource: ${resourceVal}`);
  if (skuVal) filterParts.push(`SKU: ${skuVal}`);
  if (startDateVal) filterParts.push(`From: ${startDateVal}`);
  if (endDateVal) filterParts.push(`To: ${endDateVal}`);

  if (filterParts.length > 0) {
    statusMsg += ` - Filtered by: ${filterParts.join(", ")}`;
  }
  statusMsg += ` - Records: ${rows.length}`;

  document.getElementById("filterStatus").innerHTML = `<span style="color: #10b981;">${statusMsg}</span>`;

  updateSummaryAndCharts(rows, mode);
  renderTable(rows);
}

function clearFilters() {
  filterSku().value = "";
  filterResource().value = "";
  filterDate().value = "";
  filterMonth().value = "";
  filterStartDate().value = "";
  filterEndDate().value = "";
  document.getElementById("filterMode").value = "monthly";

  filterDate().style.display = "none";
  filterMonth().style.display = "block";

  document.getElementById("filterStatus").innerHTML = "";

  loadOverview();
}

function updateSummaryAndCharts(rows, mode) {
  let usage = 0, price = 0, discount = 0;

  rows.forEach(r => {
    usage += r.usage;
    price += r.price;
    discount += r.discountedPrice;
  });

  usageEl().innerText = usage.toFixed(2);
  priceEl().innerText = price.toFixed(2);
  discountEl().innerText = discount.toFixed(2);

  const costData = aggregateCostData(rows, mode);
  const usageData = aggregateUsageByResource(rows, mode);

  currentChartData = { costData, usageData, mode };

  drawCostChart(costData, mode, currentCostChartType);
  drawUsageChart(usageData, mode, currentUsageChartType);
}

function aggregateCostData(rows, mode) {
  const map = {};

  rows.forEach(r => {
    const key = mode === "daily"
      ? new Date(r.date).toISOString().slice(0, 10)
      : new Date(r.date).toISOString().slice(0, 7);

    if (!map[key]) {
      map[key] = { period: key, price: 0, discountedPrice: 0 };
    }

    map[key].price += r.price;
    map[key].discountedPrice += r.discountedPrice;
  });

  return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
}

function aggregateUsageByResource(rows, mode) {
  const map = {};
  const resources = new Set();

  rows.forEach(r => {
    resources.add(r.resourceType);

    const key = mode === "daily"
      ? new Date(r.date).toISOString().slice(0, 10)
      : new Date(r.date).toISOString().slice(0, 7);

    if (!map[key]) {
      map[key] = { period: key };
    }

    if (!map[key][r.resourceType]) {
      map[key][r.resourceType] = 0;
    }

    map[key][r.resourceType] += r.usage;
  });

  const periods = Object.values(map).sort((a, b) => a.period.localeCompare(b.period));

  return {
    periods,
    resources: Array.from(resources).sort()
  };
}

function drawCostChart(data, mode = "monthly", chartType = "line") {
  const ctx = document.getElementById("costChart");

  if (costChart) costChart.destroy();

  const timeframeText = mode === "daily" ? "Daily" : "Monthly";
  const labels = data.map(d => d.period);
  const prices = data.map(d => d.price);
  const discountedPrices = data.map(d => d.discountedPrice);

  let datasets, options;

  if (chartType === "bar") {
    datasets = [
      {
        label: "Original Price",
        data: prices,
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "#ef4444",
        borderWidth: 1
      },
      {
        label: "Discounted Price",
        data: discountedPrices,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "#3b82f6",
        borderWidth: 1
      }
    ];

    options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: `${timeframeText} Cost Trend`,
          color: '#f1f5f9',
          font: { size: 14, weight: '600' },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#cbd5e1',
            font: { size: 12, weight: '500' },
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
              return context.dataset.label + ': ₹' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(59, 130, 246, 0.1)', drawBorder: false },
          ticks: { color: '#94a3b8', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(59, 130, 246, 0.1)', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: function(value) {
              return '₹' + value.toFixed(0);
            }
          },
          title: {
            display: true,
            text: 'Price',
            color: '#cbd5e1',
            font: { size: 12, weight: '600' }
          }
        }
      }
    };
  } else {
    datasets = [
      {
        label: "Original Price",
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
        label: "Discounted Price",
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
      }
    ];

    options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: `${timeframeText} Cost Trend`,
          color: '#f1f5f9',
          font: { size: 14, weight: '600' },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#cbd5e1',
            font: { size: 12, weight: '500' },
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
              return context.dataset.label + ': ₹' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(59, 130, 246, 0.1)', drawBorder: false },
          ticks: { color: '#94a3b8', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(59, 130, 246, 0.1)', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: function(value) {
              return '₹' + value.toFixed(0);
            }
          },
          title: {
            display: true,
            text: 'Price',
            color: '#cbd5e1',
            font: { size: 12, weight: '600' }
          }
        }
      }
    };
  }

  costChart = new Chart(ctx, {
    type: chartType === "bar" ? "bar" : "line",
    data: { labels, datasets },
    options
  });
}

function drawUsageChart(data, mode = "monthly", chartType = "bar") {
  const ctx = document.getElementById("usageChart");

  if (usageChart) usageChart.destroy();

  const timeframeText = mode === "daily" ? "Daily" : "Monthly";
  const labels = data.periods.map(d => d.period);

  const datasets = data.resources.map((resource, index) => {
    const colorIndex = index % RESOURCE_COLORS.length;
    const color = RESOURCE_COLORS[colorIndex];

    return {
      label: resource,
      data: data.periods.map(p => p[resource] || 0),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: chartType === "bar" ? 1 : 2,
      tension: 0.4,
      fill: chartType === "line",
      pointRadius: chartType === "line" ? 4 : 0,
      pointHoverRadius: chartType === "line" ? 6 : 0,
      pointBackgroundColor: color.border,
      pointBorderColor: "#fff",
      pointBorderWidth: 2
    };
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: `${timeframeText} Resource Usage Consumption`,
        color: '#f1f5f9',
        font: { size: 14, weight: '600' },
        padding: { top: 10, bottom: 20 }
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#cbd5e1',
          font: { size: 12, weight: '500' },
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
            return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
          }
        }
      }
    },
    scales: {
      x: {
        stacked: chartType === "bar",
        grid: { color: 'rgba(59, 130, 246, 0.1)', drawBorder: false },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        stacked: chartType === "bar",
        grid: { color: 'rgba(59, 130, 246, 0.1)', drawBorder: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 }
        },
        title: {
          display: true,
          text: 'Usage',
          color: '#cbd5e1',
          font: { size: 12, weight: '600' }
        }
      }
    }
  };

  usageChart = new Chart(ctx, {
    type: chartType === "bar" ? "bar" : "line",
    data: { labels, datasets },
    options
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
      discountPercent = ((r.price - r.discountedPrice) / r.price) * 100;
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
  const dateContainer = document.getElementById("dateFilterContainer");
  const monthContainer = document.getElementById("monthFilterContainer");

  if (mode === "daily") {
    dateContainer.style.display = "block";
    monthContainer.style.display = "none";
    filterDate().style.display = "block";
    filterMonth().style.display = "none";
    filterDate().value = "";
    filterMonth().value = "";
  } else {
    dateContainer.style.display = "none";
    monthContainer.style.display = "block";
    filterDate().style.display = "none";
    filterMonth().style.display = "block";
    filterDate().value = "";
    filterMonth().value = "";
  }

  document.getElementById("filterStatus").innerHTML = `<span style="color: #60a5fa;">Changed to ${mode === "daily" ? "Daily" : "Monthly"} view - Chart time frame updated</span>`;
});

const usageEl = () => document.getElementById("usage");
const priceEl = () => document.getElementById("price");
const discountEl = () => document.getElementById("discount");

const filterSku = () => document.getElementById("filterSku");
const filterResource = () => document.getElementById("filterResource");
const filterDate = () => document.getElementById("filterDate");
const filterMonth = () => document.getElementById("filterMonth");
const filterStartDate = () => document.getElementById("filterStartDate");
const filterEndDate = () => document.getElementById("filterEndDate");

function exportCSV() {
  const filters = buildExportFilters();
  const params = new URLSearchParams(filters).toString();
  window.location.href = `/api/billing/export-csv?${params}`;
}

function exportExcel() {
  const filters = buildExportFilters();
  const params = new URLSearchParams(filters).toString();
  window.location.href = `/api/billing/export-excel?${params}`;
}

function buildExportFilters() {
  const filters = { service };

  if (activeFilters) {
    Object.assign(filters, activeFilters);
  }

  const startDateVal = filterStartDate().value.trim();
  const endDateVal = filterEndDate().value.trim();

  if (startDateVal) filters.startDate = startDateVal;
  if (endDateVal) filters.endDate = endDateVal;

  return filters;
}

document.getElementById("costChartTypeSelector").addEventListener("change", () => {
  currentCostChartType = document.getElementById("costChartTypeSelector").value;
  if (currentChartData) {
    drawCostChart(currentChartData.costData, currentChartData.mode, currentCostChartType);
  }
});

document.getElementById("usageChartTypeSelector").addEventListener("change", () => {
  currentUsageChartType = document.getElementById("usageChartTypeSelector").value;
  if (currentChartData) {
    drawUsageChart(currentChartData.usageData, currentChartData.mode, currentUsageChartType);
  }
});

loadOverview();
