/**
 * Supabase Edge Function: validate-move
 * Server-side move validation using the same engine as the client.
 *
 * Receives: { game_id, player_id, die_moves: [{from, to, die}] }
 * Validates the move is legal, applies it, updates the game state.
 *
 * Deploy: supabase functions deploy validate-move
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Inline engine (subset needed for validation) ────────────────────────────

const BAR = 24;
const HOME = 25;
const OPP_BAR = 26;

function cloneBoard(board: number[]): number[] {
  return board.slice();
}

function allCheckersHome(board: number[]): boolean {
  if (board[BAR] > 0) return false;
  for (let i = 6; i <= 23; i++) {
    if (board[i] > 0) return false;
  }
  return true;
}

interface DieMove {
  from: number;
  to: number;
  die: number;
}

function applyDieMove(board: number[], move: DieMove): number[] {
  const b = cloneBoard(board);
  const { from, to } = move;

  if (from === BAR) b[BAR]--;
  else b[from]--;

  if (to === HOME) {
    b[HOME]++;
    return b;
  }

  if (b[to] === -1) {
    b[OPP_BAR]++;
    b[to] = 1;
  } else {
    b[to]++;
  }

  return b;
}

function getLegalSingleMoves(board: number[], die: number): DieMove[] {
  const moves: DieMove[] = [];

  if (board[BAR] > 0) {
    const to = 24 - die;
    if (to >= 0 && to <= 23 && board[to] >= -1) {
      moves.push({ from: BAR, to, die });
    }
    return moves;
  }

  for (let from = 0; from <= 23; from++) {
    if (board[from] <= 0) continue;
    const to = from - die;
    if (to >= 0) {
      if (board[to] >= -1) moves.push({ from, to, die });
    } else {
      if (!allCheckersHome(board)) continue;
      let highestOccupied = -1;
      for (let p = 5; p >= 0; p--) {
        if (board[p] > 0) { highestOccupied = p; break; }
      }
      if (highestOccupied === -1 || from >= highestOccupied) {
        moves.push({ from, to: HOME, die });
      }
    }
  }
  return moves;
}

/** Validate that a single die move is legal */
function isLegalDieMove(board: number[], move: DieMove): boolean {
  const legalMoves = getLegalSingleMoves(board, move.die);
  return legalMoves.some(m => m.from === move.from && m.to === move.to);
}

// ── Edge Function ───────────────────────────────────────────────────────────

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { game_id, player_id, die_moves } = await req.json();

    if (!game_id || !player_id || !Array.isArray(die_moves)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's auth token
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    // Fetch the game
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (fetchError || !game) {
      return new Response(
        JSON.stringify({ success: false, error: 'Game not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify it's the player's turn
    const isWhite = game.player_white === player_id;
    const isBlack = game.player_black === player_id;
    if (!isWhite && !isBlack) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not a player in this game' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerIndex = isWhite ? 0 : 1;
    if (game.current_player !== playerIndex) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not your turn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (game.turn_phase !== 'move') {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot move in current phase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and apply each die move sequentially
    let board = cloneBoard(game.board);
    const remainingDice = [...game.dice];

    for (const dm of die_moves) {
      if (!isLegalDieMove(board, dm)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Illegal move: ${dm.from} → ${dm.to} with die ${dm.die}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      board = applyDieMove(board, dm);

      // Remove used die
      const idx = remainingDice.indexOf(dm.die);
      if (idx === -1) {
        return new Response(
          JSON.stringify({ success: false, error: `Die ${dm.die} not available` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      remainingDice.splice(idx, 1);
    }

    // Return the validated new board state
    return new Response(
      JSON.stringify({
        success: true,
        new_board: board,
        remaining_dice: remainingDice,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
