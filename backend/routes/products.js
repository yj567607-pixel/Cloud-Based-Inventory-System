const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');

router.get('/', auth(), async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [{ name: rx }, { sku: rx }];
    }
    if (category) filter.category = category;
    const products = await Product.find(filter).sort({ category: 1, name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', auth(), async (req, res) => {
  try {
    const cats = await Product.distinct('category');
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth(['admin', 'manager']), async (req, res) => {
  try {
    const { sku, name, category, price, cost, unit, stockLevel, reorderPoint, leadTimeDays, safetyDays } = req.body;
    if (!sku || !name || !category || price == null) {
      return res.status(400).json({ error: 'sku, name, category and price are required' });
    }
    if (await Product.findOne({ sku: String(sku).toUpperCase() })) {
      return res.status(409).json({ error: `SKU ${sku} already exists` });
    }
    const product = await Product.create({
      sku: String(sku).toUpperCase(), name, category,
      price, cost: cost || 0, unit, stockLevel: stockLevel || 0,
      reorderPoint: reorderPoint ?? 5, leadTimeDays: leadTimeDays ?? 5, safetyDays: safetyDays ?? 3,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth(['admin', 'manager']), async (req, res) => {
  try {
    const updates = req.body;
    if (updates.sku) updates.sku = String(updates.sku).toUpperCase();
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;