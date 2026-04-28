'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { Role } from '@/store'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import clsx from 'clsx'

// Clean dark theme matching the app
const codeTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': { color: '#c9d1d9', background: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: '12.5px', lineHeight: '1.6' },
  'pre[class*="language-"]': { color: '#c9d1d9', background: '#0d0d16', margin: 0, padding: '1rem', overflow: 'auto' },
  comment: { color: '#6e7681', fontStyle: 'italic' },
  punctuation: { color: '#8b949e' },
  property: { color: '#79c0ff' },
  tag: { color: '#7ee787' },
  boolean: { color: '#ff7b72' },
  number: { color: '#f2cc60' },
  constant: { color: '#79c0ff' },
  symbol: { color: '#79c0ff' },
  selector: { color: '#7ee787' },
  'attr-name': { color: '#79c0ff' },
  string: { color: '#a5d6ff' },
  char: { color: '#a5d6ff' },
  builtin: { color: '#ff7b72' },
  operator: { color: '#ff7b72' },
  entity: { color: '#f2cc60' },
  url: { color: '#79c0ff' },
  keyword: { color: '#ff7b72' },
  function: { color: '#d2a8ff' },
  regex: { color: '#a5d6ff' },
  important: { color: '#ff7b72', fontWeight: 'bold' },
  variable: { color: '#ffa657' },
  'class-name': { color: '#f0883e' },
  'attr-value': { color: '#a5d6ff' },
  atrule: { color: '#d2a8ff' },
  'function-name': { color: '#d2a8ff' },
  deleted: { color: '#ffa198' },
  inserted: { color: '#7ee787' },
  parameter: { color: '#ffa657' },
  'maybe-class-name': { color: '#f0883e' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-all text-[10px] opacity-0 group-hover:opacity-100"
    >
      {copied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  )
}

interface Props {
  role: Role
  content: string
  streaming?: boolean
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={clsx('flex items-start gap-3 animate-slide-up', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold',
        isUser
          ? 'bg-white/8 border border-white/10 text-white/40'
          : 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-400'
      )}>
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div className={clsx(
        'max-w-[82%] rounded-2xl',
        isUser
          ? 'bg-white/6 border border-white/8 px-4 py-3 text-sm text-white/80 leading-relaxed'
          : 'text-white/75'
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        ) : (
          <div className="prose-chat text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isBlock = !props.inline && match
                  const codeStr = String(children).replace(/\n$/, '')

                  if (isBlock) {
                    return (
                      <div className="group relative my-4 rounded-xl overflow-hidden border border-white/8">
                        {/* Code header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-white/4 border-b border-white/6">
                          <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{match[1]}</span>
                          <CopyButton text={codeStr} />
                        </div>
                        <SyntaxHighlighter
                          style={codeTheme as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, background: '#0d0d16', padding: '1rem', fontSize: '12.5px', lineHeight: '1.65' }}
                          codeTagProps={{ style: { fontFamily: 'JetBrains Mono, monospace' } }}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }

                  return (
                    <code className="bg-white/8 border border-white/10 rounded-md px-1.5 py-0.5 text-[12px] text-indigo-300 font-mono" {...props}>
                      {children}
                    </code>
                  )
                },
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 pl-5 space-y-1 list-disc marker:text-white/25">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 pl-5 space-y-1 list-decimal marker:text-white/25">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="font-display font-bold text-lg text-white/90 mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="font-display font-semibold text-base text-white/85 mb-2 mt-4 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="font-display font-semibold text-sm text-white/80 mb-1.5 mt-3 first:mt-0">{children}</h3>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-500/40 pl-4 text-white/50 italic my-3">{children}</blockquote>,
                a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{children}</a>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-white/10 bg-white/5 px-3 py-2 text-left text-white/70 font-medium">{children}</th>,
                td: ({ children }) => <td className="border border-white/8 px-3 py-2 text-white/60">{children}</td>,
                hr: () => <hr className="border-white/8 my-4" />,
                strong: ({ children }) => <strong className="font-semibold text-white/90">{children}</strong>,
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && <span className="inline-block w-1.5 h-4 bg-indigo-400/80 ml-0.5 rounded-sm animate-pulse" />}
          </div>
        )}
      </div>
    </div>
  )
}
