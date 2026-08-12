CREATE TABLE IF NOT EXISTS verify_rate_limit (
  ip TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
