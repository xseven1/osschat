-- Run this in your Supabase SQL editor (supabase.com → your project → SQL Editor)

create table projects (
  id uuid primary key,
  name text not null,
  description text default '',
  system_prompt text default '',
  color text default '#7c6dfa',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chats (
  id uuid primary key,
  project_id uuid references projects(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key,
  chat_id uuid references chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  timestamp timestamptz default now()
);

-- Indexes for performance
create index on chats(project_id);
create index on messages(chat_id);
create index on messages(timestamp);

-- Disable RLS (single-user app, no auth needed)
alter table projects disable row level security;
alter table chats disable row level security;
alter table messages disable row level security;
