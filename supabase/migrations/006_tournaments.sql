-- Tournament system
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text CHECK (type IN ('sit-and-go', 'scheduled')) NOT NULL,
  status text CHECK (status IN ('registering', 'active', 'completed')) DEFAULT 'registering',
  game_type text DEFAULT 'backgammon',
  max_players int NOT NULL DEFAULT 4,
  match_length int DEFAULT 3,
  bracket jsonb DEFAULT '{}',
  starts_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  seed int,
  eliminated boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (tournament_id, player_id)
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournaments
CREATE POLICY "Tournaments are publicly viewable"
  ON tournaments FOR SELECT USING (true);

-- Authenticated users can create
CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Creator can update
CREATE POLICY "Creator can update tournament"
  ON tournaments FOR UPDATE USING (auth.uid() = created_by);

-- Everyone can view participants
CREATE POLICY "Tournament participants are viewable"
  ON tournament_participants FOR SELECT USING (true);

-- Players can join/leave
CREATE POLICY "Players can join tournaments"
  ON tournament_participants FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can leave tournaments"
  ON tournament_participants FOR DELETE USING (auth.uid() = player_id);

ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
