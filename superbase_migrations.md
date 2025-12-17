-- 1. Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector"; -- attempt to enable pgvector

-- 2. Create Tables (if they don't exist)
create table if not exists vaults (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  icon text default 'default',
  created_at timestamp with time zone default now()
);

create table if not exists confessions (
  id uuid primary key default uuid_generate_v4(),
  vault_id uuid references vaults(id) on delete cascade,
  content text not null,
  mood text,
  anon_hash text not null,
  toxicity_score float default 0,
  embedding vector(384), -- Compatible with all-MiniLM-L6-v2
  created_at timestamp with time zone default now()
);

create table if not exists echo_threads (
  id uuid primary key default uuid_generate_v4(),
  vault_id uuid references vaults(id) on delete cascade,
  is_public boolean default false,
  last_activity_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists thread_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references echo_threads(id) on delete cascade,
  confession_id uuid references confessions(id),
  content text not null,
  anon_hash text not null,
  created_at timestamp with time zone default now()
);

-- reactions table
create table if not exists message_reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references thread_messages(id) on delete cascade,
  anon_hash text not null,
  type text default 'heart',
  created_at timestamp with time zone default now(),
  unique(message_id, anon_hash)
);

-- suggestions table
create table if not exists vault_suggestions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  reasoning text,
  created_at timestamp with time zone default now()
);

-- reports table
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references echo_threads(id),
  reason text,
  created_at timestamp with time zone default now()
);

-- polls table
create table if not exists polls (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references echo_threads(id) on delete cascade,
  question text not null,
  options jsonb not null, -- Array of strings e.g. ["Yes", "No"]
  created_at timestamp with time zone default now()
);

-- poll votes table
create table if not exists poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade,
  option_index integer not null,
  anon_hash text not null,
  created_at timestamp with time zone default now(),
  unique(poll_id, anon_hash) -- One vote per person per poll
);

-- 3. Add columns safetly (idempotent)
alter table confessions add column if not exists toxicity_score float default 0;
alter table confessions add column if not exists embedding vector(384);
alter table echo_threads add column if not exists is_public boolean default false;
alter table echo_threads add column if not exists last_activity_at timestamp with time zone default now();
alter table echo_threads add column if not exists title text;

-- 4. Enable Row Level Security (RLS) & Add Policies
-- Since we are anonymous, we allow public read/write for now.
alter table vaults enable row level security;
alter table confessions enable row level security;
alter table echo_threads enable row level security;
alter table thread_messages enable row level security;
alter table message_reactions enable row level security;
alter table vault_suggestions enable row level security;
alter table reports enable row level security;

-- Policy: Allow public to see everything (for MVP)
create policy "Public read vaults" on vaults for select using (true);
create policy "Public read confessions" on confessions for select using (true);
create policy "Public insert confessions" on confessions for insert with check (true);
create policy "Public read threads" on echo_threads for select using (true);
create policy "Public insert threads" on echo_threads for insert with check (true);
create policy "Public update threads" on echo_threads for update using (true);
create policy "Public read messages" on thread_messages for select using (true);
create policy "Public insert messages" on thread_messages for insert with check (true);

-- New policies
create policy "Public read reactions" on message_reactions for select using (true);
create policy "Public insert reactions" on message_reactions for insert with check (true);
create policy "Public delete reactions" on message_reactions for delete using (true);
create policy "Public insert suggestions" on vault_suggestions for insert with check (true);
create policy "Public insert reports" on reports for insert with check (true);

-- Polls policies
create policy "Public read polls" on polls for select using (true);
create policy "Public insert polls" on polls for insert with check (true);
create policy "Public read votes" on poll_votes for select using (true);
create policy "Public insert votes" on poll_votes for insert with check (true);

-- 5. Indexes for Performance
create index if not exists idx_confessions_vault_created on confessions (vault_id, created_at desc);
create index if not exists idx_threads_public_activity on echo_threads (is_public, last_activity_at desc);
create index if not exists idx_messages_thread on thread_messages (thread_id, created_at asc);

-- 6. Insert Starter Data (Vaults)
insert into vaults (slug, name, description, icon) values
('office-demons', 'Office Demons', 'Your boss, coworkers, and that one printer', 'briefcase'),
('crush-regrets', 'Crush Regrets 2025', 'The one that got away… or ghosted you', 'broken-heart'),
('crypto-tears', 'Crypto Bagholder Tears', 'When lambo became when therapy', 'chart-with-downwards-trend'),
('fandom-sins', 'Fandom Sins', 'Admit you hate the new season', 'clapper-board'),
('pet-chaos', 'Pet Chaos', 'They’re not babies, they’re terrorists', 'paw-prints')
on conflict (slug) do nothing;