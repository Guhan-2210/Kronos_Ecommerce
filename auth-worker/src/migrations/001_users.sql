CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  user_data TEXT NOT NULL, -- JSON string
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- index on HMAC(email) stored inside JSON
CREATE INDEX IF NOT EXISTS idx_users_email_hash
  ON users (json_extract(user_data, '$.email_hash'));

-- Index on email_hash (allows searching by email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_hash
  ON users (json_extract(user_data, '$.phone_hash'));