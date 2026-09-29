/**
 * Demand Forecasting engine (ML).
 *
 * Pipeline:
 *  1. TREND     - Polynomial regression (ml-regression) fits daily demand vs. time.
 *  2. SEASONAL  - Multiplicative weekday factors derived from the historical residuals.
 *  3. FORECAST  - Combines trend prediction x weekday factor for the next N days.
 *  4. RECOMMEND - Reorder quantity from projected demand over (lead + safety) days.
 */
const { PolynomialRegression } = require('ml-regression');

const DAY = 86400000;

const toDateStr = (d) => {
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function r2Score(y, yPred) {
  const yMean = mean(y);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  return ssTot === 0 ? 1 : +(1 - ssRes / ssTot).toFixed(4);
}

/**
 * @param {Array<{date: Date|string, units: number}>} history - chronological daily demand
 * @param {object} opts { horizon, stockLevel, reorderPoint, leadTimeDays, safetyDays }
 */
function forecastDemand(history, opts = {}) {
  const horizon = opts.horizon || 14;
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!sorted.length) return { error: 'No sales history available for forecasting', forecast: [] };

  const n = sorted.length;
  const x = sorted.map((_, i) => i);
  const y = sorted.map((s) => s.units);
  const avgDailyDemand = +mean(y).toFixed(2);

  // ---- Model selection: polynomial regression (requires >= 3 points) ----
  let model = null;
  let r2 = null;
  let yPred = [];
  if (n >= 3) {
    const order = Math.min(3, n - 1);
    model = new PolynomialRegression(x, y, order);
    yPred = x.map((px) => model.predict(px));
    r2 = r2Score(y, yPred);
  }

  // ---- Weekday seasonality from residuals (predicted vs actual) ----
  const dowBuckets = Array.from({ length: 7 }, () => []);
  sorted.forEach((s, i) => {
    const ratio = n >= 3 && yPred[i] > 0 ? s.units / yPred[i] : 1;
    dowBuckets[new Date(s.date).getDay()].push(ratio);
  });
  const weekdayFactor = Array.from({ length: 7 }, (_, dow) => {
    const b = dowBuckets[dow];
    const wdMean = b.length ? mean(b) : 1;
    return +(Math.min(1.6, Math.max(0.5, wdMean))).toFixed(3);
  });

  // ---- Build history + forecast series for charts ----
  const lastDate = new Date(sorted[n - 1].date);
  const historyPoints = sorted.map((s, i) => ({ date: toDateStr(s.date), units: s.units, dayIndex: i, predicted: false }));
  const forecastPoints = [];
  for (let f = 1; f <= horizon; f++) {
    const day = new Date(lastDate.getTime() + f * DAY);
    const dow = day.getDay();
    let base;
    if (model) {
      base = model.predict(n - 1 + f);
    } else {
      base = avgDailyDemand;
    }
    const units = Math.max(0, Math.round(base * weekdayFactor[dow]));
    forecastPoints.push({ date: toDateStr(day), units, dayIndex: n - 1 + f, predicted: true });
  }

  const trendEnd = model ? model.predict(n - 1 + horizon) : avgDailyDemand;
  const trendStart = model ? model.predict(0) : avgDailyDemand;
  const growthPercent = trendStart > 0 ? +(((trendEnd - trendStart) / trendStart) * 100).toFixed(1) : 0;

  // ---- Reorder recommendation ----
  const stockLevel = opts.stockLevel ?? 0;
  const reorderPoint = opts.reorderPoint ?? 0;
  const leadTimeDays = opts.leadTimeDays ?? 5;
  const safetyDays = opts.safetyDays ?? 3;
  const coverDays = avgDailyDemand > 0 ? +(stockLevel / avgDailyDemand).toFixed(1) : Infinity;
  const horizonDemand = forecastPoints.reduce((s, p) => s + p.units, 0);
  const expectedDemandInLead = Math.ceil(avgDailyDemand * (leadTimeDays + safetyDays));
  const suggestedReorderQty = Math.max(0, expectedDemandInLead - stockLevel);
  const status = stockLevel <= 0 ? 'OUT_OF_STOCK' : stockLevel <= reorderPoint ? 'LOW' : 'OK';

  return {
    productId: opts.productId,
    model: model ? `Polynomial regression (degree ${model.degree ?? 'n/a'}) + weekday seasonality` : 'Moving average fallback',
    algorithm: model ? 'Polynomial Regression' : 'Moving Average',
    order: model ? model.degree : null,
    r2,
    avgDailyDemand,
    trend: { start: +trendStart.toFixed(2), end: +trendEnd.toFixed(2), growthPercent },
    history: historyPoints.slice(-40),
    forecast: forecastPoints,
    horizon,
    horizonDemand,
    stock: { level: stockLevel, reorderPoint, coverDays, leadTimeDays, safetyDays },
    recommendation: {
      status,
      expectedDemandInLead,
      suggestedReorderQty,
      daysUntilOutOfStock: coverDays === Infinity ? null : Math.floor(coverDays),
      nextReorderBy: !isFinite(coverDays) || coverDays >= horizon ? null : toDateStr(lastDate.getTime() + Math.floor(coverDays) * DAY),
    },
  };
}

module.exports = { forecastDemand, toDateStr };