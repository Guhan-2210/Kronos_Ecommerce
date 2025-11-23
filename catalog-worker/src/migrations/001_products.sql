-- Products table for watch catalog
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    product_data TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for timestamp queries and sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_products_timestamp
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    UPDATE products SET updated_at = unixepoch() WHERE id = NEW.id;
END;

