'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { Key, ExternalLink } from 'lucide-react'

export default function ApiKeyModal() {
  const setApiKey = useAppStore((s) => s.setApiKey)
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    if (!val.trim()) { setErr('Please enter your API key'); return }
    if (!val.startsWith('sk-or-')) { setErr('Key should start with sk-or-…'); return }
    setApiKey(val.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090f]/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 bg-[#0f0f18] border border-[#252535] rounded-xl p-8 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 flex items-center justify-center">
            <Key size={18} className="text-[#7c6dfa]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-[#e4e4f0]">OpenRouter API Key</h2>
            <p className="text-xs text-[#8888a8] mt-0.5">Required to use GPT-OSS 120B</p>
          </div>
        </div>

        <p className="text-xs text-[#8888a8] mb-5 leading-relaxed">
          Your key is stored locally in your browser and never sent anywhere except directly to OpenRouter.
        </p>

        <input
          type="password"
          value={val}
          onChange={(e) => { setVal(e.target.value); setErr('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="sk-or-v1-..."
          className="w-full bg-[#16161f] border border-[#252535] rounded-lg px-4 py-3 text-sm text-[#e4e4f0] placeholder:text-[#4a4a68] focus:outline-none focus:border-[#7c6dfa] transition-colors mb-3 font-mono"
          autoFocus
        />

        {err && <p className="text-xs text-red-400 mb-3">{err}</p>}

        <button
          onClick={submit}
          className="w-full bg-[#7c6dfa] hover:bg-[#9080ff] text-white rounded-lg py-3 text-sm font-medium transition-colors mb-4"
        >
          Continue
        </button>

        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-[#7c6dfa] hover:text-[#a89aff] transition-colors"
        >
          <ExternalLink size={12} />
          Get your API key at openrouter.ai/keys
        </a>
      </div>
    </div>
  )
}
