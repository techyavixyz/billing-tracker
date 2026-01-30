const express = require("express");
const router = express.Router();

function convertToHours(value, unit) {
  switch (unit) {
    case "seconds":
      return value / 3600;
    case "minutes":
      return value / 60;
    case "hours":
    default:
      return value;
  }
}

router.post("/calculate", (req, res) => {
  const { cpuUsage, ramUsage, durationValue, durationUnit } = req.body;

  const durationHours = convertToHours(durationValue, durationUnit);

  if (!durationHours || durationHours <= 0) {
    return res.status(400).json({ error: "Invalid duration" });
  }

  const avgCPU = cpuUsage / durationHours;
  const avgRAM = ramUsage / durationHours;



  res.json({
    durationHours: durationHours.toFixed(2),
    averageCPU: avgCPU.toFixed(2),
    averageRAM: avgRAM.toFixed(2),

  });
});

module.exports = router;
