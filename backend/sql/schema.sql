-- Run this in the Supabase SQL editor for a fresh project.

create extension if not exists vector;

create table spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  instructions text not null default '',
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  file_url text not null,
  filename text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  embedding vector(768) not null
);

create index chunks_embedding_idx on chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table chats (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: defense-in-depth. The FastAPI backend uses the
-- service-role key (which bypasses RLS) and filters by user_id itself,
-- but these policies protect against any future direct client access
-- (e.g. Supabase Realtime subscriptions from the frontend).
alter table spaces enable row level security;
create policy "own spaces" on spaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table documents enable row level security;
create policy "own documents" on documents
  for all using (space_id in (select id from spaces where user_id = auth.uid()));

alter table chunks enable row level security;
create policy "own chunks" on chunks
  for all using (
    document_id in (
      select d.id from documents d
      join spaces s on s.id = d.space_id
      where s.user_id = auth.uid()
    )
  );

alter table chats enable row level security;
create policy "own chats" on chats
  for all using (space_id in (select id from spaces where user_id = auth.uid()));

alter table messages enable row level security;
create policy "own messages" on messages
  for all using (
    chat_id in (
      select c.id from chats c
      join spaces s on s.id = c.space_id
      where s.user_id = auth.uid()
    )
  );

-- Vector similarity search scoped to a single Space, called via
-- supabase.rpc("match_chunks", {...}) from the backend.
create or replace function match_chunks(
  query_embedding vector(768),
  match_space_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.document_id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  join documents on documents.id = chunks.document_id
  where documents.space_id = match_space_id
    and documents.status = 'ready'
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Storage: create a private bucket named "documents" via the Supabase
-- dashboard (Storage > New bucket, "Public" off). No SQL needed for that.
