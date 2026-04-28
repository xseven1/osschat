'use client'
import { useState, useEffect } from 'react'
import { useAppStore, Project } from '@/store'
import { X, FolderOpen } from 'lucide-react'

const COLORS = ['#7c6dfa','#4ade80','#f87171','#fbbf24','#22d3ee','#e879f9','#fb923c','#a3e635','#60a5fa','#f472b6']

interface Props {
  existing: Project | null
  onClose: () => void
}

export default function ProjectModal({ existing, onClose }: Props) {
  const { createProject, updateProject } = useAppStore()
  const [name, setName] = useState(existing?.name ?? '')
  const [desc, setDesc] = useState(existing?.description ?? '')
  const [system, setSystem] = useState(existing?.systemPrompt ?? '')
  const [color, setColor] = useState(existing?.color ?? COLORS[0])
  const [err, setErr] = useState('')

  const submit = () => {
    if (!name.trim()) { setErr('Project name is required'); return }
    if (existing) {
      updateProject(existing.id, { name: name.trim(), description: desc.trim(), systemPrompt: system.trim(), color })
    } else {
      createProject(name.trim(), desc.trim(), system.trim())
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg mx-4 bg-[#0f0f18] border border-[#252535] rounded-xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-[#7c6dfa]" />
            <h2 className="font-display font-bold text-base text-[#e4e4f0]">
              {existing ? 'Edit Project' : 'New Project'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#4a4a68] hover:text-[#e4e4f0] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#8888a8] block mb-1.5">Project Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setErr('') }}
              placeholder="e.g. Research, Work, Personal"
              className="w-full bg-[#16161f] border border-[#252535] rounded-lg px-3 py-2.5 text-sm text-[#e4e4f0] placeholder:text-[#4a4a68] focus:outline-none focus:border-[#7c6dfa] transition-colors"
            />
            {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
          </div>

          <div>
            <label className="text-xs text-[#8888a8] block mb-1.5">Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this project for?"
              className="w-full bg-[#16161f] border border-[#252535] rounded-lg px-3 py-2.5 text-sm text-[#e4e4f0] placeholder:text-[#4a4a68] focus:outline-none focus:border-[#7c6dfa] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-[#8888a8] block mb-1.5">
              System Prompt
              <span className="text-[#4a4a68] ml-1">(applied to all chats in this project)</span>
            </label>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="You are a helpful assistant specialized in..."
              rows={4}
              className="w-full bg-[#16161f] border border-[#252535] rounded-lg px-3 py-2.5 text-sm text-[#e4e4f0] placeholder:text-[#4a4a68] focus:outline-none focus:border-[#7c6dfa] transition-colors font-mono resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-[#8888a8] block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#252535] text-sm text-[#8888a8] hover:text-[#e4e4f0] hover:border-[#303045] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-lg bg-[#7c6dfa] hover:bg-[#9080ff] text-white text-sm font-medium transition-colors"
          >
            {existing ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
