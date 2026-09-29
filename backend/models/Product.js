const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  unit: { type: String, default: 'pcs' },
  stockLevel: { type: Number, default: 0 },
  reorderPoint: { type: Number, default: 5 },
  // supply lead time (days) + safety stock (days) used by the reorder engine
  leadTimeDays: { type: Number, default: 5 },
  safetyDays: { type: Number, default: 3 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Product', productSchema);