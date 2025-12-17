-- Run this in your Supabase SQL Editor to clear all user generated data
-- This preserves the 'vaults' table which contains the static categories

TRUNCATE TABLE 
  message_reactions, 
  thread_messages, 
  poll_votes, 
  polls, 
  reports, 
  echo_threads, 
  confessions, 
  vault_suggestions 
RESTART IDENTITY CASCADE;
