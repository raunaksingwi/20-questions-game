-- Add Think Mode support to the 20 Questions game
-- This migration adds the mode column and adjusts constraints for Think Mode

-- Add mode column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'guess' CHECK (mode IN ('guess', 'think'));

-- Update existing games to have guess mode (backward compatibility)
UPDATE games SET mode = 'guess' WHERE mode IS NULL;

-- Make mode not null after setting defaults
ALTER TABLE games ALTER COLUMN mode SET NOT NULL;

-- Add index for mode filtering (improve query performance)
CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode);

-- Allow secret_item to be nullable for Think mode 
-- In Think mode, the user thinks of the item, so the LLM doesn't know it
ALTER TABLE games ALTER COLUMN secret_item DROP NOT NULL;

-- Add comment to document the schema change
COMMENT ON COLUMN games.mode IS 'Game mode: guess (user guesses LLM secret) or think (LLM guesses user secret)';
COMMENT ON COLUMN games.secret_item IS 'Secret item - set by LLM in guess mode, null in think mode (user thinks of it)';