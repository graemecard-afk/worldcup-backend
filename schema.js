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
  'FIFA Men''s World Cup 2026',
  2026,
  'UTC',
  '2026-06-10 10:00:00+00',
  '2026-06-20 22:00:00+00',
  '2026-06-21 10:00:00+00'
)
ON CONFLICT (id) DO NOTHING;
UPDATE tournaments
SET name = 'FIFA Men''s World Cup 2026'
WHERE id = '11111111-1111-1111-1111-111111111111';
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
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS actual_advancing_team TEXT;

-- Remove old rehearsal fixtures
DELETE FROM matches
WHERE id::text LIKE '20000000-%';

-- =========================
-- SEED GROUP STAGE MATCHES (WORLD CUP 2026)
-- =========================
INSERT INTO matches (
  id, tournament_id, stage, group_name, home_team, away_team, kickoff_utc, venue
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 1',
    'Group A',
    'Mexico',
    'South Africa',
    '2026-06-11 19:00:00+00',
    'Mexico City'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 1',
    'Group A',
    'South Korea',
    'Czech Republic',
    '2026-06-12 02:00:00+00',
    'Guadalajara (Zapopan)'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 8',
    'Group A',
    'Czech Republic',
    'South Africa',
    '2026-06-18 16:00:00+00',
    'Atlanta'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 8',
    'Group A',
    'Mexico',
    'South Korea',
    '2026-06-19 01:00:00+00',
    'Guadalajara (Zapopan)'
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 14',
    'Group A',
    'Czech Republic',
    'Mexico',
    '2026-06-25 01:00:00+00',
    'Mexico City'
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 14',
    'Group A',
    'South Africa',
    'South Korea',
    '2026-06-25 01:00:00+00',
    'Monterrey (Guadalupe)'
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 2',
    'Group B',
    'Canada',
    'Bosnia & Herzegovina',
    '2026-06-12 19:00:00+00',
    'Toronto'
  ),
  (
    '30000000-0000-0000-0000-000000000008',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 3',
    'Group B',
    'Qatar',
    'Switzerland',
    '2026-06-13 19:00:00+00',
    'San Francisco Bay Area (Santa Clara)'
  ),
  (
    '30000000-0000-0000-0000-000000000009',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 8',
    'Group B',
    'Switzerland',
    'Bosnia & Herzegovina',
    '2026-06-18 19:00:00+00',
    'Los Angeles (Inglewood)'
  ),
  (
    '30000000-0000-0000-0000-000000000010',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 8',
    'Group B',
    'Canada',
    'Qatar',
    '2026-06-18 22:00:00+00',
    'Vancouver'
  ),
  (
    '30000000-0000-0000-0000-000000000011',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 14',
    'Group B',
    'Switzerland',
    'Canada',
    '2026-06-24 19:00:00+00',
    'Vancouver'
  ),
  (
    '30000000-0000-0000-0000-000000000012',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 14',
    'Group B',
    'Bosnia & Herzegovina',
    'Qatar',
    '2026-06-24 19:00:00+00',
    'Seattle'
  ),
  (
    '30000000-0000-0000-0000-000000000013',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 3',
    'Group C',
    'Brazil',
    'Morocco',
    '2026-06-13 22:00:00+00',
    'New York/New Jersey (East Rutherford)'
  ),
  (
    '30000000-0000-0000-0000-000000000014',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 3',
    'Group C',
    'Haiti',
    'Scotland',
    '2026-06-14 01:00:00+00',
    'Boston (Foxborough)'
  ),
  (
    '30000000-0000-0000-0000-000000000015',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 9',
    'Group C',
    'Scotland',
    'Morocco',
    '2026-06-19 22:00:00+00',
    'Boston (Foxborough)'
  ),
  (
    '30000000-0000-0000-0000-000000000016',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 9',
    'Group C',
    'Brazil',
    'Haiti',
    '2026-06-20 00:30:00+00',
    'Philadelphia'
  ),
  (
    '30000000-0000-0000-0000-000000000017',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 14',
    'Group C',
    'Scotland',
    'Brazil',
    '2026-06-24 22:00:00+00',
    'Miami (Miami Gardens)'
  ),
  (
    '30000000-0000-0000-0000-000000000018',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 14',
    'Group C',
    'Morocco',
    'Haiti',
    '2026-06-24 22:00:00+00',
    'Atlanta'
  ),
  (
    '30000000-0000-0000-0000-000000000019',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 2',
    'Group D',
    'USA',
    'Paraguay',
    '2026-06-13 01:00:00+00',
    'Los Angeles (Inglewood)'
  ),
  (
    '30000000-0000-0000-0000-000000000020',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 3',
    'Group D',
    'Australia',
    'Turkey',
    '2026-06-14 04:00:00+00',
    'Vancouver'
  ),
  (
    '30000000-0000-0000-0000-000000000021',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 9',
    'Group D',
    'USA',
    'Australia',
    '2026-06-19 19:00:00+00',
    'Seattle'
  ),
  (
    '30000000-0000-0000-0000-000000000022',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 9',
    'Group D',
    'Turkey',
    'Paraguay',
    '2026-06-20 03:00:00+00',
    'San Francisco Bay Area (Santa Clara)'
  ),
  (
    '30000000-0000-0000-0000-000000000023',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 15',
    'Group D',
    'Turkey',
    'USA',
    '2026-06-26 02:00:00+00',
    'Los Angeles (Inglewood)'
  ),
  (
    '30000000-0000-0000-0000-000000000024',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 15',
    'Group D',
    'Paraguay',
    'Australia',
    '2026-06-26 02:00:00+00',
    'San Francisco Bay Area (Santa Clara)'
  ),
  (
    '30000000-0000-0000-0000-000000000025',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 4',
    'Group E',
    'Germany',
    'Curaçao',
    '2026-06-14 17:00:00+00',
    'Houston'
  ),
  (
    '30000000-0000-0000-0000-000000000026',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 4',
    'Group E',
    'Ivory Coast',
    'Ecuador',
    '2026-06-14 23:00:00+00',
    'Philadelphia'
  ),
  (
    '30000000-0000-0000-0000-000000000027',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 10',
    'Group E',
    'Germany',
    'Ivory Coast',
    '2026-06-20 20:00:00+00',
    'Toronto'
  ),
  (
    '30000000-0000-0000-0000-000000000028',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 10',
    'Group E',
    'Ecuador',
    'Curaçao',
    '2026-06-21 00:00:00+00',
    'Kansas City'
  ),
  (
    '30000000-0000-0000-0000-000000000029',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 15',
    'Group E',
    'Curaçao',
    'Ivory Coast',
    '2026-06-25 20:00:00+00',
    'Philadelphia'
  ),
  (
    '30000000-0000-0000-0000-000000000030',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 15',
    'Group E',
    'Ecuador',
    'Germany',
    '2026-06-25 20:00:00+00',
    'New York/New Jersey (East Rutherford)'
  ),
  (
    '30000000-0000-0000-0000-000000000031',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 4',
    'Group F',
    'Netherlands',
    'Japan',
    '2026-06-14 20:00:00+00',
    'Dallas (Arlington)'
  ),
  (
    '30000000-0000-0000-0000-000000000032',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 4',
    'Group F',
    'Sweden',
    'Tunisia',
    '2026-06-15 02:00:00+00',
    'Monterrey (Guadalupe)'
  ),
  (
    '30000000-0000-0000-0000-000000000033',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 10',
    'Group F',
    'Netherlands',
    'Sweden',
    '2026-06-20 17:00:00+00',
    'Houston'
  ),
  (
    '30000000-0000-0000-0000-000000000034',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 10',
    'Group F',
    'Tunisia',
    'Japan',
    '2026-06-21 04:00:00+00',
    'Monterrey (Guadalupe)'
  ),
  (
    '30000000-0000-0000-0000-000000000035',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 15',
    'Group F',
    'Japan',
    'Sweden',
    '2026-06-25 23:00:00+00',
    'Dallas (Arlington)'
  ),
  (
    '30000000-0000-0000-0000-000000000036',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 15',
    'Group F',
    'Tunisia',
    'Netherlands',
    '2026-06-25 23:00:00+00',
    'Kansas City'
  ),
  (
    '30000000-0000-0000-0000-000000000037',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 5',
    'Group G',
    'Belgium',
    'Egypt',
    '2026-06-15 19:00:00+00',
    'Seattle'
  ),
  (
    '30000000-0000-0000-0000-000000000038',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 5',
    'Group G',
    'Iran',
    'New Zealand',
    '2026-06-16 01:00:00+00',
    'Los Angeles (Inglewood)'
  ),
  (
    '30000000-0000-0000-0000-000000000039',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 11',
    'Group G',
    'Belgium',
    'Iran',
    '2026-06-21 19:00:00+00',
    'Los Angeles (Inglewood)'
  ),
  (
    '30000000-0000-0000-0000-000000000040',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 11',
    'Group G',
    'New Zealand',
    'Egypt',
    '2026-06-22 01:00:00+00',
    'Vancouver'
  ),
  (
    '30000000-0000-0000-0000-000000000041',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 16',
    'Group G',
    'Egypt',
    'Iran',
    '2026-06-27 03:00:00+00',
    'Seattle'
  ),
  (
    '30000000-0000-0000-0000-000000000042',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 16',
    'Group G',
    'New Zealand',
    'Belgium',
    '2026-06-27 03:00:00+00',
    'Vancouver'
  ),
  (
    '30000000-0000-0000-0000-000000000043',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 5',
    'Group H',
    'Spain',
    'Cape Verde',
    '2026-06-15 16:00:00+00',
    'Atlanta'
  ),
  (
    '30000000-0000-0000-0000-000000000044',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 5',
    'Group H',
    'Saudi Arabia',
    'Uruguay',
    '2026-06-15 22:00:00+00',
    'Miami (Miami Gardens)'
  ),
  (
    '30000000-0000-0000-0000-000000000045',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 11',
    'Group H',
    'Spain',
    'Saudi Arabia',
    '2026-06-21 16:00:00+00',
    'Atlanta'
  ),
  (
    '30000000-0000-0000-0000-000000000046',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 11',
    'Group H',
    'Uruguay',
    'Cape Verde',
    '2026-06-21 22:00:00+00',
    'Miami (Miami Gardens)'
  ),
  (
    '30000000-0000-0000-0000-000000000047',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 16',
    'Group H',
    'Cape Verde',
    'Saudi Arabia',
    '2026-06-27 00:00:00+00',
    'Houston'
  ),
  (
    '30000000-0000-0000-0000-000000000048',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 16',
    'Group H',
    'Uruguay',
    'Spain',
    '2026-06-27 00:00:00+00',
    'Guadalajara (Zapopan)'
  ),
  (
    '30000000-0000-0000-0000-000000000049',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 6',
    'Group I',
    'France',
    'Senegal',
    '2026-06-16 19:00:00+00',
    'New York/New Jersey (East Rutherford)'
  ),
  (
    '30000000-0000-0000-0000-000000000050',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 6',
    'Group I',
    'Iraq',
    'Norway',
    '2026-06-16 22:00:00+00',
    'Boston (Foxborough)'
  ),
  (
    '30000000-0000-0000-0000-000000000051',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 12',
    'Group I',
    'France',
    'Iraq',
    '2026-06-22 21:00:00+00',
    'Philadelphia'
  ),
  (
    '30000000-0000-0000-0000-000000000052',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 12',
    'Group I',
    'Norway',
    'Senegal',
    '2026-06-23 00:00:00+00',
    'New York/New Jersey (East Rutherford)'
  ),
  (
    '30000000-0000-0000-0000-000000000053',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 16',
    'Group I',
    'Norway',
    'France',
    '2026-06-26 19:00:00+00',
    'Boston (Foxborough)'
  ),
  (
    '30000000-0000-0000-0000-000000000054',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 16',
    'Group I',
    'Senegal',
    'Iraq',
    '2026-06-26 19:00:00+00',
    'Toronto'
  ),
  (
    '30000000-0000-0000-0000-000000000055',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 6',
    'Group J',
    'Argentina',
    'Algeria',
    '2026-06-17 01:00:00+00',
    'Kansas City'
  ),
  (
    '30000000-0000-0000-0000-000000000056',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 6',
    'Group J',
    'Austria',
    'Jordan',
    '2026-06-17 04:00:00+00',
    'San Francisco Bay Area (Santa Clara)'
  ),
  (
    '30000000-0000-0000-0000-000000000057',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 12',
    'Group J',
    'Argentina',
    'Austria',
    '2026-06-22 17:00:00+00',
    'Dallas (Arlington)'
  ),
  (
    '30000000-0000-0000-0000-000000000058',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 12',
    'Group J',
    'Jordan',
    'Algeria',
    '2026-06-23 03:00:00+00',
    'San Francisco Bay Area (Santa Clara)'
  ),
  (
    '30000000-0000-0000-0000-000000000059',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 17',
    'Group J',
    'Algeria',
    'Austria',
    '2026-06-28 02:00:00+00',
    'Kansas City'
  ),
  (
    '30000000-0000-0000-0000-000000000060',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 17',
    'Group J',
    'Jordan',
    'Argentina',
    '2026-06-28 02:00:00+00',
    'Dallas (Arlington)'
  ),
  (
    '30000000-0000-0000-0000-000000000061',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 7',
    'Group K',
    'Portugal',
    'DR Congo',
    '2026-06-17 17:00:00+00',
    'Houston'
  ),
  (
    '30000000-0000-0000-0000-000000000062',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 7',
    'Group K',
    'Uzbekistan',
    'Colombia',
    '2026-06-18 02:00:00+00',
    'Mexico City'
  ),
  (
    '30000000-0000-0000-0000-000000000063',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 13',
    'Group K',
    'Portugal',
    'Uzbekistan',
    '2026-06-23 17:00:00+00',
    'Houston'
  ),
  (
    '30000000-0000-0000-0000-000000000064',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 13',
    'Group K',
    'Colombia',
    'DR Congo',
    '2026-06-24 02:00:00+00',
    'Guadalajara (Zapopan)'
  ),
  (
    '30000000-0000-0000-0000-000000000065',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 17',
    'Group K',
    'Colombia',
    'Portugal',
    '2026-06-27 23:30:00+00',
    'Miami (Miami Gardens)'
  ),
  (
    '30000000-0000-0000-0000-000000000066',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 17',
    'Group K',
    'DR Congo',
    'Uzbekistan',
    '2026-06-27 23:30:00+00',
    'Atlanta'
  ),
  (
    '30000000-0000-0000-0000-000000000067',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 7',
    'Group L',
    'England',
    'Croatia',
    '2026-06-17 20:00:00+00',
    'Dallas (Arlington)'
  ),
  (
    '30000000-0000-0000-0000-000000000068',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 7',
    'Group L',
    'Ghana',
    'Panama',
    '2026-06-17 23:00:00+00',
    'Toronto'
  ),
  (
    '30000000-0000-0000-0000-000000000069',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 13',
    'Group L',
    'England',
    'Ghana',
    '2026-06-23 20:00:00+00',
    'Boston (Foxborough)'
  ),
  (
    '30000000-0000-0000-0000-000000000070',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 13',
    'Group L',
    'Panama',
    'Croatia',
    '2026-06-23 23:00:00+00',
    'Toronto'
  ),
  (
    '30000000-0000-0000-0000-000000000071',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 17',
    'Group L',
    'Panama',
    'England',
    '2026-06-27 21:00:00+00',
    'New York/New Jersey (East Rutherford)'
  ),
  (
    '30000000-0000-0000-0000-000000000072',
    '11111111-1111-1111-1111-111111111111',
    'Matchday 17',
    'Group L',
    'Croatia',
    'Ghana',
    '2026-06-27 21:00:00+00',
    'Philadelphia'
  )
ON CONFLICT (id) DO NOTHING;

-- =========================
-- SEED ROUND OF 32 MATCHES (WORLD CUP 2026)
-- =========================
INSERT INTO matches (
  id, tournament_id, stage, group_name, home_team, away_team, kickoff_utc, venue
) VALUES
  (
    '40000000-0000-0000-0000-000000000073',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M73',
    'Aotearoa',
    '2B',
    '2026-06-29 07:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000074',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M74',
    '1E',
    '3ABCDF',
    '2026-06-30 08:30:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000075',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M75',
    '1F',
    '2C',
    '2026-06-30 13:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000076',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M76',
    '1C',
    '2F',
    '2026-06-30 05:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000077',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M77',
    '1I',
    '3CDFGH',
    '2026-07-01 09:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000078',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M78',
    '2E',
    '2I',
    '2026-07-01 05:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000079',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M79',
    '1A',
    '3CEFHI',
    '2026-07-01 13:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000080',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M80',
    '1L',
    '3EHIJK',
    '2026-07-02 04:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000081',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M81',
    '1D',
    '3BEFIJ',
    '2026-07-02 12:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000082',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M82',
    '1G',
    '3AEHIJ',
    '2026-07-02 08:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000083',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M83',
    '2K',
    '2L',
    '2026-07-03 11:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000084',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M84',
    '1H',
    '2J',
    '2026-07-03 07:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000085',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M85',
    '1B',
    '3EFGIJ',
    '2026-07-03 15:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000086',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M86',
    '1J',
    '2H',
    '2026-07-04 10:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000087',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M87',
    '1K',
    '3DEIJL',
    '2026-07-04 13:30:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000088',
    '11111111-1111-1111-1111-111111111111',
    'Round of 32',
    'M88',
    '2D',
    '2G',
    '2026-07-04 06:00:00+00',
    'TBD'
  )
ON CONFLICT (id) DO NOTHING;

-- =========================
-- SEED REMAINING KNOCKOUT MATCHES (WORLD CUP 2026)
-- =========================
INSERT INTO matches (
  id, tournament_id, stage, group_name, home_team, away_team, kickoff_utc, venue
) VALUES
  (
    '40000000-0000-0000-0000-000000000089',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M89',
    'W74',
    'W77',
    '2026-07-05 09:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000090',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M90',
    'W73',
    'W75',
    '2026-07-05 05:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000091',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M91',
    'W76',
    'W78',
    '2026-07-06 08:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000092',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M92',
    'W79',
    'W80',
    '2026-07-06 12:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000093',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M93',
    'W83',
    'W84',
    '2026-07-07 07:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000094',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M94',
    'W81',
    'W82',
    '2026-07-07 12:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000095',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M95',
    'W86',
    'W88',
    '2026-07-08 04:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000096',
    '11111111-1111-1111-1111-111111111111',
    'Round of 16',
    'M96',
    'W85',
    'W87',
    '2026-07-08 08:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000097',
    '11111111-1111-1111-1111-111111111111',
    'Quarter-final',
    'M97',
    'W89',
    'W90',
    '2026-07-10 08:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000098',
    '11111111-1111-1111-1111-111111111111',
    'Quarter-final',
    'M98',
    'W93',
    'W94',
    '2026-07-11 07:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000099',
    '11111111-1111-1111-1111-111111111111',
    'Quarter-final',
    'M99',
    'W91',
    'W92',
    '2026-07-12 09:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000100',
    '11111111-1111-1111-1111-111111111111',
    'Quarter-final',
    'M100',
    'W95',
    'W96',
    '2026-07-12 13:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000101',
    '11111111-1111-1111-1111-111111111111',
    'Semi-final',
    'M101',
    'W97',
    'W98',
    '2026-07-15 07:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000102',
    '11111111-1111-1111-1111-111111111111',
    'Semi-final',
    'M102',
    'W99',
    'W100',
    '2026-07-16 07:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000103',
    '11111111-1111-1111-1111-111111111111',
    'Third-place Play-off',
    'M103',
    'RU101',
    'RU102',
    '2026-07-19 09:00:00+00',
    'TBD'
  ),
  (
    '40000000-0000-0000-0000-000000000104',
    '11111111-1111-1111-1111-111111111111',
    'Final',
    'M104',
    'W101',
    'W102',
    '2026-07-20 07:00:00+00',
    'TBD'
  )
ON CONFLICT (id) DO NOTHING;

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
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS predicted_advancing_team TEXT;
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS predicted_home_team TEXT;
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS predicted_away_team TEXT;

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
ALTER TABLE prediction_history
ADD COLUMN IF NOT EXISTS predicted_advancing_team TEXT;
ALTER TABLE prediction_history
ADD COLUMN IF NOT EXISTS predicted_home_team TEXT;
ALTER TABLE prediction_history
ADD COLUMN IF NOT EXISTS predicted_away_team TEXT;

`;

export async function ensureSchema() {
  console.log('Ensuring database schema exists...');
  await query(SCHEMA_SQL);
  console.log('Schema ensured.');
}
