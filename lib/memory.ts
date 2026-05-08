/**
 * memory.ts — RAG + summarization system
 *
 * How it works:
 * 1. Every assistant message gets embedded (vector) and stored in Supabase
 * 2. When you send a new message, we embed your query and find the most
 *    semantically similar past messages across the project
 * 3. We also maintain a rolling summary of each chat (updated every N messages)
 * 4. All of this gets injected into the system prompt automatically
 */

import { supabase } from './supabase'
import { Message } from '@/store'

const EMBEDDING_MODEL = 'openai/text-embedding-3-small'
const SUMMARY_MODEL   = 'openai/gpt-oss-20b:free'   // fast model for summaries
const SUMMARY_EVERY   = 10                            // summarize every N messages
const MAX_CONTEXT_SNIPPETS = 6                        // how many past snippets to inject
const SNIPPET_MAX_CHARS    = 600                      // truncate long messages

// ── Embeddings ────────────────────────────────────────────────────────────────

export async function embedText(apiKey: string, text: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'OSS Chat',
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

export async function storeEmbedding(
  apiKey: string,
  messageId: string,
  projectId: string,
  chatId: string,
  role: string,
  content: string
) {
  if (role !== 'assistant' && role !== 'user') return
  if (content.length < 20) return

  const embedding = await embedText(apiKey, content.slice(0, 2000))
  if (!embedding) return

  await supabase.from('message_embeddings').upsert({
    message_id: messageId,
    project_id: projectId,
    chat_id: chatId,
    role,
    content: content.slice(0, 2000),
    embedding: JSON.stringify(embedding),
    created_at: new Date().toISOString(),
  }, { onConflict: 'message_id' })
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function retrieveRelevantContext(
  apiKey: string,
  query: string,
  projectId: string,
  currentChatId: string,
  limit = MAX_CONTEXT_SNIPPETS
): Promise<{ role: string; content: string; chatId: string; similarity: number }[]> {
  const queryEmbedding = await embedText(apiKey, query)
  if (!queryEmbedding) return []

  // Fetch all embeddings for this project (excluding current chat — that's already in history)
  const { data } = await supabase
    .from('message_embeddings')
    .select('message_id, chat_id, role, content, embedding')
    .eq('project_id', projectId)
    .neq('chat_id', currentChatId)
    .order('created_at', { ascending: false })
    .limit(500) // cap to avoid huge payloads

  if (!data?.length) return []

  // Score each embedding
  const scored = data
    .map((row: any) => {
      try {
        const vec = JSON.parse(row.embedding) as number[]
        const similarity = cosineSimilarity(queryEmbedding, vec)
        return { role: row.role, content: row.content, chatId: row.chat_id, similarity }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .filter((r: any) => r.similarity > 0.75) // only include high-relevance matches
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored as { role: string; content: string; chatId: string; similarity: number }[]
}

// ── Summarization ─────────────────────────────────────────────────────────────

export async function generateSummary(
  apiKey: string,
  messages: Message[],
  existingSummary?: string
): Promise<string | null> {
  if (messages.length < 4) return null

  const transcript = messages
    .slice(-20) // last 20 messages to summarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 800)}`)
    .join('\n\n')

  const prompt = existingSummary
    ? `You have an existing summary of a conversation:\n<existing_summary>\n${existingSummary}\n</existing_summary>\n\nHere are the latest messages to incorporate:\n<new_messages>\n${transcript}\n</new_messages>\n\nWrite an updated concise summary (max 300 words) capturing the key topics, decisions, and context from the full conversation. Be factual and specific.`
    : `Summarize this conversation concisely (max 300 words). Capture key topics discussed, decisions made, code written, and important context. Be specific, not generic.\n\n${transcript}`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'OSS Chat',
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

export async function getOrCreateSummary(
  apiKey: string,
  chatId: string,
  messages: Message[]
): Promise<string | null> {
  if (messages.length < SUMMARY_EVERY) return null

  // Check if we have a recent enough summary
  const { data } = await supabase
    .from('chat_summaries')
    .select('summary, message_count')
    .eq('chat_id', chatId)
    .single()

  const existingCount = data?.message_count ?? 0
  const needsUpdate = messages.length >= existingCount + SUMMARY_EVERY

  if (data?.summary && !needsUpdate) return data.summary

  // Generate new summary
  const summary = await generateSummary(apiKey, messages, data?.summary)
  if (!summary) return data?.summary ?? null

  await supabase.from('chat_summaries').upsert({
    chat_id: chatId,
    summary,
    message_count: messages.length,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'chat_id' })

  return summary
}

// ── Context builder ───────────────────────────────────────────────────────────

export async function buildMemoryContext(
  apiKey: string,
  query: string,
  projectId: string | null,
  chatId: string,
  messages: Message[],
  isQuickChat: boolean
): Promise<string> {
  const parts: string[] = []

  // 1. Rolling summary of current chat
  if (!isQuickChat && projectId && messages.length >= SUMMARY_EVERY) {
    const summary = await getOrCreateSummary(apiKey, chatId, messages)
    if (summary) {
      parts.push(`<conversation_summary>\nThis is a summary of the earlier parts of this conversation:\n${summary}\n</conversation_summary>`)
    }
  }

  // 2. Relevant past context from other chats in the project
  if (!isQuickChat && projectId) {
    const relevant = await retrieveRelevantContext(apiKey, query, projectId, chatId)
    if (relevant.length > 0) {
      const snippets = relevant.map((r, i) => {
        const truncated = r.content.length > SNIPPET_MAX_CHARS
          ? r.content.slice(0, SNIPPET_MAX_CHARS) + '…'
          : r.content
        return `[${i + 1}] (${r.role}, relevance: ${(r.similarity * 100).toFixed(0)}%)\n${truncated}`
      }).join('\n\n')

      parts.push(`<relevant_past_context>\nThe following snippets from previous conversations in this project may be relevant to the current question:\n\n${snippets}\n</relevant_past_context>`)
    }
  }

  return parts.join('\n\n')
}
