-- ============================================================
-- PopMatch — Migration 003: fixes & missing pieces
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- 1. Make sure the 'market' value exists in convo_source enum.
--    Migration 002 already does this, but IF 002 was never run, run it here.
ALTER TYPE convo_source ADD VALUE IF NOT EXISTS 'market';

-- 2. Enable realtime on marketplace_listings (in case migration 002 wasn't run).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'marketplace_listings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
  END IF;
END $$;

-- 3. Create marketplace_listings table if it doesn't exist yet
--    (idempotent — safe to run even if 002 already ran).
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL DEFAULT '',
  price           INT         NOT NULL DEFAULT 0 CHECK (price >= 0),
  category        TEXT        NOT NULL DEFAULT 'other'
                              CHECK (category IN ('textbooks','tech','furniture','bikes','clothing','other')),
  condition       TEXT        NOT NULL DEFAULT 'good'
                              CHECK (condition IN ('new','like_new','good','fair','for_parts')),
  pickup_location TEXT        NOT NULL DEFAULT '',
  accepts_venmo   BOOLEAN     NOT NULL DEFAULT FALSE,
  accepts_cash    BOOLEAN     NOT NULL DEFAULT TRUE,
  accepts_zelle   BOOLEAN     NOT NULL DEFAULT FALSE,
  images          TEXT[]      NOT NULL DEFAULT '{}',
  is_sold         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_listings_category ON marketplace_listings(category) WHERE NOT is_sold;
CREATE INDEX IF NOT EXISTS idx_market_listings_user     ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_active   ON marketplace_listings(created_at DESC) WHERE NOT is_sold;

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_listings'
      AND policyname = 'public_read_active_market_listings'
  ) THEN
    CREATE POLICY "public_read_active_market_listings"
      ON marketplace_listings FOR SELECT USING (NOT is_sold);
  END IF;
END $$;

-- 4. A lightweight view that surfaces the most-recent message for each
--    conversation. Used by the inbox to show previews without N+1 queries.
CREATE OR REPLACE VIEW conversation_last_message AS
SELECT
  c.id AS conversation_id,
  m.content    AS last_message,
  m.created_at AS last_message_at
FROM conversations c
LEFT JOIN LATERAL (
  SELECT content, created_at
  FROM messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true;

-- Grant anon read on the view (RLS on underlying tables still applies)
GRANT SELECT ON conversation_last_message TO anon, authenticated;
