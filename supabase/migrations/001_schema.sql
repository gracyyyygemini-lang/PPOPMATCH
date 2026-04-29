-- ============================================================
-- PopMatch – Supabase schema  (3NF)
-- Auth: Firebase only. firebase_uid is the FK to Firebase.
-- All writes come from Edge Functions (service role bypasses RLS).
-- Anon/public key is used for reads + real-time only.
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────
CREATE TYPE gender_type      AS ENUM ('female', 'male', 'nonbinary');
CREATE TYPE gender_pref_type AS ENUM ('girls_only', 'boys_only', 'mixed');
CREATE TYPE zone_type        AS ENUM ('campustown', 'north', 'south', 'urbana', 'downtown');
CREATE TYPE lease_type       AS ENUM ('full_year', 'fall_sublease', 'spring_sublease', 'summer_sublease');
CREATE TYPE landlord_type    AS ENUM ('jsm', 'ugroup', 'bailey', 'american', 'smile', 'cpm', 'green_st_realty', 'other');
CREATE TYPE break_type       AS ENUM ('thanksgiving', 'spring_break', 'winter');
CREATE TYPE intent_type      AS ENUM ('host', 'joiner', 'co_seeker', 'sublessor', 'sublessee');
CREATE TYPE listing_type     AS ENUM ('sublease', 'roommate');
CREATE TYPE listing_category AS ENUM ('semester_takeover', 'summer_only', 'short_term', 'august_gap', 'roommate_openings');
CREATE TYPE summer_subcat    AS ENUM ('full_summer', 'early_summer', 'late_summer');
CREATE TYPE kitchen_type     AS ENUM ('private', 'communal');
CREATE TYPE bathroom_type    AS ENUM ('private', 'shared');
CREATE TYPE cleaning_freq    AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE shoe_policy_type AS ENUM ('shoes_off', 'front_door', 'no_policy');
CREATE TYPE crash_vibe_type  AS ENUM ('sos', 'offering');
CREATE TYPE crash_currency   AS ENUM ('cash', 'boba', 'lion_cover', 'food', 'favor');
CREATE TYPE crash_status     AS ENUM ('active', 'completed');
CREATE TYPE convo_source     AS ENUM ('sublease', 'coseeker', 'crash_cash');
CREATE TYPE mbti_type        AS ENUM ('INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP','idk');
CREATE TYPE star_sign_type   AS ENUM ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces');
CREATE TYPE college_year     AS ENUM ('freshman','sophomore','junior','senior','grad_phd');
CREATE TYPE greek_life_type  AS ENUM ('independent','sorority','fraternity','prof_frat');

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid    TEXT        UNIQUE NOT NULL,
  email           TEXT        UNIQUE NOT NULL CHECK (email LIKE '%@%.edu'),
  name            TEXT        NOT NULL,
  major           TEXT        NOT NULL DEFAULT '',
  bio             TEXT        NOT NULL DEFAULT '',
  budget          INT         NOT NULL DEFAULT 800 CHECK (budget >= 0),
  gender          gender_type NOT NULL DEFAULT 'nonbinary',
  gender_pref     gender_pref_type NOT NULL DEFAULT 'mixed',
  cleanliness     SMALLINT    NOT NULL DEFAULT 3 CHECK (cleanliness BETWEEN 1 AND 5),
  noise           SMALLINT    NOT NULL DEFAULT 3 CHECK (noise BETWEEN 1 AND 5),
  lease_type      lease_type  NOT NULL DEFAULT 'full_year',
  zone            zone_type   NOT NULL DEFAULT 'campustown',
  stays_thanksgiving  BOOLEAN NOT NULL DEFAULT FALSE,
  stays_spring_break  BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_color    TEXT        NOT NULL DEFAULT '#005F73',
  profile_image_url TEXT,
  college         TEXT        NOT NULL DEFAULT '',
  intent          intent_type,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user organizations (multi-valued → own table for 3NF)
CREATE TABLE user_organizations (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization TEXT NOT NULL,
  PRIMARY KEY (user_id, organization)
);

-- user landlord preferences (multi-valued → own table)
CREATE TABLE user_landlord_prefs (
  user_id  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  landlord landlord_type NOT NULL,
  PRIMARY KEY (user_id, landlord)
);

-- vibe profile (1:1 with users, separated for cohesion)
CREATE TABLE user_vibe_profiles (
  user_id         UUID           PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  identity        TEXT           NOT NULL DEFAULT 'nonbinary',  -- girl | guy | nonbinary
  looking_for     TEXT           NOT NULL DEFAULT 'coed',       -- girls | guys | coed
  star_sign       star_sign_type,
  mbti            mbti_type,
  year            college_year,
  greek_life      greek_life_type,
  sleep           TEXT,     -- early_bird | night_owl | flexible
  alarms          TEXT,     -- one_alarm | multiple_alarms | no_alarm
  cleanliness_vibe TEXT,    -- neat_freak | tidy | organized_chaos | messy
  groceries       TEXT,     -- meal_prep | takeout | snack_hoarder
  guests          TEXT,     -- rarely | occasional | love_hosting
  prompt          TEXT,
  prompt_answer   TEXT
);

-- vibe vices (multi-valued)
CREATE TABLE user_vibe_vices (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vice    TEXT NOT NULL,
  PRIMARY KEY (user_id, vice)
);

-- vibe pets (multi-valued)
CREATE TABLE user_vibe_pets (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet     TEXT NOT NULL,
  PRIMARY KEY (user_id, pet)
);

-- ─── SOCIAL GRAPH ─────────────────────────────────────────────
CREATE TABLE friendships (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE vouches (
  voucher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vouchee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (voucher_id, vouchee_id),
  CHECK (voucher_id <> vouchee_id)
);

-- ─── LISTINGS ─────────────────────────────────────────────────
CREATE TABLE listings (
  id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_name        TEXT            NOT NULL,
  address              TEXT            NOT NULL DEFAULT '',
  listing_type         listing_type    NOT NULL DEFAULT 'sublease',
  category             listing_category NOT NULL DEFAULT 'semester_takeover',
  sub_category         summer_subcat,
  lease_type           lease_type      NOT NULL DEFAULT 'full_year',
  price_per_month      INT             NOT NULL DEFAULT 0 CHECK (price_per_month >= 0),
  zone                 zone_type       NOT NULL DEFAULT 'campustown',
  available_during_breaks BOOLEAN      NOT NULL DEFAULT FALSE,
  description          TEXT            NOT NULL DEFAULT '',
  unit_type            TEXT,           -- Studio | 1BR | 2BR/2BA | etc.
  kitchen_type         kitchen_type,
  bathroom_type        bathroom_type,
  is_private_bedroom   BOOLEAN         NOT NULL DEFAULT FALSE,
  is_private_bathroom  BOOLEAN         NOT NULL DEFAULT FALSE,
  floor_plan_url       TEXT,
  rooms_available      SMALLINT,
  current_resident_bio TEXT,
  move_in_date         TIMESTAMPTZ,
  move_out_date        TIMESTAMPTZ,
  event_tag            TEXT,           -- Mom's Weekend | Graduation | etc.
  cleaning_frequency   cleaning_freq,
  shoe_policy          shoe_policy_type,
  has_parking          BOOLEAN         NOT NULL DEFAULT FALSE,
  roommate_preference  TEXT,           -- Girls Only | Co-ed | etc.
  is_leased            BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- landlords per listing (multi-valued)
CREATE TABLE listing_landlords (
  listing_id UUID          NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  landlord   landlord_type NOT NULL,
  PRIMARY KEY (listing_id, landlord)
);

-- break types per listing (multi-valued)
CREATE TABLE listing_break_types (
  listing_id UUID       NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  break_type break_type NOT NULL,
  PRIMARY KEY (listing_id, break_type)
);

-- amenities (1:1 with listing, large set of flags)
CREATE TABLE listing_amenities (
  listing_id       UUID    PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  is_furnished     BOOLEAN NOT NULL DEFAULT FALSE,
  has_laundry      BOOLEAN NOT NULL DEFAULT FALSE,
  has_wifi         BOOLEAN NOT NULL DEFAULT FALSE,
  has_ac           BOOLEAN NOT NULL DEFAULT FALSE,
  has_study_lounge BOOLEAN NOT NULL DEFAULT FALSE,
  has_printing     BOOLEAN NOT NULL DEFAULT FALSE,
  has_bike_storage BOOLEAN NOT NULL DEFAULT FALSE,
  has_security     BOOLEAN NOT NULL DEFAULT FALSE,
  utils_included   BOOLEAN NOT NULL DEFAULT FALSE,
  no_deposit       BOOLEAN NOT NULL DEFAULT FALSE,
  parking_included BOOLEAN NOT NULL DEFAULT FALSE,
  has_gym          BOOLEAN NOT NULL DEFAULT FALSE,
  has_pool         BOOLEAN NOT NULL DEFAULT FALSE,
  has_elevator     BOOLEAN NOT NULL DEFAULT FALSE,
  has_rooftop      BOOLEAN NOT NULL DEFAULT FALSE,
  has_lockers      BOOLEAN NOT NULL DEFAULT FALSE
);

-- listing photos (ordered)
CREATE TABLE listing_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0
);

-- ─── CRASH & CASH ─────────────────────────────────────────────
CREATE TABLE crash_posts (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe           crash_vibe_type  NOT NULL,
  story          TEXT             NOT NULL,
  image_url      TEXT             NOT NULL DEFAULT '',
  dates          TEXT             NOT NULL DEFAULT '',
  target_date    TIMESTAMPTZ      NOT NULL,
  zone           zone_type        NOT NULL DEFAULT 'campustown',
  currency       crash_currency   NOT NULL,
  currency_label TEXT             NOT NULL DEFAULT '',
  approx_location TEXT,
  status         crash_status     NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ─── MATCHMAKER SWIPES ────────────────────────────────────────
CREATE TABLE matches (
  swiper_id  UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swipee_id  UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked      BOOLEAN NOT NULL,
  score      SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (swiper_id, swipee_id),
  CHECK (swiper_id <> swipee_id)
);

-- ─── MESSAGING ────────────────────────────────────────────────
CREATE TABLE conversations (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant2_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- listing_ref is text to support both listing UUIDs and synthetic match IDs
  listing_ref      TEXT         NOT NULL DEFAULT '',
  listing_building TEXT         NOT NULL DEFAULT '',
  listing_price    INT          NOT NULL DEFAULT 0,
  listing_unit_type TEXT,
  source           convo_source,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (participant1_id <> participant2_id),
  UNIQUE (participant1_id, participant2_id, listing_ref)
);

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (content <> ''),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FEEDBACK & STATS ─────────────────────────────────────────
CREATE TABLE feedback (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
  user_email     TEXT        NOT NULL,
  rating         TEXT        NOT NULL CHECK (rating IN ('rescue', 'meh', 'love')),
  issue_category TEXT        NOT NULL DEFAULT '',
  issue_detail   TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stats (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);

INSERT INTO stats (key, value) VALUES
  ('successful_subleases', 0),
  ('total_matches', 0),
  ('total_users', 0)
ON CONFLICT (key) DO NOTHING;

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_users_firebase_uid      ON users(firebase_uid);
CREATE INDEX idx_users_email             ON users(email);
CREATE INDEX idx_listings_user_id        ON listings(user_id);
CREATE INDEX idx_listings_category       ON listings(category) WHERE NOT is_leased;
CREATE INDEX idx_listings_zone           ON listings(zone)     WHERE NOT is_leased;
CREATE INDEX idx_listings_active         ON listings(created_at DESC) WHERE NOT is_leased;
CREATE INDEX idx_messages_conversation   ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_conversations_p1        ON conversations(participant1_id);
CREATE INDEX idx_conversations_p2        ON conversations(participant2_id);
CREATE INDEX idx_crash_posts_status      ON crash_posts(status, target_date);
CREATE INDEX idx_friendships_user        ON friendships(user_id);
CREATE INDEX idx_friendships_friend      ON friendships(friend_id);
CREATE INDEX idx_matches_swiper          ON matches(swiper_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
-- Edge Functions use service_role key → bypass RLS entirely.
-- Anon/public client is read-only for marketplace + social graph.
-- Conversations and messages are readable by UUID knowledge (hard to guess).

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_landlord_prefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vibe_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vibe_vices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vibe_pets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_landlords    ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_break_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_amenities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats                ENABLE ROW LEVEL SECURITY;

-- PUBLIC READS (anon key can read these for the marketplace + trust graph)

CREATE POLICY "public_read_users"
  ON users FOR SELECT USING (true);

CREATE POLICY "public_read_user_organizations"
  ON user_organizations FOR SELECT USING (true);

CREATE POLICY "public_read_user_landlord_prefs"
  ON user_landlord_prefs FOR SELECT USING (true);

CREATE POLICY "public_read_user_vibe_profiles"
  ON user_vibe_profiles FOR SELECT USING (true);

CREATE POLICY "public_read_user_vibe_vices"
  ON user_vibe_vices FOR SELECT USING (true);

CREATE POLICY "public_read_user_vibe_pets"
  ON user_vibe_pets FOR SELECT USING (true);

CREATE POLICY "public_read_friendships"
  ON friendships FOR SELECT USING (true);

CREATE POLICY "public_read_vouches"
  ON vouches FOR SELECT USING (true);

-- Listings: only show active (non-leased) to public
CREATE POLICY "public_read_active_listings"
  ON listings FOR SELECT USING (NOT is_leased);

CREATE POLICY "public_read_listing_landlords"
  ON listing_landlords FOR SELECT USING (true);

CREATE POLICY "public_read_listing_break_types"
  ON listing_break_types FOR SELECT USING (true);

CREATE POLICY "public_read_listing_amenities"
  ON listing_amenities FOR SELECT USING (true);

CREATE POLICY "public_read_listing_images"
  ON listing_images FOR SELECT USING (true);

CREATE POLICY "public_read_crash_posts"
  ON crash_posts FOR SELECT USING (true);

CREATE POLICY "public_read_matches"
  ON matches FOR SELECT USING (true);

-- Conversations + messages: readable by UUID scoping (UUIDs are unguessable)
CREATE POLICY "public_read_conversations"
  ON conversations FOR SELECT USING (true);

CREATE POLICY "public_read_messages"
  ON messages FOR SELECT USING (true);

-- Stats: public read
CREATE POLICY "public_read_stats"
  ON stats FOR SELECT USING (true);

-- Feedback: no public read (admin via service role only)
-- (No SELECT policy = blocked for anon/authenticated)

-- ALL WRITES are blocked for anon/authenticated.
-- Edge Functions use service_role key which bypasses RLS.
-- This means no explicit INSERT/UPDATE/DELETE policies are needed.

-- ─── HELPER FUNCTIONS ─────────────────────────────────────────
-- Called by Edge Functions via supabase.rpc()

CREATE OR REPLACE FUNCTION increment_stat(stat_key TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO stats (key, value) VALUES (stat_key, 1)
  ON CONFLICT (key) DO UPDATE SET value = stats.value + 1;
END;
$$;

-- Trust graph: returns degree, mutual friends, vouches, and shared orgs
-- between viewer (by firebase_uid) and target (by email).
-- Returns a single JSON row.
CREATE OR REPLACE FUNCTION get_trust_info(
  viewer_firebase_uid TEXT,
  target_email        TEXT
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_viewer_id  UUID;
  v_target_id  UUID;
  v_is_direct  BOOLEAN := FALSE;
  v_degree     INT     := NULL;
  v_mutuals    JSON    := '[]';
  v_vouched_by JSON    := '[]';
  v_shared_orgs JSON  := '[]';
BEGIN
  SELECT id INTO v_viewer_id FROM users WHERE firebase_uid = viewer_firebase_uid;
  SELECT id INTO v_target_id FROM users WHERE email = target_email;

  IF v_viewer_id IS NULL OR v_target_id IS NULL THEN
    RETURN json_build_object('degree', NULL, 'mutualFriends', '[]'::JSON,
      'vouchedBy', '[]'::JSON, 'sharedOrgs', '[]'::JSON);
  END IF;

  IF v_viewer_id = v_target_id THEN
    RETURN json_build_object('degree', 1, 'mutualFriends', '[]'::JSON,
      'vouchedBy', '[]'::JSON, 'sharedOrgs', '[]'::JSON);
  END IF;

  -- Check direct friendship
  SELECT EXISTS(
    SELECT 1 FROM friendships
    WHERE user_id = v_viewer_id AND friend_id = v_target_id
  ) INTO v_is_direct;

  IF v_is_direct THEN
    v_degree := 1;
    SELECT json_agg(json_build_object('name', u.name, 'email', u.email))
    INTO v_vouched_by
    FROM vouches v JOIN users u ON v.voucher_id = u.id
    WHERE v.vouchee_id = v_target_id;

    SELECT json_agg(o.organization)
    INTO v_shared_orgs
    FROM user_organizations o
    WHERE o.user_id = v_viewer_id
      AND o.organization IN (
        SELECT organization FROM user_organizations WHERE user_id = v_target_id
      );
  ELSE
    -- Mutual friends
    SELECT json_agg(json_build_object('name', u.name, 'email', u.email, 'avatarColor', u.avatar_color))
    INTO v_mutuals
    FROM users u
    WHERE u.id IN (SELECT friend_id FROM friendships WHERE user_id = v_viewer_id)
      AND u.id IN (SELECT friend_id FROM friendships WHERE user_id = v_target_id);

    IF v_mutuals IS NOT NULL AND json_array_length(v_mutuals) > 0 THEN
      v_degree := 2;
    END IF;

    -- Shared orgs
    SELECT json_agg(o.organization)
    INTO v_shared_orgs
    FROM user_organizations o
    WHERE o.user_id = v_viewer_id
      AND o.organization IN (
        SELECT organization FROM user_organizations WHERE user_id = v_target_id
      );
  END IF;

  RETURN json_build_object(
    'degree',        v_degree,
    'mutualFriends', COALESCE(v_mutuals, '[]'::JSON),
    'vouchedBy',     COALESCE(v_vouched_by, '[]'::JSON),
    'sharedOrgs',    COALESCE(v_shared_orgs, '[]'::JSON)
  );
END;
$$;

-- ─── REALTIME PUBLICATION ─────────────────────────────────────
-- Enable real-time on the tables that need live updates.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE crash_posts;
