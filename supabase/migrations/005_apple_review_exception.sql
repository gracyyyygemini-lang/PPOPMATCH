-- ============================================================
-- PopMatch — Migration 005: Apple App Review email exception
--
-- Allows popmatch.testuser@gmail.com to bypass the @.edu
-- restriction so Apple reviewers can sign in and test the app.
-- All other emails still require a .edu address.
-- ============================================================

-- 1. Update the auth.users trigger to allow the test email.
--    This fires when Supabase OTP verifies the user's email
--    and inserts/updates the row in auth.users.
CREATE OR REPLACE FUNCTION public.enforce_illinois_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;
  -- Allow the Apple App Review test account
  IF NEW.email = 'popmatch.testuser@gmail.com' THEN
    RETURN NEW;
  END IF;
  IF NEW.email NOT LIKE '%@illinois.edu' THEN
    RAISE EXCEPTION 'Only @illinois.edu email addresses are permitted.';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Update the CHECK constraint on public.users.email.
--    DROP + re-ADD because PostgreSQL does not support ALTER CONSTRAINT.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_email_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_email_check
  CHECK (
    email LIKE '%@%.edu'
    OR email = 'popmatch.testuser@gmail.com'
  );
