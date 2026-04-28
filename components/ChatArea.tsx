'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'
import { streamChat, autoTitle, MODEL } from '@/lib/openrouter'
import { extractText, formatFileContext, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/lib/files'
import { Send, Trash2, StopCircle, Plus, Info, Paperclip, X, FileText } from 'lucide-react'
import MessageBubble from './MessageBubble'
import clsx from 'clsx'

interface AttachedFile {
  name: string
  content: string
  size: number
}

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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Reset files when chat changes
  useEffect(() => { setAttachedFiles([]) }, [activeChatId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setFileLoading(true)
    setError('')

    const results: AttachedFile[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`${file.name} is too large (max ${MAX_FILE_SIZE_MB}MB)`)
        continue
      }
      try {
        const content = await extractText(file)
        results.push({ name: file.name, content, size: file.size })
      } catch {
        setError(`Failed to read ${file.name}`)
      }
    }

    setAttachedFiles((prev) => [...prev, ...results])
    setFileLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (name: string) => setAttachedFiles((prev) => prev.filter((f) => f.name !== name))

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || streaming || !apiKey || !project || !chat) return

    const userText = input.trim()
    const files = [...attachedFiles]
    setInput('')
    setAttachedFiles([])
    setError('')

    // Build the message content: text + file contexts
    const fileContext = files.map((f) => formatFileContext(f.name, f.content)).join('\n\n')
    const fullUserContent = fileContext
      ? `${fileContext}${userText ? `\n\n${userText}` : ''}`
      : userText

    // Display content (shorter for UI)
    const displayContent = [
      files.length ? `📎 ${files.map((f) => f.name).join(', ')}` : '',
      userText,
    ].filter(Boolean).join('\n')

    await addMessage(project.id, chat.id, { role: 'user', content: displayContent })

    // Auto-title
    if (chat.messages.length === 0) {
      await updateChatTitle(chat.id, autoTitle([{ role: 'user', content: userText || files[0]?.name || 'File upload' }]))
    }

    // Build history with full file content for API
    const history = [
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: fullUserContent },
    ]

    const projectId = project.id
    const chatId = chat.id
    const systemPrompt = project.systemPrompt

    setStreaming(true)
    setStreamContent('')

    let fullContent = ''
    let aborted = false
    abortRef.current = () => { aborted = true }

    await streamChat(
      apiKey,
      history,
      systemPrompt,
      (chunk) => {
        if (aborted) return
        fullContent += chunk
        setStreamContent((prev) => prev + chunk)
      },
      async () => {
        if (!aborted && fullContent.trim()) {
          await addMessage(projectId, chatId, { role: 'assistant', content: fullContent })
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
  }, [input, attachedFiles, streaming, apiKey, project, chat])

  const handleStop = () => {
    abortRef.current?.()
    abortRef.current = null
    setStreaming(false)
    setStreamContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!project || !chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#4a4a68] text-sm">
        Select or create a project to start chatting.
      </div>
    )
  }

  const canSend = (input.trim() || attachedFiles.length > 0) && !streaming && !!apiKey

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          <button onClick={() => createChat(project.id)} className="p-1.5 rounded-md text-[#4a4a68] hover:text-[#e4e4f0] hover:bg-[#16161f] transition-all" title="New chat">
            <Plus size={14} />
          </button>
          <button onClick={() => clearChat(project.id, chat.id)} className="p-1.5 rounded-md text-[#4a4a68] hover:text-red-400 hover:bg-[#16161f] transition-all" title="Clear chat">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {chat.messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-[#7c6dfa] shadow-[0_0_10px_rgba(124,109,250,0.6)]" />
            </div>
            <p className="text-[#e4e4f0] font-display font-semibold text-lg mb-1">Start a conversation</p>
            <p className="text-xs text-[#4a4a68] max-w-xs">
              {project.systemPrompt
                ? `System: "${project.systemPrompt.slice(0, 60)}${project.systemPrompt.length > 60 ? '…' : ''}"`
                : 'Ask anything or upload a file. GPT-OSS 120B is ready.'}
            </p>
            <p className="text-[10px] text-[#4a4a68] mt-2">
              Supports: {SUPPORTED_EXTENSIONS.join(', ')}
            </p>
          </div>
        )}

        {chat.messages.map((msg) => (
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
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
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

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        {!apiKey && <p className="text-xs text-[#fbbf24] text-center mb-2">Set your API key to start chatting</p>}

        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((f) => (
              <div key={f.name} className="flex items-center gap-1.5 bg-[#16161f] border border-[#252535] rounded-lg px-2.5 py-1.5 text-xs text-[#8888a8]">
                <FileText size={11} className="text-[#7c6dfa]" />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <span className="text-[#4a4a68]">({(f.size / 1024).toFixed(0)}kb)</span>
                <button onClick={() => removeFile(f.name)} className="text-[#4a4a68] hover:text-red-400 ml-1">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={clsx(
          'flex items-end gap-3 bg-[#0f0f18] border rounded-xl px-4 py-3 transition-colors',
          apiKey ? 'border-[#252535] focus-within:border-[#7c6dfa]/50' : 'border-[#252535] opacity-60'
        )}>
          {/* File attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!apiKey || streaming || fileLoading}
            className="text-[#4a4a68] hover:text-[#a89aff] transition-colors flex-shrink-0 mb-0.5 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <Paperclip size={16} className={fileLoading ? 'animate-pulse' : ''} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

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
            <button onClick={handleStop} className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-950/60 transition-all flex-shrink-0" title="Stop">
              <StopCircle size={16} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={clsx(
                'p-1.5 rounded-lg transition-all flex-shrink-0',
                canSend ? 'bg-[#7c6dfa] text-white hover:bg-[#9080ff] shadow-[0_0_12px_rgba(124,109,250,0.3)]' : 'text-[#4a4a68] cursor-not-allowed'
              )}
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p className="text-center text-[10px] text-[#4a4a68] mt-2">
          GPT-OSS 120b · OpenRouter free tier · 20 rpm
        </p>
      </div>
    </div>
  )
}
