ALTER TABLE device_auth_codes
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS install_id TEXT,
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS install_identities (
  install_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE device_auth_codes
  DROP CONSTRAINT IF EXISTS device_auth_codes_install_id_fkey,
  ADD CONSTRAINT device_auth_codes_install_id_fkey
    FOREIGN KEY (install_id)
    REFERENCES install_identities(install_id)
    ON DELETE SET NULL;
