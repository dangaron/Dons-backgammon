-- Add game_type column to games table to support multiple games.
-- Default 'backgammon' to backfill existing rows.

ALTER TABLE games ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'backgammon';

-- Index for filtering by game type
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games (game_type);
