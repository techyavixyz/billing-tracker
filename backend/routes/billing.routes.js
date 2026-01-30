const express = require("express");
const Billing = require("../models/BillingRecord");
const router = express.Router();

/**
 * ADD BILLING DATA (DEDICATED ENDPOINT)
 */
router.post("/add", async (req, res) => {
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

  let finalDate;

  if (type === "daily") {
    finalDate = new Date(date);
  } else if (type === "monthly") {
    finalDate = new Date(`${month}-01`);
  } else {
    return res.status(400).json({ error: "Invalid type" });
  }

  const discountedPrice = price - (price * discountPercent) / 100;

  const record = await Billing.create({
    service,
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
  const { service, sku, resourceType, date, month } = req.query;
  const query = { service };

  if (sku) query.sku = sku;
  if (resourceType) query.resourceType = resourceType;

  if (date) {
    const d = new Date(date);
    query.date = { $gte: d, $lt: new Date(d.setDate(d.getDate() + 1)) };
  }

  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    query.date = { $gte: start, $lt: end };
  }

  res.json(await Billing.find(query).sort({ date: 1 }));
});

module.exports = router;
