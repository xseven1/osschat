-- ── OSS Chat v4 — Full Schema ─────────────────────────────────────────────────
-- Run this in Supabase SQL Editor for a fresh install.
-- If upgrading from v3, run the migration section at the bottom.

-- Core tables
create table projects (
  id            uuid primary key,
  name          text not null,
  description   text default '',
  system_prompt text default '',
  color         text default '#7c6dfa',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table chats (
  id         uuid primary key,
  project_id uuid references projects(id) on delete cascade,
  title      text not null default 'New Chat',
  model      text not null default 'openai/gpt-oss-120b:free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id        uuid primary key,
  chat_id   uuid references chats(id) on delete cascade,
  role      text not null check (role in ('user', 'assistant', 'system')),
  content   text not null,
  timestamp timestamptz default now()
);

-- Quick chats (outside any project)
create table quick_chats (
  id         uuid primary key,
  title      text not null default 'Quick Chat',
  model      text not null default 'openai/gpt-oss-120b:free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table quick_messages (
  id        uuid primary key,
  chat_id   uuid references quick_chats(id) on delete cascade,
  role      text not null check (role in ('user', 'assistant', 'system')),
  content   text not null,
  timestamp timestamptz default now()
);

-- ── Memory / RAG tables ───────────────────────────────────────────────────────

-- Stores vector embeddings for semantic search across past messages
create table message_embeddings (
  message_id uuid primary key,
  project_id uuid references projects(id) on delete cascade,
  chat_id    uuid not null,
  role       text not null,
  content    text not null,
  embedding  text not null,   -- stored as JSON string (float array)
  created_at timestamptz default now()
);

-- Rolling summaries per chat — updated every N messages
create table chat_summaries (
  chat_id       uuid primary key,
  summary       text not null,
  message_count int  not null default 0,
  updated_at    timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index on chats(project_id);
create index on messages(chat_id);
create index on messages(timestamp);
create index on quick_messages(chat_id);
create index on quick_messages(timestamp);
create index on message_embeddings(project_id);
create index on message_embeddings(chat_id);

-- ── Disable RLS (single-user app) ────────────────────────────────────────────

alter table projects           disable row level security;
alter table chats              disable row level security;
alter table messages           disable row level security;
alter table quick_chats        disable row level security;
alter table quick_messages     disable row level security;
alter table message_embeddings disable row level security;
alter table chat_summaries     disable row level security;


-- ── Upgrading from v3? Run only this ─────────────────────────────────────────
--
-- create table if not exists message_embeddings (
--   message_id uuid primary key,
--   project_id uuid references projects(id) on delete cascade,
--   chat_id    uuid not null,
--   role       text not null,
--   content    text not null,
--   embedding  text not null,
--   created_at timestamptz default now()
-- );
--
-- create table if not exists chat_summaries (
--   chat_id       uuid primary key,
--   summary       text not null,
--   message_count int  not null default 0,
--   updated_at    timestamptz default now()
-- );
--
-- create index if not exists on message_embeddings(project_id);
-- create index if not exists on message_embeddings(chat_id);
-- alter table message_embeddings disable row level security;
-- alter table chat_summaries     disable row level security;
