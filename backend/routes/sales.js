const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

router.get('/', auth(), async (req, res) => {
  try {
    const { from, to, productId, limit = 200 } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (productId) filter.product = productId;
    const sales = await Sale.find(filter)
      .populate('product', 'name sku category price')
      .sort({ date: -1 })
      .limit(Number(limit));
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth(['admin', 'manager', 'staff']), async (req, res) => {
  try {
    const { productId, quantity, customerName } = req.body;
    const qty = Number(quantity);
    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Valid productId and positive integer quantity are required' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stockLevel < qty) {
      return res.status(400).json({ error: `Insufficient stock. Only ${product.stockLevel} ${product.unit} available` });
    }

    product.stockLevel -= qty;
    await product.save();

    const sale = await Sale.create({
      product: productId,
      quantity: qty,
      unitPrice: product.price,
      total: +(product.price * qty).toFixed(2),
      customerName: customerName || 'Walk-in Customer',
    });
    await StockMovement.create({ product: productId, type: 'out', quantity: -qty, note: `Sale of ${qty} units` });

    res.status(201).json({ sale, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;