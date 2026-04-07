-- Spectating: make games publicly viewable
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Anyone can spectate public active games
CREATE POLICY "Anyone can spectate public games"
  ON games FOR SELECT USING (is_public = true AND status = 'active');

-- Anyone can view moves of public games
CREATE POLICY "Anyone can view moves of public games"
  ON game_moves FOR SELECT USING (
    EXISTS (SELECT 1 FROM games g WHERE g.id = game_id AND g.is_public = true)
  );
