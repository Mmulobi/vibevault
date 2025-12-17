-- Run this script in your Supabase SQL Editor to enable Realtime for all tables

-- 1. Enable replication for the tables
alter publication supabase_realtime add table echo_threads;
alter publication supabase_realtime add table thread_messages;
alter publication supabase_realtime add table vaults;
alter publication supabase_realtime add table message_reactions;
alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table poll_votes;
alter publication supabase_realtime add table vault_suggestions;

-- 2. Verify it worked
select * from pg_publication_tables where pubname = 'supabase_realtime';
