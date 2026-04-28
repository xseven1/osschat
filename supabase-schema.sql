-- Run this in your Supabase SQL editor
-- If upgrading from v2, run the migration section at the bottom instead

-- ── Fresh install ─────────────────────────────────────────────────────────────

create table projects (
  id          uuid primary key,
  name        text not null,
  description text default '',
  system_prompt text default '',
  color       text default '#7c6dfa',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table chats (
  id          uuid primary key,
  project_id  uuid references projects(id) on delete cascade,
  title       text not null default 'New Chat',
  model       text not null default 'openai/gpt-oss-120b:free',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
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

-- Indexes
create index on chats(project_id);
create index on messages(chat_id);
create index on messages(timestamp);
create index on quick_messages(chat_id);
create index on quick_messages(timestamp);

-- Disable RLS (single-user app)
alter table projects      disable row level security;
alter table chats         disable row level security;
alter table messages      disable row level security;
alter table quick_chats   disable row level security;
alter table quick_messages disable row level security;


-- ── Upgrading from v2? Run this instead of the above ──────────────────────────
-- alter table chats add column if not exists model text not null default 'openai/gpt-oss-120b:free';
--
-- create table if not exists quick_chats (
--   id         uuid primary key,
--   title      text not null default 'Quick Chat',
--   model      text not null default 'openai/gpt-oss-120b:free',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- create table if not exists quick_messages (
--   id        uuid primary key,
--   chat_id   uuid references quick_chats(id) on delete cascade,
--   role      text not null check (role in ('user', 'assistant', 'system')),
--   content   text not null,
--   timestamp timestamptz default now()
-- );
--
-- create index if not exists on quick_messages(chat_id);
-- create index if not exists on quick_messages(timestamp);
-- alter table quick_chats    disable row level security;
-- alter table quick_messages disable row level security;
