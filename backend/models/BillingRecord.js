const mongoose = require("mongoose");

const BillingRecordSchema = new mongoose.Schema({
  service: { type: String, required: true },
  resourceType: { type: String, required: true },
  sku: { type: String, required: true },
  usage: Number,
  usageUnit: String,
  price: Number,
  discountedPrice: Number,
  date: { type: Date, required: true },
  entryType: { type: String, enum: ['daily', 'monthly'], default: 'daily' }
});

module.exports = mongoose.model("BillingRecord", BillingRecordSchema);
