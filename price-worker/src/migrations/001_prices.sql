-- Prices table for product pricing
CREATE TABLE IF NOT EXISTS prices (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);

-- Trigger to update timestamp
CREATE TRIGGER IF NOT EXISTS update_prices_timestamp
AFTER UPDATE ON prices
FOR EACH ROW
BEGIN
    UPDATE prices SET updated_at = unixepoch() WHERE id = NEW.id;
END;

