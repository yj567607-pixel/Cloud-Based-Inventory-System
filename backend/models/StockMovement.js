const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, required: true, enum: ['in', 'out', 'adjust'] },
  quantity: { type: Number, required: true },
  note: String,
  date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('StockMovement', stockMovementSchema);