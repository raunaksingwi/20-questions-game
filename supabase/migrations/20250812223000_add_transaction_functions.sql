-- Add database transaction functions for better atomicity and consistency

-- Function to handle user answer submission with transaction
CREATE OR REPLACE FUNCTION submit_user_answer_transaction(
  p_session_id UUID,
  p_next_question TEXT,
  p_questions_asked INTEGER,
  p_question_number INTEGER,
  p_timestamp TIMESTAMPTZ
) 
RETURNS VOID AS $$
BEGIN
  -- Insert LLM's next question
  INSERT INTO game_messages (
    game_id,
    role,
    content,
    message_type,
    question_number,
    created_at
  ) VALUES (
    p_session_id,
    'assistant',
    p_next_question,
    'question',
    p_question_number,
    p_timestamp
  );
  
  -- Update game state
  UPDATE games 
  SET 
    questions_asked = p_questions_asked,
    updated_at = p_timestamp
  WHERE id = p_session_id;
  
  -- Verify the update affected exactly one row
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update game with id: %', p_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the function
COMMENT ON FUNCTION submit_user_answer_transaction IS 'Atomically insert LLM question and update game state for think mode';