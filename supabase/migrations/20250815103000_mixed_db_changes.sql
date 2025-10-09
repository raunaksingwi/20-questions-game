BEGIN;
ALTER TABLE categories ADD COLUMN popularity_score INTEGER DEFAULT 0 NOT NULL;
CREATE INDEX idx_games_user_id_created_at ON games(user_id, created_at DESC);
DROP INDEX IF EXISTS idx_game_messages_created_at;
ALTER TABLE games DROP CONSTRAINT games_status_check;
ALTER TABLE game_messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE game_messages ALTER COLUMN message_type DROP NOT NULL;
CREATE INDEX idx_game_messages_game_id_created_at ON game_messages(game_id, created_at DESC);
COMMIT;
