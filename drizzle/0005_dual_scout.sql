-- Dual-team scouting support
-- actions: rastrear de qual equipa (home/away) vem a acção + jogador adversário referenciado
ALTER TABLE "actions"
  ADD COLUMN "side" text NOT NULL DEFAULT 'home',
  ADD COLUMN "opponent_player_id" text REFERENCES "opponent_players"("id");

-- matches: suporte a jogos de observação (dois adversários)
ALTER TABLE "matches"
  ADD COLUMN "match_type" text NOT NULL DEFAULT 'regular',
  ADD COLUMN "opponent_team_b_id" text REFERENCES "opponent_teams"("id") ON DELETE SET NULL;
