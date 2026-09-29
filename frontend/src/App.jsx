import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Forecast from './pages/Forecast';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/inventory', label: 'Inventory', icon: '🗃️' },
  { to: '/sales', label: 'Sales', icon: '🧾' },
  { to: '/forecast', label: 'Demand Forecast', icon: '🔮' },
];

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">📦</span>
          <div>
            <h1>StockPilot</h1>
            <p>Retail Forecasting</p>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              end={item.end}
              className={'nav-link' + (location.pathname === item.to || (!item.end && location.pathname.startsWith(item.to)) ? ' active' : '')}
            >
              <span className="nav-icon">{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user">
            <div className="avatar">{user?.name?.[0] || 'U'}</div>
            <div className="user-meta">
              <strong>{user?.name}</strong>
              <span className="role">{user?.role}</span>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Private() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function Outlet() {
  const { user } = useAuth();
  const location = useLocation();
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  return (
    <Layout>
      <header className="topbar">
        <h2>{current?.label || 'Dashboard'}</h2>
        <span className="muted">Signed in as {user?.email}</span>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/forecast" element={<Forecast />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Private />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}