-- Delivery zones based on zipcode patterns
CREATE TABLE IF NOT EXISTS delivery_zones (
    id TEXT PRIMARY KEY,
    zone_name TEXT NOT NULL,
    zipcode_pattern TEXT NOT NULL, -- e.g., "10001-10299" or "100%"
    primary_warehouse_id TEXT NOT NULL,
    zone_type TEXT DEFAULT 'local', -- 'local', 'regional', 'remote'
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY(primary_warehouse_id) REFERENCES warehouses(id)
);

-- Delivery modes with conditions stored as JSON
CREATE TABLE IF NOT EXISTS delivery_modes (
    id TEXT PRIMARY KEY,
    mode_name TEXT NOT NULL, -- 'standard' or 'express'
    conditions TEXT NOT NULL, -- JSONB: {min_days, max_days, base_cost, cutoff_time}
    zone_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY(zone_id) REFERENCES delivery_zones(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_zones_zipcode ON delivery_zones(zipcode_pattern);
CREATE INDEX IF NOT EXISTS idx_delivery_modes_zone_id ON delivery_modes(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_modes_active ON delivery_modes(is_active);

