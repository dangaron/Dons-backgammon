-- Friends system
CREATE TABLE IF NOT EXISTS friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Users can update requests addressed to them (accept/decline)
CREATE POLICY "Users can respond to friend requests"
  ON friendships FOR UPDATE USING (auth.uid() = addressee_id);

-- Users can delete their own friendships
CREATE POLICY "Users can remove friendships"
  ON friendships FOR DELETE USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
