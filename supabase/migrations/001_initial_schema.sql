-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  sample_items TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_item TEXT NOT NULL,
  category TEXT NOT NULL,
  questions_asked INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create game_messages table
CREATE TABLE game_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('question', 'answer', 'hint', 'guess')),
  question_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_messages_game_id ON game_messages(game_id);
CREATE INDEX idx_game_messages_created_at ON game_messages(created_at);

-- Insert default categories
INSERT INTO categories (name, sample_items) VALUES
  ('Animals', ARRAY['dog', 'cat', 'elephant', 'lion', 'penguin', 'dolphin', 'eagle', 'snake']),
  ('Food', ARRAY['pizza', 'apple', 'chocolate', 'bread', 'cheese', 'sushi', 'ice cream', 'pasta']),
  ('Objects', ARRAY['chair', 'computer', 'phone', 'book', 'car', 'bicycle', 'television', 'lamp']),
  ('Places', ARRAY['beach', 'mountain', 'library', 'restaurant', 'hospital', 'school', 'park', 'museum']),
  ('Random', ARRAY['everything']);

-- Create RLS policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories are readable by everyone
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Users can only see their own games
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can create games
CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own games
CREATE POLICY "Users can update own games" ON games
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can view messages for their games
CREATE POLICY "Users can view messages for their games" ON game_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_messages.game_id 
      AND (games.user_id = auth.uid() OR games.user_id IS NULL)
    )
  );

-- Users can create messages for their games
CREATE POLICY "Users can create messages for their games" ON game_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_messages.game_id 
      AND (games.user_id = auth.uid() OR games.user_id IS NULL)
    )
  );