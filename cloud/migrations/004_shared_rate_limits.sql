CREATE TABLE IF NOT EXISTS request_rate_limits (
  action TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (action, identifier_hash, window_start)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_window_start
  ON request_rate_limits (window_start);
