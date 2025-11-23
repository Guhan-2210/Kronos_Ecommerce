-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- PayPal specific fields
  paypal_order_id TEXT UNIQUE, -- PayPal's order ID
  paypal_capture_id TEXT, -- PayPal's capture ID after successful payment
  
  -- Payment details (encrypted sensitive data)
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Payment status
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated, approved, captured, failed, refunded
  
  -- Encrypted PayPal response (contains sensitive data)
  -- We store the full PayPal response encrypted for audit/dispute purposes
  encrypted_response TEXT,
  
  -- Payer information (hashed for privacy)
  payer_email_hash TEXT, -- SHA-256 hash of payer email
  payer_id_hash TEXT, -- SHA-256 hash of PayPal payer ID
  
  -- Transaction metadata (not sensitive, stored in plain text)
  transaction_metadata TEXT, -- JSON: timestamp, currency, country, etc.
  
  -- Error information (if payment failed)
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER -- When payment was successfully captured
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

