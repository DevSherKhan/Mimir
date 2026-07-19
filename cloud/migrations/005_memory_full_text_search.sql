ALTER TABLE memory_chunks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_memory_chunks_search_vector
  ON memory_chunks USING gin (search_vector);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_session_occurred
  ON memory_chunks (user_id, source_tool, session_id, occurred_at ASC);
