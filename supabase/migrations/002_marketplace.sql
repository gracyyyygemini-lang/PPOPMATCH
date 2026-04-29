-- ============================================================
-- Illini Market — campus buy/sell marketplace
-- ============================================================

CREATE TABLE marketplace_listings (
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

CREATE INDEX idx_market_listings_category ON marketplace_listings(category) WHERE NOT is_sold;
CREATE INDEX idx_market_listings_user     ON marketplace_listings(user_id);
CREATE INDEX idx_market_listings_active   ON marketplace_listings(created_at DESC) WHERE NOT is_sold;

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_market_listings"
  ON marketplace_listings FOR SELECT USING (NOT is_sold);

-- Extend conversation source enum to include market DMs
ALTER TYPE convo_source ADD VALUE IF NOT EXISTS 'market';

ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
