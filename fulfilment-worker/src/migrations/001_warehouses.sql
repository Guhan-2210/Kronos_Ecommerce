-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address_data TEXT NOT NULL, -- JSONB: {street, city, state, zipcode, country}
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

