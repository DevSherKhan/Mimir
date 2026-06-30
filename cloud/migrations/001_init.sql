CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS install_identities (
  install_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_tool TEXT NOT NULL,
  workspace_path TEXT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_provider TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_hash)
);

CREATE TABLE IF NOT EXISTS device_auth_codes (
  device_code TEXT PRIMARY KEY,
  user_code TEXT NOT NULL UNIQUE,
  client_name TEXT,
  install_id TEXT REFERENCES install_identities(install_id) ON DELETE SET NULL,
  approved_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ,
  access_token_hash TEXT,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_source
  ON memory_chunks (user_id, source_tool);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_occurred
  ON memory_chunks (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding
  ON memory_chunks USING ivfflat (embedding vector_cosine_ops);
