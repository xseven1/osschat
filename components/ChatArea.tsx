'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, FREE_MODELS, DEFAULT_MODEL } from '@/store'
import { streamChat, autoTitle } from '@/lib/openrouter'
import { extractText, formatFileContext, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/lib/files'
import { Send, Trash2, StopCircle, Plus, Paperclip, X, FileText, ChevronDown, Zap } from 'lucide-react'
import MessageBubble from './MessageBubble'
import clsx from 'clsx'

interface AttachedFile {
  name: string
  content: string
  size: number
}

export default function ChatArea() {
  const {
    apiKey, activeView,
    getActiveQuickChat, getActiveProjectChat,
    addQuickMessage, clearQuickChat, createQuickChat, updateQuickChatTitle, updateQuickChatModel,
    addMessage, clearChat, createChat, updateChatTitle, updateChatModel,
  } = useAppStore()

  const quickChat = getActiveQuickChat()
  const projectChatData = getActiveProjectChat()
  const isQuick = activeView?.type === 'quick'

  // Unified accessors
  const currentMessages = isQuick ? (quickChat?.messages ?? []) : (projectChatData?.chat.messages ?? [])
  const currentModel = isQuick ? (quickChat?.model ?? DEFAULT_MODEL) : (projectChatData?.chat.model ?? DEFAULT_MODEL)
  const currentTitle = isQuick ? quickChat?.title : projectChatData?.chat.title
  const projectName = projectChatData?.project.name
  const projectColor = projectChatData?.project.color
  const systemPrompt = projectChatData?.project.systemPrompt ?? ''

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modelPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [currentMessages, streamContent])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px'
    }
  }, [input])

  useEffect(() => { setAttachedFiles([]) }, [activeView])

  // Close model picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleModelChange = (modelId: string) => {
    setShowModelPicker(false)
    if (isQuick && quickChat) updateQuickChatModel(quickChat.id, modelId)
    else if (projectChatData) updateChatModel(projectChatData.chat.id, modelId)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setFileLoading(true)
    setError('')
    const results: AttachedFile[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setError(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB`); continue }
      try {
        const content = await extractText(file)
        results.push({ name: file.name, content, size: file.size })
      } catch { setError(`Failed to read ${file.name}`) }
    }
    setAttachedFiles((prev) => [...prev, ...results])
    setFileLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || streaming || !apiKey) return
    if (!activeView) return

    const userText = input.trim()
    const files = [...attachedFiles]
    setInput('')
    setAttachedFiles([])
    setError('')

    const fileContext = files.map((f) => formatFileContext(f.name, f.content)).join('\n\n')
    const fullUserContent = fileContext ? `${fileContext}${userText ? `\n\n${userText}` : ''}` : userText
    const displayContent = [files.length ? `📎 ${files.map((f) => f.name).join(', ')}` : '', userText].filter(Boolean).join('\n')

    const modelToUse = currentModel
    const msgs = currentMessages

    if (isQuick && quickChat) {
      const chatId = quickChat.id
      await addQuickMessage(chatId, { role: 'user', content: displayContent })
      if (msgs.length === 0) await updateQuickChatTitle(chatId, autoTitle([{ role: 'user', content: userText || files[0]?.name || 'File' }]))

      const history = [...msgs.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: fullUserContent }]
      runStream(modelToUse, history, '', (content) => addQuickMessage(chatId, { role: 'assistant', content }))
    } else if (projectChatData) {
      const { project, chat } = projectChatData
      await addMessage(project.id, chat.id, { role: 'user', content: displayContent })
      if (msgs.length === 0) await updateChatTitle(chat.id, autoTitle([{ role: 'user', content: userText || files[0]?.name || 'File' }]))

      const history = [...msgs.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: fullUserContent }]
      runStream(modelToUse, history, project.systemPrompt, (content) => addMessage(project.id, chat.id, { role: 'assistant', content }))
    }
  }, [input, attachedFiles, streaming, apiKey, activeView, currentMessages, currentModel, quickChat, projectChatData])

  const runStream = (model: string, history: { role: string; content: string }[], sysPrompt: string, onDone: (content: string) => void) => {
    setStreaming(true)
    setStreamContent('')
    let fullContent = ''
    let aborted = false
    abortRef.current = () => { aborted = true }

    streamChat(
      apiKey, history, sysPrompt, model,
      (chunk) => { if (!aborted) { fullContent += chunk; setStreamContent((p) => p + chunk) } },
      async () => {
        if (!aborted && fullContent.trim()) await onDone(fullContent)
        setStreaming(false); setStreamContent(''); abortRef.current = null
      },
      (err) => { setError(err); setStreaming(false); setStreamContent(''); abortRef.current = null }
    )
  }

  const handleStop = () => { abortRef.current?.(); setStreaming(false); setStreamContent('') }

  const handleClear = () => {
    if (isQuick && quickChat) clearQuickChat(quickChat.id)
    else if (projectChatData) clearChat(projectChatData.project.id, projectChatData.chat.id)
  }

  const handleNew = () => {
    if (isQuick) createQuickChat()
    else if (projectChatData) createChat(projectChatData.project.id)
  }

  const modelLabel = FREE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel.split('/')[1]

  if (!activeView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/20">
        <p className="text-sm">Create a quick chat or project to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0c0c14]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {isQuick ? (
            <Zap size={14} className="text-indigo-400 flex-shrink-0" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: projectColor }} />
          )}
          <div className="min-w-0">
            {!isQuick && <p className="text-[10px] text-white/30 leading-none mb-0.5">{projectName}</p>}
            <p className="text-sm font-medium text-white/80 truncate">{currentTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={handleNew} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/5 transition-all" title="New chat">
            <Plus size={14} />
          </button>
          <button onClick={handleClear} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-white/5 transition-all" title="Clear chat">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {currentMessages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-indigo-400/80" />
            </div>
            <p className="text-white/50 font-medium text-base mb-1">Start a conversation</p>
            <p className="text-white/20 text-xs max-w-xs">
              {systemPrompt
                ? `System: "${systemPrompt.slice(0, 70)}${systemPrompt.length > 70 ? '…' : ''}"`
                : 'Type a message or attach a file below'}
            </p>
          </div>
        )}

        {currentMessages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streaming && streamContent && (
          <MessageBubble role="assistant" content={streamContent} streaming />
        )}

        {streaming && !streamContent && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-indigo-400/60" />
            </div>
            <div className="flex items-center gap-1.5 pt-2.5">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-8 pb-5 pt-2 flex-shrink-0">
        {!apiKey && <p className="text-xs text-amber-400/80 text-center mb-2">Set your API key in the sidebar to start chatting</p>}

        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {attachedFiles.map((f) => (
              <div key={f.name} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/50">
                <FileText size={10} className="text-indigo-400" />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button onClick={() => setAttachedFiles((p) => p.filter((a) => a.name !== f.name))} className="text-white/25 hover:text-red-400 ml-1">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#13131e] border border-white/8 rounded-2xl overflow-visible focus-within:border-white/15 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={apiKey ? 'Message… (Shift+Enter for newline)' : 'Set your API key first…'}
            disabled={!apiKey || streaming}
            rows={1}
            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-white/80 placeholder:text-white/20 outline-none resize-none min-h-[44px] max-h-[180px] overflow-y-auto leading-6 disabled:cursor-not-allowed"
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              {/* File attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!apiKey || streaming || fileLoading}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all disabled:cursor-not-allowed"
                title="Attach file"
              >
                <Paperclip size={13} className={fileLoading ? 'animate-pulse' : ''} />
              </button>
              <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')} onChange={handleFileSelect} className="hidden" />

              {/* Model picker */}
              <div className="relative" ref={modelPickerRef}>
                <button
                  onClick={() => setShowModelPicker((p) => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border border-white/8 hover:border-white/15"
                >
                  <span className="max-w-[120px] truncate">{modelLabel}</span>
                  <ChevronDown size={11} className={clsx('transition-transform', showModelPicker && 'rotate-180')} />
                </button>

                {showModelPicker && (
                  <div className="absolute bottom-full mb-2 left-0 w-72 bg-[#1a1a28] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[999] animate-fade-in">
                    <div className="px-3 py-2 border-b border-white/5">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Free Models</p>
                    </div>
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {FREE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleModelChange(m.id)}
                          className={clsx(
                            'w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors',
                            currentModel === m.id && 'bg-indigo-500/10'
                          )}
                        >
                          <div className="min-w-0">
                            <p className={clsx('text-xs font-medium truncate', currentModel === m.id ? 'text-indigo-300' : 'text-white/70')}>{m.label}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-white/30">{m.provider}</p>
                              <p className="text-[10px] text-white/20">{m.context}</p>
                            </div>
                          </div>
                          {currentModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Send / Stop */}
            {streaming ? (
              <button onClick={handleStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs">
                <StopCircle size={13} />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || !apiKey}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                  (input.trim() || attachedFiles.length > 0) && apiKey
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-white/20 cursor-not-allowed'
                )}
              >
                <Send size={13} />
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
