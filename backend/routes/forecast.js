const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const { forecastDemand, toDateStr } = require('../ml/demandForecast');

function groupDailyDemand(sales) {
  const map = new Map();
  for (const s of sales) {
    const key = toDateStr(s.date);
    map.set(key, (map.get(key) || 0) + s.quantity);
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const n = 60;
  // pad a full calendar window so the chart axis is continuous
  const out = [];
  for (let d = n; d >= 1; d--) {
    const date = new Date(start.getTime() - d * 86400000);
    const key = toDateStr(date);
    out.push({ date: key, units: map.get(key) || 0 });
  }
  out.push({ date: toDateStr(start), units: map.get(toDateStr(start)) || 0 });
  return out;
}

// Reorder recommendations across the catalogue (batch)
router.get('/recommendations', auth(), async (req, res) => {
  try {
    const products = await Product.find();
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const allSales = await Sale.find({ date: { $gte: since } }).select('product quantity date');

    const byProduct = new Map();
    for (const s of allSales) {
      if (!byProduct.has(s.product.toString())) byProduct.set(s.product.toString(), []);
      byProduct.get(s.product.toString()).push(s);
    }

    const out = products.map((product) => {
      const sales = byProduct.get(product._id.toString()) || [];
      const history = groupDailyDemand(sales);
      const result = forecastDemand(history, {
        horizon: Number(req.query.horizon) || 14,
        productId: product._id,
        stockLevel: product.stockLevel,
        reorderPoint: product.reorderPoint,
        leadTimeDays: product.leadTimeDays,
        safetyDays: product.safetyDays,
      });
      return {
        product: { _id: product._id, sku: product.sku, name: product.name, category: product.category, unit: product.unit },
        stock: result.stock,
        avgDailyDemand: result.avgDailyDemand,
        algorithm: result.algorithm,
        recommendation: result.recommendation,
      };
    });

    const rank = { OUT_OF_STOCK: 0, LOW: 1, OK: 2 };
    out.sort((a, b) => rank[a.recommendation.status] - rank[b.recommendation.status]);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demand forecast for a single product
router.get('/:productId', auth(), async (req, res) => {
  try {
    const { horizon = 14 } = req.query;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sales = await Sale.find({ product: product._id, date: { $gte: since } }).select('quantity date');
    const history = groupDailyDemand(sales);

    const result = forecastDemand(history, {
      horizon: Number(horizon) || 14,
      productId: product._id,
      stockLevel: product.stockLevel,
      reorderPoint: product.reorderPoint,
      leadTimeDays: product.leadTimeDays,
      safetyDays: product.safetyDays,
    });
    res.json({ product, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;