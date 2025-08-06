-- Remove duplicate messages first
DELETE FROM game_messages 
WHERE id NOT IN (
  SELECT DISTINCT ON (game_id, question_number, role) id
  FROM game_messages 
  ORDER BY game_id, question_number, role, created_at
);

-- Add unique constraint to prevent duplicate question numbers per game
ALTER TABLE game_messages 
ADD CONSTRAINT unique_game_question_role 
UNIQUE (game_id, question_number, role);