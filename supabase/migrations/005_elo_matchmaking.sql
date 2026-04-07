-- Matchmaking queue for ranked play
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  rating int NOT NULL DEFAULT 1500,
  match_length int DEFAULT 1,
  game_type text DEFAULT 'backgammon',
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
  matched_game_id uuid REFERENCES games(id)
);

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can manage own queue entry"
  ON matchmaking_queue FOR ALL USING (auth.uid() = player_id);

CREATE POLICY "Players can view waiting entries"
  ON matchmaking_queue FOR SELECT USING (status = 'waiting');

-- Add ranked flag to games
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT false;

-- Enable realtime for matchmaking
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
