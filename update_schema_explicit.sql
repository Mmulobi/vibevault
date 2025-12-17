-- Add explicit content flag to tables
ALTER TABLE echo_threads ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN DEFAULT FALSE;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN DEFAULT FALSE;

-- Add reaction support if not exists (checking just in case)
-- We assume message_reactions table exists from previous context
-- Ideally we would add a 'type' column if we want detailed reactions beyond just a count
ALTER TABLE message_reactions ADD COLUMN IF NOT EXISTS reaction_type TEXT DEFAULT 'like'; 

-- Add title to confessions
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS title TEXT; 

-- Add user ownership
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE echo_threads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id); 
