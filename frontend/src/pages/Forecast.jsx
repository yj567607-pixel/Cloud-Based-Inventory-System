import { useEffect, useState } from 'react';
import api from '../api';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

export default function Forecast() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [horizon, setHorizon] = useState(14);
  const [fc, setFc] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/products').then((r) => {
      setProducts(r.data);
      if (r.data.length) setProductId(r.data[0]._id);
    });
    loadRecs();
  }, []);

  const loadRecs = () => api.get('/forecast/recommendations').then((r) => setRecs(r.data)).catch(() => {});

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError('');
    api.get(`/forecast/${productId}`, { params: { horizon } })
      .then((r) => setFc(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Forecast failed'))
      .finally(() => setLoading(false));
  }, [productId, horizon]);

  if (!products.length) return <div className="card">No products. Add products first.</div>;

  const { product } = fc || {};
  const chartData = fc
    ? [...fc.history, ...fc.forecast].map((p) => ({
        date: p.date,
        actual: p.predicted ? null : p.units,
        forecast: p.predicted ? p.units : null,
      }))
    : [];

  const statusBadge = (s) => ({ OK: 'ok', LOW: 'low', OUT_OF_STOCK: 'out' })[s] || 'info';

  return (
    <div>
      <div className="toolbar">
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={horizon} onChange={(e) => setHorizon(+e.target.value)}>
          {[7, 14, 30].map((h) => <option key={h} value={h}>{h} day forecast</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={loadRecs}>↻ Refresh recommendations</button>
      </div>

      {error && <div className="card">{error}</div>}

      {fc && (
        <>
          <div className="card-row">
            <div className="card stat blue">
              <div className="label">Algorithm</div>
              <div className="value" style={{ fontSize: 18 }}>{fc.algorithm}</div>
              <div className="hint">{fc.model}{fc.r2 != null && ` · R² = ${fc.r2}`}</div>
            </div>
            <div className="card stat green">
              <div className="label">Avg Daily Demand</div>
              <div className="value">{fc.avgDailyDemand}</div>
              <div className="hint">Trend {fc.trend.growthPercent >= 0 ? '+' : ''}{fc.trend.growthPercent}% over horizon</div>
            </div>
            <div className="card stat amber">
              <div className="label">Forecast {horizon}d Demand</div>
              <div className="value">{fc.horizonDemand}</div>
              <div className="hint">Units expected over next {horizon} days</div>
            </div>
            <div className={`card stat ${fc.recommendation.status === 'OK' ? 'green' : 'danger'}`}>
              <div className="label">Recommendation</div>
              <div className="value" style={{ fontSize: 18 }}>{fc.recommendation.status.replace('_', ' ')}</div>
              <div className="hint">Reorder {fc.recommendation.suggestedReorderQty} {product?.unit || 'units'}</div>
            </div>
          </div>

          {product && (
            <div className="card forecast-chart-wrap">
              <h3>Historical demand vs forecast · {product.name} ({product.sku})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="#26314a" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: '#8b96ad', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8b96ad', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1d2639', border: '1px solid #26314a', borderRadius: 10 }} />
                  <Legend />
                  <Bar dataKey="actual" name="Actual demand" fill="#26314a" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="forecast" name="Forecast (predicted)" stroke="#38d39f" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="summary-chips" style={{ marginTop: 12 }}>
                <span className="chip">Stock on hand: <strong>{fc.stock.level}</strong> {product.unit}</span>
                <span className="chip">Coverage: <strong>{fc.stock.coverDays == null || !isFinite(fc.stock.coverDays) ? '∞' : fc.stock.coverDays}</strong> days</span>
                <span className="chip">Reorder point: <strong>{fc.stock.reorderPoint}</strong></span>
                {fc.recommendation.nextReorderBy && <span className="chip">Projected out of stock: <strong className="muted">{fc.recommendation.nextReorderBy}</strong></span>}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Reorder recommendations — full catalogue</h3>
            <table>
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Avg Daily</th><th>Coverage</th><th>Status</th><th>Suggested Reorder</th><th>Model</th></tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.product._id}>
                    <td className="muted">{r.product.sku}</td>
                    <td>{r.product.name}</td>
                    <td>{r.product.category}</td>
                    <td>{r.stock.level}</td>
                    <td>{r.avgDailyDemand}</td>
                    <td>{r.stock.coverDays == null || !isFinite(r.stock.coverDays) ? '∞' : r.stock.coverDays}d</td>
                    <td><span className={`badge ${statusBadge(r.recommendation.status)}`}>{r.recommendation.status.replace('_', ' ')}</span></td>
                    <td><strong>{r.recommendation.suggestedReorderQty}</strong></td>
                    <td className="muted">{r.algorithm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && <div className="card">Running ML model…</div>}
    </div>
  );
}