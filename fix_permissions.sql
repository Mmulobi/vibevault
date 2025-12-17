-- Ensure columns exist
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE echo_threads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE echo_threads ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Enable RLS
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_threads ENABLE ROW LEVEL SECURITY;

-- Policies for Confessions
-- 1. Everyone can read public confessions
CREATE POLICY "Public confessions are viewable by everyone" 
ON confessions FOR SELECT 
USING (is_public = true);

-- 2. Users can read their own private confessions
CREATE POLICY "Users can view their own private confessions" 
ON confessions FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Anyone can insert a confession (authenticated users set their user_id, anons leave it null)
-- Note: We need to allow insert for both authenticated and anon roles
CREATE POLICY "Anyone can insert confessions" 
ON confessions FOR INSERT 
WITH CHECK (true);

-- Policies for Echo Threads
-- 1. Everyone can read public threads
CREATE POLICY "Public threads are viewable by everyone" 
ON echo_threads FOR SELECT 
USING (is_public = true);

-- 2. Users can read their own private threads
CREATE POLICY "Users can view their own private threads" 
ON echo_threads FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Service Role (AI) creates threads usually, but if client creates:
CREATE POLICY "Anyone can insert threads" 
ON echo_threads FOR INSERT 
WITH CHECK (true);
