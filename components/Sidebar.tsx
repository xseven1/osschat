'use client'
import { useState } from 'react'
import { useAppStore, Project } from '@/store'
import {
  Plus, Trash2, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
  MessageSquare, Settings, Key, Edit2, Check, X, Zap, FolderOpen,
} from 'lucide-react'
import clsx from 'clsx'
import ProjectModal from './ProjectModal'

export default function Sidebar() {
  const {
    projects, quickChats, activeView,
    setActiveView, createQuickChat, deleteQuickChat, updateQuickChatTitle,
    createProject, createChat, deleteChat, deleteProject,
    updateChatTitle,
  } = useAppStore()

  const [collapsed, setCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyVal, setKeyVal] = useState('')
  const { apiKey, setApiKey } = useAppStore()

  const toggleProject = (id: string) =>
    setExpandedProjects((e) => ({ ...e, [id]: !isProjectOpen(id) }))

  const isProjectOpen = (id: string) => expandedProjects[id] !== false

  const startRename = (id: string, current: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingId(id)
    setRenameVal(current)
  }

  const commitRename = async (type: 'quick' | 'chat', id: string) => {
    if (!renameVal.trim()) { setRenamingId(null); return }
    if (type === 'quick') await updateQuickChatTitle(id, renameVal.trim())
    else await updateChatTitle(id, renameVal.trim())
    setRenamingId(null)
  }

  const handleSaveKey = () => {
    if (keyVal.trim()) { setApiKey(keyVal.trim()); setKeyVal('') }
    setShowKeyInput(false)
  }

  // Collapsed state — show only icon rail
  if (collapsed) {
    return (
      <aside className="flex flex-col h-screen w-12 flex-shrink-0 bg-[#0f0f1a] border-r border-white/5 items-center py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          title="Expand sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
        <div className="w-full h-px bg-white/5" />
        {/* Quick chat dots */}
        {quickChats.map((q) => {
          const isActive = activeView?.type === 'quick' && activeView.chatId === q.id
          return (
            <button
              key={q.id}
              onClick={() => setActiveView({ type: 'quick', chatId: q.id })}
              title={q.title}
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                isActive ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/25 hover:text-white/60 hover:bg-white/5'
              )}
            >
              <Zap size={13} />
            </button>
          )
        })}
        <div className="w-full h-px bg-white/5" />
        {/* Project color dots */}
        {projects.map((p) => {
          const isActive = activeView?.type === 'project' && activeView.projectId === p.id
          return (
            <button
              key={p.id}
              onClick={() => {
                if (p.chats.length) setActiveView({ type: 'project', projectId: p.id, chatId: p.chats[0].id })
              }}
              title={p.name}
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                isActive ? 'ring-1 ring-white/20' : 'hover:ring-1 hover:ring-white/10'
              )}
              style={{ background: p.color + '33' }}
            >
              <div className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            </button>
          )
        })}
      </aside>
    )
  }

  return (
    <>
      <aside className="flex flex-col h-screen w-64 flex-shrink-0 bg-[#0f0f1a] border-r border-white/5 transition-all">
        {/* Logo + collapse button */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            </div>
            <span className="font-display font-bold text-[15px] text-white/90 tracking-tight">OSS Chat</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-5">
          {/* ── Quick Chats ── */}
          <section className="px-3">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Quick Chats</span>
              <button
                onClick={() => createQuickChat()}
                className="p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                title="New quick chat"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="space-y-0.5">
              {quickChats.length === 0 && (
                <button
                  onClick={() => createQuickChat()}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all border border-dashed border-white/10"
                >
                  <Zap size={12} />
                  New quick chat
                </button>
              )}
              {quickChats.map((q) => {
                const isActive = activeView?.type === 'quick' && activeView.chatId === q.id
                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveView({ type: 'quick', chatId: q.id })}
                    className={clsx(
                      'group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all',
                      isActive ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    )}
                  >
                    <Zap size={11} className="flex-shrink-0" />
                    {renamingId === q.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename('quick', q.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-white/10 text-white/90 text-xs px-1.5 py-0.5 rounded outline-none border border-indigo-400/30"
                      />
                    ) : (
                      <span className="flex-1 text-xs truncate">{q.title}</span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {renamingId === q.id ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); commitRename('quick', q.id) }} className="p-0.5 text-emerald-400"><Check size={10} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setRenamingId(null) }} className="p-0.5 text-red-400"><X size={10} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={(e) => startRename(q.id, q.title, e)} className="p-0.5 text-white/30 hover:text-white/70"><Edit2 size={10} /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteQuickChat(q.id) }} className="p-0.5 text-white/30 hover:text-red-400"><Trash2 size={10} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Projects ── */}
          <section className="px-3">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Projects</span>
              <button
                onClick={() => { setEditingProject(null); setShowProjectModal(true) }}
                className="p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                title="New project"
              >
                <Plus size={12} />
              </button>
            </div>

            {projects.length === 0 && (
              <button
                onClick={() => { setEditingProject(null); setShowProjectModal(true) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all border border-dashed border-white/10"
              >
                <FolderOpen size={12} />
                New project
              </button>
            )}

            <div className="space-y-1">
              {projects.map((project) => {
                const isOpen = isProjectOpen(project.id)
                const isActiveProject = activeView?.type === 'project' && activeView.projectId === project.id

                return (
                  <div key={project.id}>
                    <div
                      className={clsx(
                        'group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all',
                        isActiveProject ? 'bg-white/8' : 'hover:bg-white/5'
                      )}
                      onClick={() => {
                        toggleProject(project.id)
                        if (project.chats.length) {
                          setActiveView({ type: 'project', projectId: project.id, chatId: project.chats[0].id })
                        }
                      }}
                    >
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: project.color }} />
                      <span className="flex-1 text-xs font-medium text-white/70 truncate">{project.name}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowProjectModal(true) }} className="p-0.5 text-white/30 hover:text-white/70"><Settings size={10} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }} className="p-0.5 text-white/30 hover:text-red-400"><Trash2 size={10} /></button>
                      </div>
                      {isOpen
                        ? <ChevronDown size={11} className="text-white/20 flex-shrink-0" />
                        : <ChevronRight size={11} className="text-white/20 flex-shrink-0" />}
                    </div>

                    {isOpen && (
                      <div className="ml-3 mt-0.5 space-y-0.5 pl-2 border-l border-white/5">
                        {project.chats.map((chat) => {
                          const isActive = activeView?.type === 'project' && activeView.chatId === chat.id
                          return (
                            <div
                              key={chat.id}
                              onClick={() => setActiveView({ type: 'project', projectId: project.id, chatId: chat.id })}
                              className={clsx(
                                'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all',
                                isActive ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                              )}
                            >
                              <MessageSquare size={10} className="flex-shrink-0" />
                              {renamingId === chat.id ? (
                                <input
                                  autoFocus
                                  value={renameVal}
                                  onChange={(e) => setRenameVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRename('chat', chat.id)
                                    if (e.key === 'Escape') setRenamingId(null)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 bg-white/10 text-white/90 text-xs px-1.5 py-0.5 rounded outline-none border border-indigo-400/30"
                                />
                              ) : (
                                <span className="flex-1 text-xs truncate">{chat.title}</span>
                              )}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {renamingId === chat.id ? (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); commitRename('chat', chat.id) }} className="p-0.5 text-emerald-400"><Check size={10} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(null) }} className="p-0.5 text-red-400"><X size={10} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={(e) => startRename(chat.id, chat.title, e)} className="p-0.5 text-white/30 hover:text-white/70"><Edit2 size={10} /></button>
                                    {project.chats.length > 1 && (
                                      <button onClick={(e) => { e.stopPropagation(); deleteChat(project.id, chat.id) }} className="p-0.5 text-white/30 hover:text-red-400"><Trash2 size={10} /></button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        <button
                          onClick={() => createChat(project.id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[10px] text-white/25 hover:text-white/50 transition-colors"
                        >
                          <Plus size={10} />
                          New chat
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* API key footer */}
        <div className="border-t border-white/5 p-3">
          {showKeyInput ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="password"
                value={keyVal}
                onChange={(e) => setKeyVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); if (e.key === 'Escape') setShowKeyInput(false) }}
                placeholder="sk-or-v1-..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-indigo-400/40"
              />
              <button onClick={handleSaveKey} className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400"><Check size={12} /></button>
              <button onClick={() => setShowKeyInput(false)} className="p-1.5 bg-white/5 rounded-lg text-white/30 hover:text-red-400"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowKeyInput(true)}
              className="flex items-center gap-2 w-full text-xs text-white/25 hover:text-white/50 transition-colors py-1 px-1"
            >
              <Key size={12} />
              <span className="truncate">{apiKey ? `Key: ${apiKey.slice(0, 14)}…` : 'Set API key'}</span>
            </button>
          )}
        </div>
      </aside>

      {showProjectModal && (
        <ProjectModal
          existing={editingProject}
          onClose={() => { setShowProjectModal(false); setEditingProject(null) }}
        />
      )}
    </>
  )
}
