'use client'
import { useState } from 'react'
import { useAppStore, Project } from '@/store'
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  MessageSquare, FolderOpen, Settings, Key, Edit2, Check, X
} from 'lucide-react'
import clsx from 'clsx'
import ProjectModal from './ProjectModal'

export default function Sidebar() {
  const {
    projects, activeProjectId, activeChatId,
    setActiveProject, setActiveChat,
    createChat, deleteChat, deleteProject,
    updateChatTitle, apiKey, setApiKey,
  } = useAppStore()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyVal, setKeyVal] = useState('')

  const toggleProject = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }))

  const handleSelectChat = (projectId: string, chatId: string) => {
    setActiveProject(projectId)
    setActiveChat(chatId)
  }

  const handleNewChat = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await createChat(projectId)
  }

  const handleDeleteChat = (projectId: string, chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChat(projectId, chatId)
  }

  const startRename = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingChatId(chatId)
    setRenameVal(currentTitle)
  }

  const commitRename = (projectId: string, chatId: string) => {
    if (renameVal.trim()) updateChatTitle(projectId, chatId, renameVal.trim())
    setRenamingChatId(null)
  }

  const handleSaveKey = () => {
    if (keyVal.trim()) { setApiKey(keyVal.trim()); setKeyVal('') }
    setShowKeyInput(false)
  }

  return (
    <>
      <aside className="flex flex-col h-screen bg-[#0f0f18] border-r border-[#252535] w-64 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#252535]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7c6dfa] shadow-[0_0_8px_rgba(124,109,250,0.6)]" />
            <span className="font-display font-bold text-[15px] tracking-tight text-[#e4e4f0]">OSS Chat</span>
          </div>
          <span className="text-[10px] text-[#7c6dfa] bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 px-2 py-0.5 rounded-full">
            120b
          </span>
        </div>

        {/* New Project btn */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={() => { setEditingProject(null); setShowProjectModal(true) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#8888a8] hover:text-[#e4e4f0] hover:bg-[#16161f] transition-all border border-dashed border-[#252535] hover:border-[#303045]"
          >
            <Plus size={13} />
            New Project
          </button>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {projects.length === 0 && (
            <p className="text-xs text-[#4a4a68] text-center mt-8 px-4">No projects yet. Create one above.</p>
          )}
          {projects.map((project) => {
            const isActiveProject = project.id === activeProjectId
            const isOpen = expanded[project.id] !== false // default open

            return (
              <div key={project.id}>
                {/* Project row */}
                <div
                  className={clsx(
                    'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-all',
                    isActiveProject ? 'bg-[#16161f]' : 'hover:bg-[#16161f]/60'
                  )}
                  onClick={() => {
                    setActiveProject(project.id)
                    toggleProject(project.id)
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: project.color }} />
                  <span className="flex-1 text-xs font-medium truncate text-[#e4e4f0]">{project.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowProjectModal(true) }}
                      className="p-0.5 text-[#4a4a68] hover:text-[#a89aff] transition-colors"
                    >
                      <Settings size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }}
                      className="p-0.5 text-[#4a4a68] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {isOpen ? <ChevronDown size={12} className="text-[#4a4a68] flex-shrink-0" /> : <ChevronRight size={12} className="text-[#4a4a68] flex-shrink-0" />}
                </div>

                {/* Chats under project */}
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[#1c1c28] pl-2">
                    {project.chats.map((chat) => {
                      const isActiveChat = chat.id === activeChatId && isActiveProject
                      return (
                        <div
                          key={chat.id}
                          onClick={() => handleSelectChat(project.id, chat.id)}
                          className={clsx(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-all',
                            isActiveChat ? 'bg-[#7c6dfa]/10 text-[#a89aff]' : 'text-[#8888a8] hover:text-[#e4e4f0] hover:bg-[#16161f]'
                          )}
                        >
                          <MessageSquare size={11} className="flex-shrink-0" />
                          {renamingChatId === chat.id ? (
                            <input
                              autoFocus
                              value={renameVal}
                              onChange={(e) => setRenameVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(project.id, chat.id)
                                if (e.key === 'Escape') setRenamingChatId(null)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-[#1c1c28] text-[#e4e4f0] text-xs px-1 py-0.5 rounded outline-none border border-[#7c6dfa]/40"
                            />
                          ) : (
                            <span className="flex-1 text-xs truncate">{chat.title}</span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {renamingChatId === chat.id ? (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); commitRename(project.id, chat.id) }} className="p-0.5 text-[#4ade80]"><Check size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setRenamingChatId(null) }} className="p-0.5 text-red-400"><X size={10} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={(e) => startRename(chat.id, chat.title, e)} className="p-0.5 text-[#4a4a68] hover:text-[#a89aff]"><Edit2 size={10} /></button>
                                {project.chats.length > 1 && (
                                  <button onClick={(e) => handleDeleteChat(project.id, chat.id, e)} className="p-0.5 text-[#4a4a68] hover:text-red-400"><Trash2 size={10} /></button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {/* New chat in project */}
                    <button
                      onClick={(e) => handleNewChat(project.id, e)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[10px] text-[#4a4a68] hover:text-[#8888a8] transition-colors"
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

        {/* Bottom: API key */}
        <div className="border-t border-[#252535] p-3">
          {showKeyInput ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="password"
                value={keyVal}
                onChange={(e) => setKeyVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); if (e.key === 'Escape') setShowKeyInput(false) }}
                placeholder="sk-or-v1-..."
                className="flex-1 bg-[#16161f] border border-[#252535] rounded px-2 py-1.5 text-xs text-[#e4e4f0] placeholder:text-[#4a4a68] outline-none focus:border-[#7c6dfa]"
              />
              <button onClick={handleSaveKey} className="p-1.5 bg-[#7c6dfa]/20 rounded text-[#7c6dfa] hover:bg-[#7c6dfa]/30"><Check size={12} /></button>
              <button onClick={() => setShowKeyInput(false)} className="p-1.5 bg-[#16161f] rounded text-[#4a4a68] hover:text-red-400"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowKeyInput(true)}
              className="flex items-center gap-2 w-full text-xs text-[#4a4a68] hover:text-[#8888a8] transition-colors py-1"
            >
              <Key size={12} />
              <span className="truncate">{apiKey ? `Key: ${apiKey.slice(0, 12)}…` : 'Set API Key'}</span>
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
