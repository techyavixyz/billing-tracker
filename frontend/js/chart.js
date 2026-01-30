function drawChart(data) {
    const ctx = document.getElementById("chart").getContext("2d");
  
    const labels = data.map(d => new Date(d.date).toLocaleDateString());
    const prices = data.map(d => d.discountedPrice);
  
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Cost Trend",
          data: prices,
          borderColor: "#3b82f6"
        }]
      }
    });
  }
  