import { query } from './db.js';

const SCHEMA_SQL = `
-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_admin BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'none'
);

-- =========================
-- PREDICTIONS
-- =========================
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  predicted_home_goals INTEGER NOT NULL,
  predicted_away_goals INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);
-- =========================
-- PREDICTION HISTORY
-- =========================
CREATE TABLE IF NOT EXISTS prediction_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  predicted_home_goals INTEGER NOT NULL,
  predicted_away_goals INTEGER NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);





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

-- =========================
-- MATCHES – LIVE WEEKEND FIXTURES
-- =========================
DELETE FROM matches;

INSERT INTO matches (
  id, tournament_id, stage, group_name, home_team, away_team, kickoff_utc, venue
) VALUES

-- ===== GROUP A – SATURDAY =====
('30000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','GROUP','Group A','West Ham','Sunderland','2026-01-17 12:30:00+00','UK'),
('30000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','GROUP','Group A','Burnley','Spurs','2026-01-17 15:00:00+00','UK'),
('30000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','GROUP','Group A','Fulham','Brighton','2026-01-17 15:00:00+00','UK'),
('30000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','GROUP','Group A','Man City','Wolves','2026-01-17 15:00:00+00','UK'),
('30000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','GROUP','Group A','AFC Bournemouth','Liverpool','2026-01-17 17:30:00+00','UK'),

-- ===== GROUP B – SUNDAY =====
('30000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','GROUP','Group B','Brentford','Nottingham Forest','2026-01-18 14:00:00+00','UK'),
('30000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','GROUP','Group B','Crystal Palace','Chelsea','2026-01-18 14:00:00+00','UK'),
('30000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','GROUP','Group B','Newcastle','Aston Villa','2026-01-18 14:00:00+00','UK'),
('30000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','GROUP','Group B','Arsenal','Manchester United','2026-01-18 16:30:00+00','UK'),

-- ===== GROUP B – MONDAY =====
('30000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','GROUP','Group B','Everton','Leeds','2026-01-19 20:00:00+00','UK')
ON CONFLICT (id) DO NOTHING;


export async function ensureSchema() {
  console.log('Ensuring database schema exists...');
  await query(SCHEMA_SQL);
  console.log('Schema ensured.');
}
