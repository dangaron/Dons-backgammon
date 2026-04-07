-- Backgammon Phase 2: multiplayer schema
-- Run this in your Supabase SQL Editor

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  games_played int default 0 not null,
  games_won int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  push_subscription jsonb
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Games ────────────────────────────────────────────────────────────────────
create type game_status as enum ('waiting', 'active', 'completed', 'abandoned');

create table if not exists public.games (
  id uuid default gen_random_uuid() primary key,
  player_white uuid references public.profiles(id) not null,
  player_black uuid references public.profiles(id),
  status game_status default 'waiting' not null,
  current_player smallint default 0 not null check (current_player in (0, 1)),
  board int[] not null,
  dice int[] default '{}' not null,
  dice_rolled boolean default false not null,
  turn_phase text default 'opening-roll' not null,
  winner uuid references public.profiles(id),
  doubling_cube_value int default 1 not null,
  doubling_cube_owner smallint check (doubling_cube_owner in (0, 1)),
  borne_off int[] default '{0,0}' not null,
  match_score int[] default '{0,0}' not null,
  match_length int default 1 not null,
  cube_enabled boolean default true not null,
  seed bigint not null,
  roll_index int default 0 not null,
  move_count int default 0 not null,
  invite_code text unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_move_at timestamptz
);

create index idx_games_player_white on public.games(player_white);
create index idx_games_player_black on public.games(player_black);
create index idx_games_status on public.games(status);
create index idx_games_invite_code on public.games(invite_code) where invite_code is not null;

alter table public.games enable row level security;

create policy "Players can view their games"
  on public.games for select using (
    auth.uid() = player_white or auth.uid() = player_black
  );

create policy "Waiting games are viewable for joining"
  on public.games for select using (
    status = 'waiting' and invite_code is not null
  );

create policy "Authenticated users can create games"
  on public.games for insert with check (auth.uid() = player_white);

create policy "Players can update their games"
  on public.games for update using (
    auth.uid() = player_white or auth.uid() = player_black
  );

-- ── Game Moves (audit trail) ─────────────────────────────────────────────────
create table if not exists public.game_moves (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  player_id uuid references public.profiles(id) not null,
  move_number int not null,
  dice int[] not null,
  die_moves jsonb not null,
  board_after int[] not null,
  created_at timestamptz default now() not null
);

create index idx_game_moves_game_id on public.game_moves(game_id);

alter table public.game_moves enable row level security;

create policy "Players can view moves for their games"
  on public.game_moves for select using (
    exists (
      select 1 from public.games g
      where g.id = game_id
      and (auth.uid() = g.player_white or auth.uid() = g.player_black)
    )
  );

create policy "Players can insert moves for their games"
  on public.game_moves for insert with check (auth.uid() = player_id);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime for games table so players see opponent moves instantly
alter publication supabase_realtime add table public.games;

-- ── Updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at_games
  before update on public.games
  for each row execute procedure public.update_updated_at();
