# StockPilot — Cloud-based Inventory & Demand Forecasting for Retail Chains

A full-stack retail system that tracks inventory, records sales, and **predicts future demand with machine learning** so managers know *what* to reorder, *how much*, and *when*.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Axios, Recharts, Vite |
| Backend | Node.js, Express, JWT auth, bcrypt |
| Database | MongoDB / Mongoose (local or **MongoDB Atlas cloud cluster**) |
| ML Library | **ml-regression** (Polynomial Regression + weekday seasonality) |
| Cloud | Deployable to Render / Railway / AWS EC2; MongoDB Atlas for cloud DB |

## Features

- **Auth & Roles** — Admin / Manager / Staff with JWT
- **Dashboard** — revenue charts, stock value, low-stock alerts, top products, recent sales
- **Products** — CRUD catalogue with pricing, reorder points, lead time, safety stock
- **Inventory** — real-time stock levels, restock (PO receipt), adjustments, movement history
- **Sales (POS)** — record sales, auto-decrement stock, sales history with filters
- **Demand Forecasting (ML)** — polynomial regression + weekday seasonality:
  - per-product daily demand forecast (7/14/30 days)
  - model R² score, average daily demand, growth trend
  - **auto reorder recommendations** (status: OUT_OF_STOCK / LOW / OK), suggested reorder qty, projected out-of-stock date

## Project Structure

```
cloud-inventory-forecasting/
├── backend/
│   ├── server.js              # Express app (API + serves built frontend)
│   ├── config/db.js           # Mongoose connection
│   ├── models/                # User, Product, Sale, StockMovement (one file each)
│   ├── seed/seed.js           # Demo data (60 days of sales, auto-seeded on first run)
│   ├── middleware/auth.js     # JWT guard + role checks
│   ├── ml/demandForecast.js   # ⚙️ ML engine (PolynomialRegression + seasonality)
│   └── routes/                # auth, products, inventory, sales, forecast, dashboard
├── frontend/
│   ├── vite.config.js         # dev proxy /api → :5000 + chunk splitting
│   └── src/
│       ├── App.jsx            # routes + auth guard
│       ├── context/           # AuthContext
│       └── pages/             # Login, Dashboard, Products, Inventory, Sales, Forecast
└── README.md
```

## How to Run

### Prerequisites
- **Node.js** v18+ (built with Node 24)
- **MongoDB** — either running locally (`mongodb://localhost:27017`) **or** a cloud **MongoDB Atlas** cluster

### Step 1 — Configure environment (optional)

```bash
cd backend
copy .env.example .env   # Windows
# or: cp .env.example .env   # macOS / Linux
```

Edit `.env` — for **cloud mode** point `MONGO_URI` at your Atlas cluster:

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/retail_inventory
JWT_SECRET=retail-secret-key
```

The database seeds automatically on first run: **12 products** and **60 days of sales history** so forecasting has real data immediately.

### Step 2 — Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Step 3 — Run

**Option A — Production (single server serves everything):**

```bash
cd frontend
npm run build            # builds React app into frontend/dist

cd ../backend
npm start                # API + app at http://localhost:5000
```

Open **http://localhost:5000**

**Option B — Development (hot reload):**

```bash
# Terminal 1
cd backend
npm run dev              # API at http://localhost:5000

# Terminal 2
cd frontend
npm run dev              # React dev server at http://localhost:3000 (proxies /api → 5000)
```

Open **http://localhost:3000**

### Demo accounts (password `admin123` for all)

| Role | Email |
|------|-------|
| Admin | `admin@retail.com` |
| Manager | `manager@retail.com` |
| Staff | `staff@retail.com` |

## API Overview

Base URL: `http://localhost:5000/api` (all except login/health need `Authorization: Bearer <token>`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login → JWT | Public |
| GET | `/dashboard` | Stats, revenue chart, top products | Auth |
| GET/POST/PUT/DELETE | `/products` | Product CRUD | write: admin/manager |
| GET | `/inventory` | Stock levels + low-stock flags | Auth |
| GET | `/inventory/low` | Low-stock products | Auth |
| GET | `/inventory/movements` | Movement history | Auth |
| POST | `/inventory/restock` | Receive stock | admin/manager |
| POST | `/inventory/adjust` | Signed stock adjustment | admin/manager |
| GET/POST | `/sales` | List / record sales | Auth |
| GET | `/forecast/:productId?horizon=14` | **ML demand forecast** for a product | Auth |
| GET | `/forecast/recommendations` | Reorder recommendations for whole catalogue | Auth |

## How the ML works

1. **Trend** — `ml-regression` fits a polynomial regression of daily demand vs. time.
2. **Seasonality** — multiplicative weekday factors are learned from historical residuals (e.g. weekend uplift).
3. **Forecast** — trend prediction × weekday factor for the next N days.
4. **Recommendation** — expected demand over (lead time + safety days) minus current stock = suggested reorder quantity.

## Cloud Deployment Notes

- **DB**: use a MongoDB Atlas cluster string in `MONGO_URI`.
- **API**: push this repo to GitHub and deploy the `backend/` on Render/Railway with:
  - start command: `npm install && npm start` (run in `backend/`), or a Dockerfile
  - set env vars `MONGO_URI` and `JWT_SECRET`
- **Frontend**: build once (`npm run build` in `frontend/`) — Express serves the static files, so one service runs the whole app.

## License

MIT