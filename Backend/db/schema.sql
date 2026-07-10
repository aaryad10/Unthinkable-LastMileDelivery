-- Users: customers, delivery agents, admins
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Zones: e.g. Zone Alpha, Zone Beta
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Areas/pincodes mapped to a zone
CREATE TABLE IF NOT EXISTS zone_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL REFERENCES zones(id),
  pincode TEXT NOT NULL UNIQUE
);

-- Rate cards: intra/inter zone rates for B2B/B2C + COD surcharge
CREATE TABLE IF NOT EXISTS rate_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_type TEXT NOT NULL CHECK (route_type IN ('intra_zone', 'inter_zone')),
  order_type TEXT NOT NULL CHECK (order_type IN ('B2B', 'B2C')),
  rate_per_kg REAL NOT NULL,
  UNIQUE(route_type, order_type)
);

-- COD surcharge per order type
CREATE TABLE IF NOT EXISTS cod_surcharge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_type TEXT NOT NULL UNIQUE CHECK (order_type IN ('B2B', 'B2C')),
  surcharge REAL NOT NULL
);

-- Delivery agents (linked to a user account)
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  zone_id INTEGER REFERENCES zones(id),
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'offline')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  pickup_address TEXT NOT NULL,
  pickup_pincode TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  drop_pincode TEXT NOT NULL,
  pickup_zone_id INTEGER REFERENCES zones(id),
  drop_zone_id INTEGER REFERENCES zones(id),
  length_cm REAL NOT NULL,
  width_cm REAL NOT NULL,
  height_cm REAL NOT NULL,
  actual_weight_kg REAL NOT NULL,
  volumetric_weight_kg REAL NOT NULL,
  chargeable_weight_kg REAL NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('B2B', 'B2C')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('Prepaid', 'COD')),
  charge REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Created' CHECK (status IN ('Created', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed')),
  assigned_agent_id INTEGER REFERENCES agents(id),
  scheduled_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Immutable order status history (append-only, never updated/deleted)
CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  notes TEXT,
  actor_user_id INTEGER REFERENCES users(id),
  actor_label TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
