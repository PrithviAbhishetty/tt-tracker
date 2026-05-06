export interface PlayerRow {
  id: string;
  display_name: string;
  user_id: string | null;
  elo_rating: number;
  games_played: number;
  is_active: boolean;
}

export interface MatchRecord {
  client_uuid: string;
  match_type: "singles" | "doubles";
  winning_side: 1 | 2;
  played_at: string; // ISO
  side1_player_ids: string[];
  side2_player_ids: string[];
  tournament_match_id?: string;
}
