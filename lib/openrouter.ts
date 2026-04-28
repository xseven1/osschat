export async function streamChat(
  apiKey: string,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  model: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const body = {
    model,
    stream: true,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'OSS Chat',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      onError(err?.error?.message ?? `HTTP ${res.status}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError('No response body'); return }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6))
            const delta = json?.choices?.[0]?.delta?.content
            if (delta) onChunk(delta)
          } catch {}
        }
      }
    }
    onDone()
  } catch (e: any) {
    onError(e?.message ?? 'Network error')
  }
}

export function autoTitle(messages: { role: string; content: string }[]): string {
  const first = messages.find((m) => m.role === 'user')?.content ?? ''
  return first.slice(0, 40) + (first.length > 40 ? '…' : '') || 'New Chat'
}
