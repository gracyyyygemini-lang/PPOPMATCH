-- ============================================================
-- PopMatch — Migration 004: Switch to pure Supabase Auth
--
-- BEFORE RUNNING:
--   If you have existing test rows in public.users that were created
--   with firebase_uid values (not real Supabase auth UUIDs), truncate
--   first:  TRUNCATE public.users CASCADE;
--   Then re-onboard users so their rows get the correct Supabase UUID.
-- ============================================================

-- 1. Drop the firebase_uid index and column
DROP INDEX IF EXISTS idx_users_firebase_uid;
ALTER TABLE public.users DROP COLUMN IF EXISTS firebase_uid;

-- 2. Link users.id to auth.users.id via a foreign key.
--    users.id is already the PK (UUID). We now enforce that it must
--    reference a real Supabase auth account so orphan rows are impossible.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_id_fkey'
      AND table_name = 'users'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Replace get_trust_info() — parameter was viewer_firebase_uid TEXT,
--    now it's viewer_user_id UUID (the Supabase auth UUID = users.id).
--    The lookup `WHERE firebase_uid = ...` is replaced with a direct UUID.
CREATE OR REPLACE FUNCTION get_trust_info(
  viewer_user_id UUID,
  target_email   TEXT
)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_viewer_id  UUID := viewer_user_id;
  v_target_id  UUID;
  v_is_direct  BOOLEAN := FALSE;
  v_degree     INT     := NULL;
  v_mutuals    JSON    := '[]';
  v_vouched_by JSON    := '[]';
  v_shared_orgs JSON  := '[]';
BEGIN
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
    'mutualFriends', COALESCE(v_mutuals,    '[]'::JSON),
    'vouchedBy',     COALESCE(v_vouched_by, '[]'::JSON),
    'sharedOrgs',    COALESCE(v_shared_orgs,'[]'::JSON)
  );
END;
$$;
