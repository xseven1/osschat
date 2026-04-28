'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'
import { streamChat, autoTitle, MODEL } from '@/lib/openrouter'
import { Send, Trash2, StopCircle, Plus, Info } from 'lucide-react'
import MessageBubble from './MessageBubble'
import clsx from 'clsx'

export default function ChatArea() {
  const {
    apiKey, activeProjectId, activeChatId,
    getActiveProject, getActiveChat,
    addMessage, clearChat, createChat, updateChatTitle,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef<(() => void) | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const project = getActiveProject()
  const chat = getActiveChat()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages, streamContent])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming || !apiKey || !project || !chat) return

    const userContent = input.trim()
    setInput('')
    setError('')

    addMessage(project.id, chat.id, { role: 'user', content: userContent })

    // Auto-title the chat after first message
    if (chat.messages.length === 0) {
      updateChatTitle(project.id, chat.id, autoTitle([{ role: 'user', content: userContent }]))
    }

    const history = [
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userContent },
    ]

    setStreaming(true)
    setStreamContent('')

    let fullContent = ''
    let aborted = false

    abortRef.current = () => { aborted = true }

    await streamChat(
      apiKey,
      history,
      project.systemPrompt,
      (chunk) => {
        if (aborted) return
        fullContent += chunk
        setStreamContent(fullContent)
      },
      () => {
        if (!aborted && fullContent) {
          addMessage(project.id, chat.id, { role: 'assistant', content: fullContent })
        }
        setStreaming(false)
        setStreamContent('')
        abortRef.current = null
      },
      (err) => {
        setError(err)
        setStreaming(false)
        setStreamContent('')
        abortRef.current = null
      }
    )
  }, [input, streaming, apiKey, project, chat])

  const handleStop = () => {
    abortRef.current?.()
    abortRef.current = null
    setStreaming(false)
    setStreamContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!project || !chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#4a4a68] text-sm">
        Select or create a project to start chatting.
      </div>
    )
  }

  const messages = chat.messages

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#252535] bg-[#0f0f18] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: project.color }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8888a8] truncate">{project.name}</span>
              <span className="text-[#4a4a68] text-xs">/</span>
              <span className="text-xs text-[#e4e4f0] font-medium truncate">{chat.title}</span>
            </div>
            {project.systemPrompt && (
              <div className="flex items-center gap-1 mt-0.5">
                <Info size={9} className="text-[#4a4a68]" />
                <span className="text-[10px] text-[#4a4a68] truncate max-w-xs">{project.systemPrompt.slice(0, 60)}…</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-[#4a4a68] bg-[#16161f] border border-[#252535] px-2 py-0.5 rounded-full hidden sm:block">
            {MODEL.split('/')[1]}
          </span>
          <button
            onClick={() => createChat(project.id)}
            className="p-1.5 rounded-md text-[#4a4a68] hover:text-[#e4e4f0] hover:bg-[#16161f] transition-all"
            title="New chat"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => clearChat(project.id, chat.id)}
            className="p-1.5 rounded-md text-[#4a4a68] hover:text-red-400 hover:bg-[#16161f] transition-all"
            title="Clear chat"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-[#7c6dfa] shadow-[0_0_10px_rgba(124,109,250,0.6)]" />
            </div>
            <p className="text-[#e4e4f0] font-display font-semibold text-lg mb-1">Start a conversation</p>
            <p className="text-xs text-[#4a4a68] max-w-xs">
              {project.systemPrompt
                ? `Using project context: "${project.systemPrompt.slice(0, 60)}${project.systemPrompt.length > 60 ? '…' : ''}"`
                : 'Ask anything. GPT-OSS 120B is ready.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streaming && streamContent && (
          <MessageBubble role="assistant" content={streamContent} streaming />
        )}

        {streaming && !streamContent && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-[#7c6dfa]" />
            </div>
            <div className="flex items-center gap-1.5 pt-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3 text-xs text-red-400 animate-fade-in">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        {!apiKey && (
          <p className="text-xs text-[#fbbf24] text-center mb-2">Set your API key to start chatting</p>
        )}
        <div className={clsx(
          'flex items-end gap-3 bg-[#0f0f18] border rounded-xl px-4 py-3 transition-colors',
          apiKey ? 'border-[#252535] focus-within:border-[#7c6dfa]/50' : 'border-[#252535] opacity-60'
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={apiKey ? 'Message GPT-OSS 120b… (Shift+Enter for newline)' : 'Set your API key first…'}
            disabled={!apiKey || streaming}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[#e4e4f0] placeholder:text-[#4a4a68] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto leading-6 disabled:cursor-not-allowed"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-950/60 transition-all flex-shrink-0"
              title="Stop generation"
            >
              <StopCircle size={16} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !apiKey}
              className={clsx(
                'p-1.5 rounded-lg transition-all flex-shrink-0',
                input.trim() && apiKey
                  ? 'bg-[#7c6dfa] text-white hover:bg-[#9080ff] shadow-[0_0_12px_rgba(124,109,250,0.3)]'
                  : 'text-[#4a4a68] cursor-not-allowed'
              )}
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p className="text-center text-[10px] text-[#4a4a68] mt-2">
          GPT-OSS 120b via OpenRouter · Free tier · 20 rpm
        </p>
      </div>
    </div>
  )
}
