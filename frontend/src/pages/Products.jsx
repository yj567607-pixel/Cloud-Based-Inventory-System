import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY = { sku: '', name: '', category: '', price: '', cost: '', unit: 'pcs', stockLevel: '', reorderPoint: 5, leadTimeDays: 5, safetyDays: 3 };

export default function Products() {
  const { can } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const canWrite = can('admin', 'manager');

  const load = () => api.get('/products', { params: { search: search || undefined } }).then((r) => setProducts(r.data));

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = () => { setForm(EMPTY); setEditingId(null); setError(''); setModal(true); };
  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({ sku: p.sku, name: p.name, category: p.category, price: p.price, cost: p.cost, unit: p.unit, stockLevel: p.stockLevel, reorderPoint: p.reorderPoint, leadTimeDays: p.leadTimeDays, safetyDays: p.safetyDays });
    setError(''); setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, price: +form.price, cost: +form.cost, stockLevel: +form.stockLevel, reorderPoint: +form.reorderPoint, leadTimeDays: +form.leadTimeDays, safetyDays: +form.safetyDays };
      if (editingId) await api.put(`/products/${editingId}`, payload);
      else await api.post('/products', payload);
      setModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    try { await api.delete(`/products/${p._id}`); load(); } catch (e) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="spacer" />
        {canWrite && <button className="btn btn-primary" onClick={openNew}>+ New Product</button>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Reorder Pt</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td className="muted">{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>₹{p.price}</td>
                <td>₹{p.cost}</td>
                <td>{p.stockLevel} {p.unit}</td>
                <td>{p.reorderPoint}</td>
                <td><span className={`badge ${p.stockLevel <= p.reorderPoint ? 'low' : 'ok'}`}>{p.stockLevel <= p.reorderPoint ? 'Low stock' : 'In stock'}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {canWrite && <button className="icon-btn" title="Edit" onClick={() => openEdit(p)}>✏️</button>}
                  {can('admin') && <button className="icon-btn" title="Delete" onClick={() => remove(p)}>🗑️</button>}
                </td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan={9} className="muted">No products found</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit' : 'New'} product</h3>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={save}>
              <div className="form-grid">
                <div className="field"><label>SKU</label><input value={form.sku} onChange={set('sku')} required /></div>
                <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
                <div className="field"><label>Category</label><input value={form.category} onChange={set('category')} required /></div>
                <div className="field"><label>Unit</label><input value={form.unit} onChange={set('unit')} /></div>
                <div className="field"><label>Price (₹)</label><input type="number" min="0" value={form.price} onChange={set('price')} required /></div>
                <div className="field"><label>Cost (₹)</label><input type="number" min="0" value={form.cost} onChange={set('cost')} required /></div>
                <div className="field"><label>Opening stock</label><input type="number" min="0" value={form.stockLevel} onChange={set('stockLevel')} /></div>
                <div className="field"><label>Reorder point</label><input type="number" min="0" value={form.reorderPoint} onChange={set('reorderPoint')} /></div>
                <div className="field"><label>Lead time (days)</label><input type="number" min="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} /></div>
                <div className="field"><label>Safety stock (days)</label><input type="number" min="0" value={form.safetyDays} onChange={set('safetyDays')} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}