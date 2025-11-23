-- Add deleted_at column for soft delete functionality
ALTER TABLE carts ADD COLUMN deleted_at INTEGER;

-- Index for filtering out deleted carts
CREATE INDEX IF NOT EXISTS idx_carts_deleted_at ON carts(deleted_at);

