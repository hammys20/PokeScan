CREATE TABLE IF NOT EXISTS scan_events (
  scan_id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('analyzed', 'confirmed')),
  identity JSONB NOT NULL,
  valuation JSONB NOT NULL,
  needs_user_confirmation BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_events_created_at_idx ON scan_events (created_at DESC);
