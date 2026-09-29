import { useEffect, useState } from 'react';
import api from '../api';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ productId: '', quantity: 1, customerName: 'Walk-in Customer' });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('');

  const loadSales = () => api.get('/sales', { params: { from: from || undefined, to: to || undefined, limit: 150 } }).then((r) => setSales(r.data));

  useEffect(() => {
    api.get('/products').then((r) => {
      setProducts(r.data);
      if (!r.data.length) return;
      const first = filter || r.data[0]._id;
      setForm((f) => ({ ...f, productId: first }));
    });
    loadSales().catch((e) => setError(e.response?.data?.error || 'Load failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(loadSales, 400);
    return () => clearTimeout(t);
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = products.find((p) => p._id === form.productId);
  const lineTotal = (selected ? selected.price * form.quantity : 0).toFixed(2);

  const record = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/sales', form);
      setForm((f) => ({ ...f, quantity: 1, customerName: 'Walk-in Customer' }));
      setSuccess('Sale recorded ✔');
      loadSales();
    } catch (err) {
      setError(err.response?.data?.error || 'Sale failed');
    }
  };

  const badgeFor = (p) => p?.stockLevel <= p?.reorderPoint ? 'low' : 'ok';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
        <div className="card">
          <h3>Record a sale</h3>
          {error && <div className="login-error">{error}</div>}
          {success && <div style={{ color: 'var(--accent-2)', marginBottom: 12, fontSize: 13 }}>{success}</div>}
          <form onSubmit={record}>
            <div className="field">
              <label>Product</label>
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} — {p.stockLevel} in stock</option>
                ))}
              </select>
            </div>
            {selected && (
              <div className="summary-chips" style={{ marginBottom: 12 }}>
                <span className="chip">Price ₹{selected.price}</span>
                <span className="chip">On hand: <strong className={selected.stockLevel <= selected.reorderPoint ? '' : ''}>{selected.stockLevel}</strong></span>
                <span className={`badge ${badgeFor(selected)}`}>{selected.stockLevel <= selected.reorderPoint ? 'Low stock' : 'In stock'}</span>
              </div>
            )}
            <div className="field">
              <label>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} required />
            </div>
            <div className="field">
              <label>Customer</label>
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div className="field">
              <label>Total</label>
              <div style={{ fontSize: 22, fontWeight: 700 }}>₹{lineTotal}</div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>Record sale</button>
          </form>
        </div>

        <div className="card">
          <h3>Sales history</h3>
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <span className="muted">{sales.length} records</span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr><th>Date</th><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th><th>Customer</th></tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id}>
                    <td className="muted">{new Date(s.date).toLocaleString()}</td>
                    <td>{s.product?.name || '—'}</td>
                    <td>{s.quantity}</td>
                    <td>₹{s.unitPrice}</td>
                    <td>₹{s.total}</td>
                    <td className="muted">{s.customerName}</td>
                  </tr>
                ))}
                {!sales.length && <tr><td colSpan={6} className="muted">No sales in this range</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}