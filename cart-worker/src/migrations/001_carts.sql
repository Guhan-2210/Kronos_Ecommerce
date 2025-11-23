-- Cart table for shopping cart management
CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_data TEXT NOT NULL, -- JSONB: {email, name, phone}
    product_data TEXT NOT NULL, -- JSONB: [{product_id, sku, name, brand, image, quantity}]
    shipping_address TEXT, -- JSONB: {street, city, state, zipcode, country}
    billing_address TEXT, -- JSONB: {street, city, state, zipcode, country}
    status TEXT DEFAULT 'active', -- active, abandoned, checked_out
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_created_at ON carts(created_at DESC);

-- Trigger to update timestamp
CREATE TRIGGER IF NOT EXISTS update_carts_timestamp
AFTER UPDATE ON carts
FOR EACH ROW
BEGIN
    UPDATE carts SET updated_at = unixepoch() WHERE id = NEW.id;
END;

