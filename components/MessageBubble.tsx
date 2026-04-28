'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Role } from '@/store'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  role: Role
  content: string
  streaming?: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1 rounded text-[#4a4a68] hover:text-[#e4e4f0] bg-[#0f0f18] hover:bg-[#16161f] transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check size={12} className="text-[#4ade80]" /> : <Copy size={12} />}
    </button>
  )
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={clsx('flex items-start gap-3 animate-slide-up', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold',
        isUser
          ? 'bg-[#16161f] border border-[#252535] text-[#8888a8]'
          : 'bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 text-[#7c6dfa]'
      )}>
        {isUser ? 'U' : 'G'}
      </div>

      {/* Bubble */}
      <div className={clsx(
        'max-w-[80%] rounded-xl px-4 py-3',
        isUser
          ? 'bg-[#16161f] border border-[#252535] text-[#e4e4f0]'
          : 'bg-transparent text-[#e4e4f0]'
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isBlock = !props.inline && match
                  if (isBlock) {
                    return (
                      <div className="relative group">
                        <CopyButton text={String(children).replace(/\n$/, '')} />
                        <SyntaxHighlighter
                          style={oneDark as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            background: '#0f0f18',
                            border: '1px solid #252535',
                            borderRadius: '8px',
                            fontSize: '12px',
                            padding: '14px',
                          }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return <code className={className} {...props}>{children}</code>
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="inline-block w-1.5 h-4 bg-[#7c6dfa] ml-0.5 rounded-sm animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
