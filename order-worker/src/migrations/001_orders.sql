-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cart_id TEXT NOT NULL,
  order_data TEXT NOT NULL, -- JSON: products, shipping, billing, delivery mode, costs
  user_data TEXT NOT NULL, -- JSON: email, name, phone
  payment_id TEXT, -- Reference to payment record
  status TEXT NOT NULL DEFAULT 'pending', -- pending, payment_initiated, paid, confirmed, processing, shipped, delivered, cancelled, failed
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER -- For soft delete
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Index for cart lookups
CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for soft deletes (exclude deleted orders)
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);

