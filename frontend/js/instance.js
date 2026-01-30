async function calculate() {
    const cpuUsage = parseFloat(document.getElementById("cpuUsage").value);
    const ramUsage = parseFloat(document.getElementById("ramUsage").value);
    const durationValue = parseFloat(document.getElementById("durationValue").value);
    const durationUnit = document.getElementById("durationUnit").value;
  
    const res = await fetch("/api/instance/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpuUsage,
        ramUsage,
        durationValue,
        durationUnit
      })
    });
  
    const data = await res.json();
  
    document.getElementById("result").innerHTML = `
      <p><b>Converted Duration:</b> ${data.durationHours} hours</p>
      <p><b>Average vCPU running:</b> ${data.averageCPU}</p>
      <p><b>Average RAM running:</b> ${data.averageRAM} GiB</p>
      <p><b>Equivalent Nodes (CPU):</b> ${data.nodesByCPU}</p>
      <p><b>Equivalent Nodes (RAM):</b> ${data.nodesByRAM}</p>
    `;
  }
  