const express = require("express");
const Billing = require("../models/BillingRecord");
const ExcelJS = require("exceljs");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const router = express.Router();

/**
 * ADD BILLING DATA (DEDICATED ENDPOINT)
 */
router.post("/add", async (req, res) => {
  try {
    const {
      service,
      resourceType,
      sku,
      usage,
      price,
      discountPercent,
      type,
      date,
      month
    } = req.body;

    if (!service || !resourceType || !sku || usage == null || price == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalDate;

    if (type === "daily") {
      if (!date) {
        return res.status(400).json({ error: "Date is required for daily entries" });
      }
      finalDate = new Date(date);
    } else if (type === "monthly") {
      if (!month) {
        return res.status(400).json({ error: "Month is required for monthly entries" });
      }
      finalDate = new Date(`${month}-01`);
    } else {
      return res.status(400).json({ error: "Invalid type. Must be 'daily' or 'monthly'" });
    }

    if (isNaN(finalDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const discountedPrice = price - (price * (discountPercent || 0)) / 100;

    const record = await Billing.create({
      service: service.toLowerCase(),
      resourceType,
      sku,
      usage,
      usageUnit: "unit",
      price,
      discountedPrice,
      date: finalDate,
      entryType: type
    });

    res.json(record);
  } catch (error) {
    console.error("Error adding billing record:", error);
    res.status(500).json({ error: "Failed to add billing record: " + error.message });
  }
});

/**
 * AGGREGATED SUMMARY (CARDS + TREND)
 */
router.get("/", async (req, res) => {
  const { service, range } = req.query;

  const groupId =
    range === "daily"
      ? { period: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } }
      : { period: { $dateToString: { format: "%Y-%m", date: "$date" } } };

  const data = await Billing.aggregate([
    { $match: { service } },
    {
      $group: {
        _id: groupId,
        usage: { $sum: "$usage" },
        price: { $sum: "$price" },
        discountedPrice: { $sum: "$discountedPrice" }
      }
    },
    {
      $project: {
        _id: 0,
        period: "$_id.period",
        usage: 1,
        price: 1,
        discountedPrice: 1
      }
    },
    { $sort: { period: 1 } }
  ]);

  res.json(data);
});

/**
 * RAW SAVED DATA (FILTERABLE)
 */
router.get("/raw", async (req, res) => {
  const { service, sku, resourceType, date, month, entryType } = req.query;
  const query = { service };

  if (sku) query.sku = sku;
  if (resourceType) query.resourceType = resourceType;
  if (entryType) query.entryType = entryType;

  if (date) {
    const d = new Date(date);
    query.date = { $gte: d, $lt: new Date(d.setDate(d.getDate() + 1)) };
    query.entryType = "daily";
  }

  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    query.date = { $gte: start, $lt: end };
    query.entryType = "monthly";
  }

  res.json(await Billing.find(query).sort({ date: 1 }));
});

router.get("/export-csv", async (req, res) => {
  const { service, sku, resourceType, date, month, entryType, startDate, endDate } = req.query;
  const query = { service };

  if (sku) query.sku = sku;
  if (resourceType) query.resourceType = resourceType;
  if (entryType) query.entryType = entryType;

  if (date) {
    const d = new Date(date);
    query.date = { $gte: d, $lt: new Date(d.setDate(d.getDate() + 1)) };
    query.entryType = "daily";
  }

  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    query.date = { $gte: start, $lt: end };
    query.entryType = "monthly";
  }

  let records = await Billing.find(query).sort({ date: 1 });

  if (startDate || endDate) {
    records = records.filter(r => {
      const rowDate = new Date(r.date);
      if (startDate && rowDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (rowDate > end) return false;
      }
      return true;
    });
  }

  const csvRows = [];
  csvRows.push("Date,Service,Resource Type,SKU,Usage,Price,Discounted Price,Discount %,Entry Type");

  records.forEach(r => {
    const discountPercent = r.price > 0 ? ((r.price - r.discountedPrice) / r.price) * 100 : 0;
    const dateObj = new Date(r.date);
    let dateDisplay;

    if (r.entryType === "monthly") {
      dateDisplay = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } else {
      dateDisplay = dateObj.toLocaleDateString();
    }

    csvRows.push([
      `"${dateDisplay}"`,
      `"${r.service}"`,
      `"${r.resourceType}"`,
      `"${r.sku}"`,
      r.usage.toFixed(2),
      r.price.toFixed(2),
      r.discountedPrice.toFixed(2),
      discountPercent.toFixed(2),
      `"${r.entryType}"`
    ].join(","));
  });

  const csv = csvRows.join("\n");
  const filename = `billing-${service}-${Date.now()}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get("/export-excel", async (req, res) => {
  try {
    const { service, sku, resourceType, date, month, entryType, startDate, endDate } = req.query;
    const query = { service };

    if (sku) query.sku = sku;
    if (resourceType) query.resourceType = resourceType;
    if (entryType) query.entryType = entryType;

    if (date) {
      const d = new Date(date);
      query.date = { $gte: d, $lt: new Date(d.setDate(d.getDate() + 1)) };
      query.entryType = "daily";
    }

    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      query.date = { $gte: start, $lt: end };
      query.entryType = "monthly";
    }

    let records = await Billing.find(query).sort({ date: 1 });

    if (startDate || endDate) {
      records = records.filter(r => {
        const rowDate = new Date(r.date);
        if (startDate && rowDate < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (rowDate > end) return false;
        }
        return true;
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Billing Data");

    worksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Service", key: "service", width: 15 },
      { header: "Resource Type", key: "resourceType", width: 20 },
      { header: "SKU", key: "sku", width: 25 },
      { header: "Usage", key: "usage", width: 15 },
      { header: "Price", key: "price", width: 15 },
      { header: "Discounted Price", key: "discountedPrice", width: 18 },
      { header: "Discount %", key: "discountPercent", width: 15 },
      { header: "Entry Type", key: "entryType", width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" }
    };

    records.forEach(r => {
      const discountPercent = r.price > 0 ? ((r.price - r.discountedPrice) / r.price) * 100 : 0;
      const dateObj = new Date(r.date);
      let dateDisplay;

      if (r.entryType === "monthly") {
        dateDisplay = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } else {
        dateDisplay = dateObj.toLocaleDateString();
      }

      worksheet.addRow({
        date: dateDisplay,
        service: r.service,
        resourceType: r.resourceType,
        sku: r.sku,
        usage: r.usage,
        price: r.price,
        discountedPrice: r.discountedPrice,
        discountPercent: discountPercent,
        entryType: r.entryType
      });
    });

    const costData = {};
    records.forEach(r => {
      const key = r.entryType === "daily"
        ? new Date(r.date).toISOString().slice(0, 10)
        : new Date(r.date).toISOString().slice(0, 7);

      if (!costData[key]) {
        costData[key] = { period: key, price: 0, discountedPrice: 0 };
      }
      costData[key].price += r.price;
      costData[key].discountedPrice += r.discountedPrice;
    });

    const sortedData = Object.values(costData).sort((a, b) => a.period.localeCompare(b.period));

    const chartWidth = 800;
    const chartHeight = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight });

    const chartConfig = {
      type: "line",
      data: {
        labels: sortedData.map(d => d.period),
        datasets: [
          {
            label: "Original Price",
            data: sortedData.map(d => d.price),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true
          },
          {
            label: "Discounted Price",
            data: sortedData.map(d => d.discountedPrice),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `${service.toUpperCase()} Cost Trend`,
            font: { size: 16 }
          },
          legend: {
            display: true,
            position: "top"
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Price (₹)"
            }
          },
          x: {
            title: {
              display: true,
              text: "Period"
            }
          }
        }
      }
    };

    const chartImage = await chartJSNodeCanvas.renderToBuffer(chartConfig);

    const chartSheet = workbook.addWorksheet("Cost Trend Chart");
    const imageId = workbook.addImage({
      buffer: chartImage,
      extension: "png"
    });

    chartSheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: chartWidth, height: chartHeight }
    });

    const filename = `billing-${service}-${Date.now()}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel export:", error);
    res.status(500).json({ error: "Failed to generate Excel export: " + error.message });
  }
});

module.exports = router;
