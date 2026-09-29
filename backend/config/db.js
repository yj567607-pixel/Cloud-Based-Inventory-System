const mongoose = require('mongoose');
const { seed } = require('../seed/seed');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/retail_inventory';

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected:', mongoose.connection.host, '| DB:', mongoose.connection.name);
  await seed();
}

module.exports = { connectDB };