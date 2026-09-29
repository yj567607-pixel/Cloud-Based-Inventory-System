const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const { toDateStr } = require('../ml/demandForecast');

router.get('/', auth(), async (req, res) => {
  try {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(startToday.getTime() - 7 * 86400000);
    const [products, todaySales, weekSales, lowCount] = await Promise.all([
      Product.find(),
      Sale.find({ date: { $gte: startToday } }).populate('product', 'name sku'),
      Sale.find({ date: { $gte: weekAgo } }).populate('product', 'name category price'),
      Product.countDocuments({ $expr: { $lte: ['$stockLevel', '$reorderPoint'] } }),
    ]);

    const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
    const totalStockValue = products.reduce((s, p) => s + p.stockLevel * p.cost, 0);

    // last 14 days revenue by day
    const revenueByDay = new Map();
    for (let d = 13; d >= 0; d--) {
      revenueByDay.set(toDateStr(new Date(startToday.getTime() - d * 86400000)), 0);
    }
    weekSales.forEach((s) => {
      const key = toDateStr(s.date);
      if (revenueByDay.has(key)) revenueByDay.set(key, revenueByDay.get(key) + s.total);
    });
    const salesByDay = [...revenueByDay.entries()].map(([date, revenue]) => ({ date, revenue: +revenue.toFixed(2) }));

    // category distribution by stock value
    const catMap = new Map();
    products.forEach((p) => {
      const key = p.category;
      catMap.set(key, (catMap.get(key) || 0) + p.stockLevel * p.cost);
    });
    const categoryDistribution = [...catMap.entries()].map(([name, value]) => ({ name, value: +value.toFixed(2) }));

    // top products by units sold (last 7 days)
    const unitsByProduct = new Map();
    weekSales.forEach((s) => {
      const key = s.product?._id?.toString() || 'unknown';
      const label = s.product?.name || 'Unknown';
      if (!unitsByProduct.has(key)) unitsByProduct.set(key, { name: label, units: 0, revenue: 0 });
      unitsByProduct.get(key).units += s.quantity;
      unitsByProduct.get(key).revenue += s.total;
    });
    const topProducts = [...unitsByProduct.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 6)
      .map((p) => ({ ...p, revenue: +p.revenue.toFixed(2) }));

    res.json({
      totalProducts: products.length,
      totalStockUnits: products.reduce((s, p) => s + p.stockLevel, 0),
      totalStockValue: +totalStockValue.toFixed(2),
      lowStockCount: lowCount,
      todaysSales: { orders: todaySales.length, revenue: +todayRevenue.toFixed(2) },
      recentSales: weekSales.sort((a, b) => b.date - a.date).slice(0, 8),
      salesByDay,
      categoryDistribution,
      topProducts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;