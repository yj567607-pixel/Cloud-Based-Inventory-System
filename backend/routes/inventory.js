const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Inventory overview: every product with low-stock flag
router.get('/', auth(), async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, name: 1 });
    const enriched = products.map((p) => ({
      ...p.toObject(),
      lowStock: p.stockLevel <= p.reorderPoint,
      stockValue: +(p.stockLevel * p.cost).toFixed(2),
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Low-stock products (drives alert banners + reorder suggestions)
router.get('/low', auth(), async (req, res) => {
  try {
    const products = await Product.find({ $expr: { $lte: ['$stockLevel', '$reorderPoint'] } }).sort({ category: 1, name: 1 });
    res.json(products.map((p) => ({ ...p.toObject(), stockValue: +(p.stockLevel * p.cost).toFixed(2) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Movement history
router.get('/movements', auth(), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const movements = await StockMovement.find()
      .populate('product', 'name sku category')
      .sort({ date: -1 })
      .limit(Number(limit));
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Receive stock
router.post('/restock', auth(['admin', 'manager']), async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;
    const qty = Number(quantity);
    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Valid productId and positive integer quantity are required' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.stockLevel += qty;
    await product.save();
    await StockMovement.create({ product: productId, type: 'in', quantity: qty, note: note || 'Stock received' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock adjustment (signed): positive adds, negative removes
router.post('/adjust', auth(['admin', 'manager']), async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;
    const qty = Number(quantity);
    if (!productId || !Number.isInteger(qty) || qty === 0) {
      return res.status(400).json({ error: 'Valid productId and non-zero integer quantity are required' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stockLevel + qty < 0) {
      return res.status(400).json({ error: 'Adjustment would make stock negative' });
    }
    product.stockLevel += qty;
    await product.save();
    await StockMovement.create({ product: productId, type: 'adjust', quantity: qty, note: note || 'Manual adjustment' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;