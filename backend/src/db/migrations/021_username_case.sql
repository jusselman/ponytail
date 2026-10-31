-- 021_username_case.sql
-- Usernames are compared ignoring capitals (SECURITY_RISKS.md SR-42). Before
-- this, @Josh and @josh could be two different accounts, so anyone could take a
-- near-identical copy of someone's handle.
--
-- New usernames are stored in lower case by the server. Existing usernames keep
-- their capitals (so nothing changes on screen); this adds a unique index on
-- lower(username) so no new copy can be made. Stops with a clear message if
-- existing accounts already clash.
--   psql "$DATABASE_URL" -f backend/src/db/migrations/021_username_case.sql

BEGIN;

DO $$
DECLARE clashes TEXT;
BEGIN
  SELECT string_agg(u, ', ') INTO clashes FROM (
    SELECT lower(username) AS u FROM users GROUP BY 1 HAVING COUNT(*) > 1
  ) d;
  IF clashes IS NOT NULL THEN
    RAISE EXCEPTION 'These usernames belong to more than one account (differing only by capitals): %. Rename the extras, then re-run.', clashes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));

COMMIT;
