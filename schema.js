import { query } from './db.js';

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  payment_status TEXT NOT NULL DEFAULT 'NOT_PAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT NOT NULL,
  host_timezone TEXT NOT NULL,
  group_stage_start TIMESTAMPTZ NOT NULL,
  group_stage_end TIMESTAMPTZ NOT NULL,
  knockouts_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_stage') THEN
    CREATE TYPE match_stage AS ENUM ('GROUP','R32','R16','QF','SF','THIRD','FINAL');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage match_stage NOT NULL,
  group_name TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_utc TIMESTAMPTZ NOT NULL,
  venue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_home_goals INT,
  result_away_goals INT,
  result_finalized BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS knockout_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  advancing_team TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  predicted_home_goals INT NOT NULL,
  predicted_away_goals INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE TABLE IF NOT EXISTS prediction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  match_id UUID NOT NULL,
  predicted_home_goals INT NOT NULL,
  predicted_away_goals INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tournaments (
  id, name, year, host_timezone, group_stage_start, group_stage_end, knockouts_start
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Dummy Cup 2026',
  2026,
  'UTC',
  '2026-06-10 10:00:00+00',
  '2026-06-20 22:00:00+00',
  '2026-06-21 10:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO matches (
  id, tournament_id, stage, group_name, home_team, away_team, kickoff_utc, venue
) VALUES
  -- Group A (5 matches)
  ('20000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group A', 'Alpha', 'Bravo', '2026-06-10 12:00:00+00', 'Stadium 1'),
  ('20000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group A', 'Charlie', 'Delta', '2026-06-10 15:00:00+00', 'Stadium 1'),
  ('20000000-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group A', 'India', 'Juliet', '2026-06-10 18:00:00+00', 'Stadium 1'),
  ('20000000-0000-0000-0000-000000000006',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group A', 'Kilo', 'Lima', '2026-06-10 21:00:00+00', 'Stadium 1'),
  ('20000000-0000-0000-0000-000000000007',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group A', 'Mike', 'November', '2026-06-11 00:00:00+00', 'Stadium 1'),

  -- Group B (5 matches)
  ('20000000-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group B', 'Echo', 'Foxtrot', '2026-06-11 12:00:00+00', 'Stadium 2'),
  ('20000000-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group B', 'Golf', 'Hotel', '2026-06-11 15:00:00+00', 'Stadium 2'),
  ('20000000-0000-0000-0000-000000000008',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group B', 'Oscar', 'Papa', '2026-06-11 18:00:00+00', 'Stadium 2'),
  ('20000000-0000-0000-0000-000000000009',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group B', 'Quebec', 'Romeo', '2026-06-11 21:00:00+00', 'Stadium 2'),
  ('20000000-0000-0000-0000-000000000010',
   '11111111-1111-1111-1111-111111111111',
   'GROUP', 'Group B', 'Sierra', 'Tango', '2026-06-12 00:00:00+00', 'Stadium 2')
ON CONFLICT (id) DO NOTHING;
;

export async function ensureSchema() {
  console.log('Ensuring database schema exists...');
  await query(SCHEMA_SQL);
  console.log('Schema ensured and dummy data seeded (if needed).');
}
