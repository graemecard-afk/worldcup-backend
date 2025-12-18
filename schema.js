import { query } from './db.js';

const SCHEMA_SQL = `
-- =========================
-- TOURNAMENTS
-- =========================
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  host_timezone TEXT NOT NULL,
  group_stage_start TIMESTAMPTZ NOT NULL,
  group_stage_end TIMESTAMPTZ NOT NULL,
  knockouts_start TIMESTAMPTZ NOT NULL
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

-- =========================
-- MATCHES
-- =========================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  stage TEXT NOT NULL,
  group_name TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_utc TIMESTAMPTZ NOT NULL,
  venue TEXT,
  result_home_goals INTEGER,
  result_away_goals INTEGER,
  result_finalized BOOLEAN DEFAULT FALSE
);

INSERT INTO matches (
  id, tournament_id, stage, group_name, home_team, away_team, kickoff_utc, venue
) VALUES
  -- Group A (5)
  ('20000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','GROUP','Group A','Alpha','Bravo','2026-06-10 12:00:00+00','Stadium 1'),
  ('20000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','GROUP','Group A','Charlie','Delta','2026-06-10 15:00:00+00','Stadium 1'),
  ('20000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','GROUP','Group A','India','Juliet','2026-06-10 18:00:00+00','Stadium 1'),
  ('20000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','GROUP','Group A','Kilo','Lima','2026-06-10 21:00:00+00','Stadium 1'),
  ('20000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','GROUP','Group A','Mike','November','2026-06-11 00:00:00+00','Stadium 1'),

  -- Group B (5)
  ('20000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','GROUP','Group B','Echo','Foxtrot','2026-06-11 12:00:00+00','Stadium 2'),
  ('20000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','GROUP','Group B','Golf','Hotel','2026-06-11 15:00:00+00','Stadium 2'),
  ('20000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','GROUP','Group B','Oscar','Papa','2026-06-11 18:00:00+00','Stadium 2'),
  ('20000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','GROUP','Group B','Quebec','Romeo','2026-06-11 21:00:00+00','Stadium 2'),
  ('20000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','GROUP','Group B','Sierra','Tango','2026-06-12 00:00:00+00','Stadium 2')
ON CONFLICT (id) DO NOTHING;
-- =========================
-- UPDATE team names to Premier League fixtures
-- =========================
UPDATE matches SET home_team = 'Arsenal', away_team = 'Chelsea'
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE matches SET home_team = 'Liverpool', away_team = 'Manchester United'
WHERE id = '20000000-0000-0000-0000-000000000002';

UPDATE matches SET home_team = 'Manchester City', away_team = 'Tottenham Hotspur'
WHERE id = '20000000-0000-0000-0000-000000000005';

UPDATE matches SET home_team = 'Newcastle United', away_team = 'Aston Villa'
WHERE id = '20000000-0000-0000-0000-000000000006';

UPDATE matches SET home_team = 'Brighton & Hove Albion', away_team = 'West Ham United'
WHERE id = '20000000-0000-0000-0000-000000000007';

UPDATE matches SET home_team = 'Everton', away_team = 'Wolverhampton Wanderers'
WHERE id = '20000000-0000-0000-0000-000000000003';

UPDATE matches SET home_team = 'Crystal Palace', away_team = 'Fulham'
WHERE id = '20000000-0000-0000-0000-000000000004';

UPDATE matches SET home_team = 'Brentford', away_team = 'Bournemouth'
WHERE id = '20000000-0000-0000-0000-000000000008';

UPDATE matches SET home_team = 'Nottingham Forest', away_team = 'Burnley'
WHERE id = '20000000-0000-0000-0000-000000000009';

UPDATE matches SET home_team = 'Sheffield United', away_team = 'Luton Town'
WHERE id = '20000000-0000-0000-0000-000000000010';

`;

export async function ensureSchema() {
  console.log('Ensuring database schema exists...');
  await query(SCHEMA_SQL);
  console.log('Schema ensured and seed data applied.');
}
