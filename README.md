# OSS Chat

A clean, project-based chat interface for **GPT-OSS 120B** via OpenRouter. Built with Next.js 14 + Tailwind.

## Features

- 🗂 **Projects** — organize chats into separate workspaces, each with its own system prompt
- 💬 **Multiple chats per project** — rename, delete, switch between them
- ⚡ **Streaming responses** — real-time token streaming from OpenRouter
- 🎨 **Markdown + syntax highlighting** — code blocks with copy button, tables, GFM
- 💾 **Persistent storage** — everything saved to localStorage (survives refreshes)
- 🔑 **API key management** — stored locally, never leaves your browser

## Deploy to Vercel (easiest)

### Option 1: GitHub → Vercel (recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Vercel auto-detects Next.js — just click **Deploy**
4. Done. No environment variables needed.

### Option 2: Vercel CLI

```bash
npm i -g vercel
cd osschat
npm install
vercel
```

Follow the prompts. Done in ~1 minute.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. On first load, enter your OpenRouter API key (`sk-or-v1-...`)
   - Get one free at [openrouter.ai/keys](https://openrouter.ai/keys)
2. A default **General** project is created automatically
3. Create more projects via **+ New Project** in the sidebar
   - Each project can have its own **system prompt** (e.g. "You are a coding assistant")
4. Start chatting — `Enter` to send, `Shift+Enter` for newline

## Model

Uses `openai/gpt-oss-120b:free` — completely free on OpenRouter.
Rate limits: 20 requests/minute, 200 requests/day on free tier.

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Zustand (state + localStorage persistence)
- react-markdown + remark-gfm
- react-syntax-highlighter
- OpenRouter API (streaming)
