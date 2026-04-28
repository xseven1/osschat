# OSS Chat v2

GPT-OSS 120B chat interface with **Projects**, **persistent Supabase storage**, and **file uploads**.

## Setup (5 minutes)

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) → New project (free)
2. Once created, go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon` / `public` key

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

Push to GitHub → import in Vercel → add the two env vars in **Settings → Environment Variables**, then deploy.

Or via CLI:
```bash
npm i -g vercel
vercel
```

## Features

- 🗂 **Projects** — separate workspaces with names, colors, and per-project system prompts
- 💬 **Multiple chats per project** — rename, delete, create new ones
- 💾 **Supabase persistence** — all projects/chats/messages stored in Postgres
- 📎 **File uploads** — attach txt, md, csv, json, ts, js, py, docx and more — content is injected into message context
- ⚡ **Streaming** — real-time token streaming
- 🎨 **Markdown + syntax highlighting** — code blocks with copy buttons
- 🔑 **API key** — stored in localStorage only, never leaves your browser except to OpenRouter

## Model

`openai/gpt-oss-120b:free` — free on OpenRouter.
Rate limits: 20 req/min, 200 req/day free tier. 1000/day with $10 credit.

## Cost

- Vercel: **free**
- Supabase: **free** (500MB storage)
- OpenRouter GPT-OSS 120b: **free**
