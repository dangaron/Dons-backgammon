-- Player stats extension: ELO rating and streaks
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS elo_rating int DEFAULT 1500;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rated_games_played int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS games_lost int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_current int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_best int DEFAULT 0;
