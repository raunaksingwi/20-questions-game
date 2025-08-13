-- Update game modes to use clearer naming
-- Change 'guess' to 'user_guessing' and 'think' to 'ai_guessing'

-- First, update the check constraint to allow both old and new values temporarily
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_mode_check;
ALTER TABLE games ADD CONSTRAINT games_mode_check CHECK (mode IN ('guess', 'think', 'user_guessing', 'ai_guessing'));

-- Update existing data
UPDATE games SET mode = 'user_guessing' WHERE mode = 'guess';
UPDATE games SET mode = 'ai_guessing' WHERE mode = 'think';

-- Now update the constraint to only allow new values
ALTER TABLE games DROP CONSTRAINT games_mode_check;
ALTER TABLE games ADD CONSTRAINT games_mode_check CHECK (mode IN ('user_guessing', 'ai_guessing'));

-- Update the default value
ALTER TABLE games ALTER COLUMN mode SET DEFAULT 'user_guessing';

-- Update comments to reflect new naming
COMMENT ON COLUMN games.mode IS 'Game mode: user_guessing (user guesses AI secret) or ai_guessing (AI guesses user secret)';
COMMENT ON COLUMN games.secret_item IS 'Secret item - set by AI in user_guessing mode, null in ai_guessing mode (user thinks of it)';