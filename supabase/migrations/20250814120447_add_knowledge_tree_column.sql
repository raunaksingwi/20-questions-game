-- Add knowledge_tree column to games table to store structured knowledge trees
-- This replaces raw conversation history with a structured JSON representation

ALTER TABLE games 
ADD COLUMN knowledge_tree JSONB DEFAULT '{}';

-- Add index for efficient knowledge tree queries
CREATE INDEX idx_games_knowledge_tree ON games USING GIN (knowledge_tree);

-- Add comment explaining the column
COMMENT ON COLUMN games.knowledge_tree IS 'Structured JSON knowledge tree built from Q&A history, containing confirmed facts organized by categories (geography, role, era, etc.) with yes/no/maybe/unknown classifications';