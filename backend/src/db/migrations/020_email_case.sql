-- 020_email_case.sql
-- Emails are compared ignoring capitals and stray spaces (SECURITY_RISKS.md
-- SR-33). Before this, "Josh@gmail.com" couldn't sign in as "josh@gmail.com",
-- and the two could even be registered as separate accounts.
--
-- Stores every email trimmed and in lower case, and adds a unique index on
-- lower(email) so two accounts can never differ only by capitals. Stops with a
-- clear message if existing accounts already clash, instead of failing halfway.
--   psql "$DATABASE_URL" -f backend/src/db/migrations/020_email_case.sql

BEGIN;

DO $$
DECLARE clashes TEXT;
BEGIN
  SELECT string_agg(e, ', ') INTO clashes FROM (
    SELECT lower(trim(email)) AS e FROM users GROUP BY 1 HAVING COUNT(*) > 1
  ) d;
  IF clashes IS NOT NULL THEN
    RAISE EXCEPTION 'These emails belong to more than one account (differing only by capitals or spaces): %. Merge or delete the extras, then re-run.', clashes;
  END IF;
END $$;

UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

COMMIT;
