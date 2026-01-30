const express = require("express");
const Billing = require("../models/BillingRecord");
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

  const records = await Billing.find(query).sort({ date: 1 });

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

module.exports = router;
