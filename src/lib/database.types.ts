/**
 * Supabase database types — mirrors the SQL schema.
 * Regenerate with: npx supabase gen types typescript --linked > src/lib/database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          games_played: number;
          games_won: number;
          created_at: string;
          updated_at: string;
          push_subscription: string | null;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          games_played?: number;
          games_won?: number;
          push_subscription?: string | null;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          games_played?: number;
          games_won?: number;
          push_subscription?: string | null;
        };
      };
      games: {
        Row: {
          id: string;
          player_white: string;
          player_black: string | null;
          status: 'waiting' | 'active' | 'completed' | 'abandoned';
          current_player: 0 | 1;
          board: number[];
          dice: number[];
          dice_rolled: boolean;
          turn_phase: 'opening-roll' | 'roll' | 'move' | 'double-offered' | 'game-over';
          winner: string | null;
          doubling_cube_value: number;
          doubling_cube_owner: number | null;
          borne_off: [number, number];
          match_score: [number, number];
          match_length: number;
          cube_enabled: boolean;
          seed: number;
          roll_index: number;
          move_count: number;
          invite_code: string | null;
          created_at: string;
          updated_at: string;
          last_move_at: string | null;
        };
        Insert: {
          id?: string;
          player_white: string;
          player_black?: string | null;
          status?: 'waiting' | 'active' | 'completed' | 'abandoned';
          current_player?: 0 | 1;
          board: number[];
          dice?: number[];
          dice_rolled?: boolean;
          turn_phase?: 'opening-roll' | 'roll' | 'move' | 'double-offered' | 'game-over';
          doubling_cube_value?: number;
          doubling_cube_owner?: number | null;
          borne_off?: [number, number];
          match_score?: [number, number];
          match_length?: number;
          cube_enabled?: boolean;
          seed: number;
          roll_index?: number;
          invite_code?: string | null;
        };
        Update: Partial<Database['public']['Tables']['games']['Row']>;
      };
      game_moves: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          move_number: number;
          dice: number[];
          die_moves: { from: number; to: number; die: number }[];
          board_after: number[];
          created_at: string;
        };
        Insert: {
          game_id: string;
          player_id: string;
          move_number: number;
          dice: number[];
          die_moves: { from: number; to: number; die: number }[];
          board_after: number[];
        };
        Update: never;
      };
    };
    Functions: {
      validate_and_apply_move: {
        Args: {
          p_game_id: string;
          p_player_id: string;
          p_die_moves: { from: number; to: number; die: number }[];
        };
        Returns: { success: boolean; error?: string; new_board?: number[] };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type GameMove = Database['public']['Tables']['game_moves']['Row'];
