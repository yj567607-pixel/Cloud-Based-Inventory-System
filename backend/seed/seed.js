const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');

// Deterministic RNG for reproducible seed data
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seed() {
  if ((await User.countDocuments()) > 0) return;

  const rand = mulberry32(20260914);
  const pass = bcrypt.hashSync('admin123', 10);

  await User.insertMany([
    { name: 'Admin', email: 'admin@retail.com', password: pass, role: 'admin' },
    { name: 'Store Manager', email: 'manager@retail.com', password: pass, role: 'manager' },
    { name: 'Staff', email: 'staff@retail.com', password: pass, role: 'staff' },
  ]);

  const productDefs = [
    { sku: 'ELEC-001', name: 'Wireless Mouse', category: 'Electronics', price: 24.99, cost: 12, base: 4, reorderPoint: 20, stock: 12, lead: 7, safety: 3 },
    { sku: 'ELEC-002', name: 'Mechanical Keyboard', category: 'Electronics', price: 89.99, cost: 48, base: 6, reorderPoint: 25, stock: 34, lead: 10, safety: 4 },
    { sku: 'ELEC-003', name: 'HDMI Cable 2m', category: 'Electronics', price: 12.99, cost: 5, base: 8, reorderPoint: 30, stock: 52, lead: 5, safety: 2 },
    { sku: 'APP-001', name: 'Cotton T-Shirt (M)', category: 'Apparel', price: 19.99, cost: 7, base: 10, reorderPoint: 40, stock: 63, lead: 8, safety: 4 },
    { sku: 'APP-002', name: 'Denim Jeans', category: 'Apparel', price: 49.99, cost: 22, base: 5, reorderPoint: 20, stock: 28, lead: 12, safety: 5 },
    { sku: 'FOOT-001', name: 'Running Shoes', category: 'Footwear', price: 79.99, cost: 35, base: 4, reorderPoint: 15, stock: 7, lead: 15, safety: 5 },
    { sku: 'GROC-001', name: 'Instant Coffee 200g', category: 'Grocery', price: 8.99, cost: 4, base: 12, reorderPoint: 50, stock: 46, lead: 4, safety: 2 },
    { sku: 'GROC-002', name: 'Rice 5kg', category: 'Grocery', price: 14.99, cost: 8, base: 9, reorderPoint: 35, stock: 58, lead: 6, safety: 3 },
    { sku: 'GROC-003', name: 'Mineral Water 1L (pack of 6)', category: 'Grocery', price: 3.49, cost: 1.4, base: 20, reorderPoint: 80, stock: 92, lead: 3, safety: 1 },
    { sku: 'HOME-001', name: 'LED Bulb 9W', category: 'Home', price: 6.99, cost: 3, base: 7, reorderPoint: 30, stock: 41, lead: 5, safety: 2 },
    { sku: 'HOME-002', name: 'Dish Soap 750ml', category: 'Home', price: 3.49, cost: 1.2, base: 11, reorderPoint: 40, stock: 47, lead: 4, safety: 2 },
    { sku: 'HOME-003', name: 'Blender 1.5L', category: 'Home', price: 39.99, cost: 18, base: 2, reorderPoint: 8, stock: 3, lead: 14, safety: 6 },
  ];

  const customers = ['Walk-in Customer', 'Nikhil S.', 'Anita R.', 'Rahul V.', 'Priya M.', 'Amit K.', 'Sara D.'];
  const days = 60;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const products = await Product.insertMany(
    productDefs.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stockLevel: p.stock,
      reorderPoint: p.reorderPoint,
      leadTimeDays: p.lead,
      safetyDays: p.safety,
    }))
  );

  const sales = [];
  const movements = [];
  const weekdayUplift = [1.0, 1.0, 1.05, 1.1, 1.2, 1.35, 1.15]; // Sun..Sat

  products.forEach((product, idx) => {
    const def = productDefs[idx];
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(today.getTime() - d * 86400000);
      const dow = date.getDay();
      const trend = def.base * 0.004 * (days - d);           // gentle growth over time
      const weekly = def.base * (weekdayUplift[dow] - 1);     // weekend bump
      const noise = (rand() - 0.5) * def.base * 0.9;          // random noise
      const qty = Math.max(0, Math.round(def.base + trend + weekly + noise));
      if (qty === 0) continue;
      const count = qty > 25 ? 3 : qty > 12 ? 2 : 1;          // split big days into a few orders
      for (let k = 0; k < count; k++) {
        const part = Math.max(1, Math.round(qty / count));
        const saleDate = new Date(date.getTime() + rand() * 10 * 3600000);
        sales.push({
          product: product._id,
          quantity: part,
          unitPrice: product.price,
          total: +(product.price * part).toFixed(2),
          customerName: customers[Math.floor(rand() * customers.length)],
          date: saleDate,
        });
      }
    }
    // a restock movement ~10 days ago for history
    movements.push({
      product: product._id,
      type: 'in',
      quantity: def.stock,
      note: 'Initial stock / warehouse replenishment',
      date: new Date(today.getTime() - 10 * 86400000),
    });
  });

  await Sale.insertMany(sales);
  await StockMovement.insertMany(movements);
  console.log(`Seeded: ${products.length} products, ${sales.length} sales records (${days} days), ${movements.length} stock movements.`);
}

module.exports = { seed };