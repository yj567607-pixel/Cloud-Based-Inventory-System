import { useEffect, useState } from 'react';
import api from '../api';
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#4f8cff', '#38d39f', '#ffc46b', '#a78bfa', '#ff6b6b', '#5ad0e6'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }, []);

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Loading dashboard…</div>;

  return (
    <div>
      <div className="card-row">
        <div className="card stat blue">
          <div className="label">Total Products</div>
          <div className="value">{data.totalProducts}</div>
          <div className="hint">{data.totalStockUnits.toLocaleString()} units in stock</div>
        </div>
        <div className="card stat green">
          <div className="label">Stock Value</div>
          <div className="value">₹{data.totalStockValue.toLocaleString('en-IN')}</div>
          <div className="hint">Cost basis across all warehouses</div>
        </div>
        <div className="card stat amber">
          <div className="label">Today's Revenue</div>
          <div className="value">₹{data.todaysSales.revenue.toLocaleString('en-IN')}</div>
          <div className="hint">{data.todaysSales.orders} orders today</div>
        </div>
        <div className={`card stat ${data.lowStockCount > 0 ? 'danger' : 'green'}`}>
          <div className="label">Low Stock Alerts</div>
          <div className="value">{data.lowStockCount}</div>
          <div className="hint">Products at or below reorder point</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Revenue — last 14 days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data.salesByDay}>
              <CartesianGrid stroke="#26314a" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#8b96ad', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b96ad', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1d2639', border: '1px solid #26314a', borderRadius: 10 }} />
              <Area type="monotone" dataKey="revenue" stroke="#4f8cff" fill="#4f8cff" fillOpacity={0.25} />
              <Bar dataKey="revenue" fill="#4f8cff" opacity={0.6} barSize={18} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Stock value by category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.categoryDistribution} dataKey="value" nameKey="name" outerRadius={90} label>
                {data.categoryDistribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1d2639', border: '1px solid #26314a', borderRadius: 10 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Top products — units sold (7 days)</h3>
          <table>
            <thead>
              <tr><th>Product</th><th>Units</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.units}</td>
                  <td>₹{p.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Recent sales</h3>
          <table>
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Total</th><th>Time</th></tr>
            </thead>
            <tbody>
              {data.recentSales.slice(0, 6).map((s) => (
                <tr key={s._id}>
                  <td>{s.product?.name || '—'}</td>
                  <td>{s.quantity}</td>
                  <td>₹{s.total}</td>
                  <td className="muted">{new Date(s.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}