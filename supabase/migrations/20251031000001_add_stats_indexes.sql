-- Migration: Add indexes to support player statistics queries
-- Created: 2025-10-31
-- Purpose: Optimize performance for the new player statistics feature

-- Add index on games table for user_id lookups with status filter
-- This helps with filtering completed games for statistics
CREATE INDEX IF NOT EXISTS idx_games_user_status_created
  ON games(user_id, status, created_at DESC);

-- Add index on games table for category-based queries
-- Supports filtering games by category for category-specific stats
CREATE INDEX IF NOT EXISTS idx_games_user_category
  ON games(user_id, category);

-- Add composite index for game message counting
-- Helps with aggregating message counts per game
CREATE INDEX IF NOT EXISTS idx_game_messages_game_created
  ON game_messages(game_id, created_at);

-- Add index for message type filtering
-- Supports queries that need to filter by message type (e.g., counting questions)
CREATE INDEX IF NOT EXISTS idx_game_messages_type
  ON game_messages(message_type);

-- Note: Text search on message content is handled by application-level filtering
-- for flexibility in search patterns and case-insensitive matching
