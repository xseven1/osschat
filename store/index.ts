import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

export type Role = 'user' | 'assistant' | 'system'

export const FREE_MODELS = [
  { id: 'openai/gpt-oss-120b:free',               label: 'GPT-OSS 120B',     provider: 'OpenAI',      context: '131K' },
  { id: 'openai/gpt-oss-20b:free',                label: 'GPT-OSS 20B',      provider: 'OpenAI',      context: '131K' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super', provider: 'NVIDIA',      context: '262K' },
  { id: 'tencent/hy3-preview:free',               label: 'Hy3 Preview',      provider: 'Tencent',     context: '262K' },
  { id: 'inclusionai/ling-2.6-1t:free',           label: 'Ling-2.6 1T',      provider: 'inclusionAI', context: '262K' },
  { id: 'inclusionai/ling-2.6-flash:free',        label: 'Ling-2.6 Flash',   provider: 'inclusionAI', context: '262K' },
  { id: 'minimax/minimax-m2.5:free',              label: 'MiniMax M2.5',     provider: 'MiniMax',     context: '197K' },
  { id: 'z-ai/glm-4.5-air:free',                 label: 'GLM 4.5 Air',      provider: 'Z.ai',        context: '131K' },
  { id: 'deepseek/deepseek-r1:free',              label: 'DeepSeek R1',      provider: 'DeepSeek',    context: '164K' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B',   provider: 'Meta',        context: '131K' },
  { id: 'openrouter/free',                        label: 'Auto (Best Free)', provider: 'OpenRouter',  context: '—'    },
]

export const DEFAULT_MODEL = FREE_MODELS[0].id

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
}

// A quick chat lives outside any project
export interface QuickChat {
  id: string
  title: string
  model: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface Chat {
  id: string
  project_id: string
  title: string
  model: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  description: string
  systemPrompt: string
  color: string
  createdAt: number
  updatedAt: number
  chats: Chat[]
}

type ActiveView = { type: 'quick'; chatId: string } | { type: 'project'; projectId: string; chatId: string }

interface AppState {
  apiKey: string
  setApiKey: (key: string) => void

  projects: Project[]
  quickChats: QuickChat[]
  activeView: ActiveView | null
  loading: boolean

  loadAll: () => Promise<void>

  // Quick chats
  createQuickChat: () => Promise<string>
  deleteQuickChat: (id: string) => Promise<void>
  updateQuickChatTitle: (id: string, title: string) => Promise<void>
  updateQuickChatModel: (id: string, model: string) => void
  addQuickMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>
  clearQuickChat: (id: string) => Promise<void>

  // Projects
  createProject: (name: string, description?: string, systemPrompt?: string) => Promise<string>
  updateProject: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'systemPrompt' | 'color'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Project chats
  createChat: (projectId: string, title?: string) => Promise<string>
  updateChatTitle: (chatId: string, title: string) => Promise<void>
  updateChatModel: (chatId: string, model: string) => void
  deleteChat: (projectId: string, chatId: string) => Promise<void>
  addMessage: (projectId: string, chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>
  clearChat: (projectId: string, chatId: string) => Promise<void>

  setActiveView: (view: ActiveView | null) => void

  getActiveQuickChat: () => QuickChat | null
  getActiveProjectChat: () => { project: Project; chat: Chat } | null
}

export const PROJECT_COLORS = ['#7c6dfa','#4ade80','#f87171','#fbbf24','#22d3ee','#e879f9','#fb923c','#a3e635','#60a5fa','#f472b6']

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),

      projects: [],
      quickChats: [],
      activeView: null,
      loading: false,

      loadAll: async () => {
        set({ loading: true })
        try {
          const [{ data: projects }, { data: chats }, { data: messages }, { data: quickChats }, { data: quickMessages }] = await Promise.all([
            supabase.from('projects').select('*').order('created_at'),
            supabase.from('chats').select('*').order('created_at'),
            supabase.from('messages').select('*').order('timestamp'),
            supabase.from('quick_chats').select('*').order('created_at'),
            supabase.from('quick_messages').select('*').order('timestamp'),
          ])

          const enrichedProjects: Project[] = (projects ?? []).map((p: any) => ({
            id: p.id, name: p.name, description: p.description ?? '',
            systemPrompt: p.system_prompt ?? '', color: p.color ?? '#7c6dfa',
            createdAt: new Date(p.created_at).getTime(),
            updatedAt: new Date(p.updated_at).getTime(),
            chats: (chats ?? []).filter((c: any) => c.project_id === p.id).map((c: any) => ({
              id: c.id, project_id: c.project_id, title: c.title,
              model: c.model ?? DEFAULT_MODEL,
              createdAt: new Date(c.created_at).getTime(),
              updatedAt: new Date(c.updated_at).getTime(),
              messages: (messages ?? []).filter((m: any) => m.chat_id === c.id).map((m: any) => ({
                id: m.id, role: m.role as Role, content: m.content,
                timestamp: new Date(m.timestamp).getTime(),
              })),
            })),
          }))

          const enrichedQuickChats: QuickChat[] = (quickChats ?? []).map((q: any) => ({
            id: q.id, title: q.title, model: q.model ?? DEFAULT_MODEL,
            createdAt: new Date(q.created_at).getTime(),
            updatedAt: new Date(q.updated_at).getTime(),
            messages: (quickMessages ?? []).filter((m: any) => m.chat_id === q.id).map((m: any) => ({
              id: m.id, role: m.role as Role, content: m.content,
              timestamp: new Date(m.timestamp).getTime(),
            })),
          }))

          const current = get()
          let activeView = current.activeView

          // Validate active view still exists
          if (activeView?.type === 'quick') {
            if (!enrichedQuickChats.find((q) => q.id === activeView!.chatId)) activeView = null
          } else if (activeView?.type === 'project') {
            const proj = enrichedProjects.find((p) => p.id === (activeView as any).projectId)
            if (!proj || !proj.chats.find((c) => c.id === (activeView as any).chatId)) activeView = null
          }

          // Default to first quick chat or first project chat
          if (!activeView) {
            if (enrichedQuickChats.length) {
              activeView = { type: 'quick', chatId: enrichedQuickChats[0].id }
            } else if (enrichedProjects.length && enrichedProjects[0].chats.length) {
              activeView = { type: 'project', projectId: enrichedProjects[0].id, chatId: enrichedProjects[0].chats[0].id }
            }
          }

          set({ projects: enrichedProjects, quickChats: enrichedQuickChats, activeView, loading: false })
        } catch (e) {
          console.error(e)
          set({ loading: false })
        }
      },

      // ── Quick chats ──────────────────────────────────────────────

      createQuickChat: async () => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const ts = Date.now()
        const num = get().quickChats.length + 1
        const title = `Quick Chat ${num}`

        await supabase.from('quick_chats').insert({ id, title, model: DEFAULT_MODEL, created_at: now, updated_at: now })

        const newChat: QuickChat = { id, title, model: DEFAULT_MODEL, messages: [], createdAt: ts, updatedAt: ts }
        set((s) => ({ quickChats: [...s.quickChats, newChat], activeView: { type: 'quick', chatId: id } }))
        return id
      },

      deleteQuickChat: async (id) => {
        await supabase.from('quick_chats').delete().eq('id', id)
        set((s) => {
          const remaining = s.quickChats.filter((q) => q.id !== id)
          const activeView = s.activeView?.type === 'quick' && s.activeView.chatId === id
            ? (remaining.length ? { type: 'quick' as const, chatId: remaining[remaining.length - 1].id } : null)
            : s.activeView
          return { quickChats: remaining, activeView }
        })
      },

      updateQuickChatTitle: async (id, title) => {
        await supabase.from('quick_chats').update({ title, updated_at: new Date().toISOString() }).eq('id', id)
        set((s) => ({ quickChats: s.quickChats.map((q) => q.id === id ? { ...q, title } : q) }))
      },

      updateQuickChatModel: (id, model) => {
        set((s) => ({ quickChats: s.quickChats.map((q) => q.id === id ? { ...q, model } : q) }))
      },

      addQuickMessage: async (chatId, message) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const ts = Date.now()
        await supabase.from('quick_messages').insert({ id, chat_id: chatId, role: message.role, content: message.content, timestamp: now })
        await supabase.from('quick_chats').update({ updated_at: now }).eq('id', chatId)
        const newMsg: Message = { id, ...message, timestamp: ts }
        set((s) => ({ quickChats: s.quickChats.map((q) => q.id !== chatId ? q : { ...q, messages: [...q.messages, newMsg], updatedAt: ts }) }))
      },

      clearQuickChat: async (id) => {
        await supabase.from('quick_messages').delete().eq('chat_id', id)
        set((s) => ({ quickChats: s.quickChats.map((q) => q.id !== id ? q : { ...q, messages: [], updatedAt: Date.now() }) }))
      },

      // ── Projects ─────────────────────────────────────────────────

      createProject: async (name, description = '', systemPrompt = '') => {
        const id = uuidv4()
        const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
        const now = new Date().toISOString()
        const firstChatId = uuidv4()
        const ts = Date.now()

        await supabase.from('projects').insert({ id, name, description, system_prompt: systemPrompt, color, created_at: now, updated_at: now })
        await supabase.from('chats').insert({ id: firstChatId, project_id: id, title: 'Chat 1', model: DEFAULT_MODEL, created_at: now, updated_at: now })

        const newProject: Project = {
          id, name, description, systemPrompt, color, createdAt: ts, updatedAt: ts,
          chats: [{ id: firstChatId, project_id: id, title: 'Chat 1', model: DEFAULT_MODEL, messages: [], createdAt: ts, updatedAt: ts }],
        }
        set((s) => ({ projects: [...s.projects, newProject], activeView: { type: 'project', projectId: id, chatId: firstChatId } }))
        return id
      },

      updateProject: async (id, data) => {
        await supabase.from('projects').update({
          name: data.name, description: data.description, system_prompt: data.systemPrompt,
          color: data.color, updated_at: new Date().toISOString(),
        }).eq('id', id)
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p) }))
      },

      deleteProject: async (id) => {
        await supabase.from('projects').delete().eq('id', id)
        set((s) => {
          const remaining = s.projects.filter((p) => p.id !== id)
          const activeView = s.activeView?.type === 'project' && s.activeView.projectId === id ? null : s.activeView
          return { projects: remaining, activeView }
        })
      },

      // ── Project chats ─────────────────────────────────────────────

      createChat: async (projectId, title) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const ts = Date.now()
        const project = get().projects.find((p) => p.id === projectId)
        const chatTitle = title ?? `Chat ${(project?.chats.length ?? 0) + 1}`

        await supabase.from('chats').insert({ id, project_id: projectId, title: chatTitle, model: DEFAULT_MODEL, created_at: now, updated_at: now })

        const newChat: Chat = { id, project_id: projectId, title: chatTitle, model: DEFAULT_MODEL, messages: [], createdAt: ts, updatedAt: ts }
        set((s) => ({
          projects: s.projects.map((p) => p.id !== projectId ? p : { ...p, chats: [...p.chats, newChat] }),
          activeView: { type: 'project', projectId, chatId: id },
        }))
        return id
      },

      updateChatTitle: async (chatId, title) => {
        await supabase.from('chats').update({ title, updated_at: new Date().toISOString() }).eq('id', chatId)
        set((s) => ({ projects: s.projects.map((p) => ({ ...p, chats: p.chats.map((c) => c.id === chatId ? { ...c, title } : c) })) }))
      },

      updateChatModel: (chatId, model) => {
        set((s) => ({ projects: s.projects.map((p) => ({ ...p, chats: p.chats.map((c) => c.id === chatId ? { ...c, model } : c) })) }))
      },

      deleteChat: async (projectId, chatId) => {
        await supabase.from('chats').delete().eq('id', chatId)
        set((s) => {
          const project = s.projects.find((p) => p.id === projectId)
          const remaining = project?.chats.filter((c) => c.id !== chatId) ?? []
          const activeView = s.activeView?.type === 'project' && s.activeView.chatId === chatId
            ? (remaining.length ? { type: 'project' as const, projectId, chatId: remaining[remaining.length - 1].id } : null)
            : s.activeView
          return { projects: s.projects.map((p) => p.id !== projectId ? p : { ...p, chats: remaining }), activeView }
        })
      },

      addMessage: async (projectId, chatId, message) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const ts = Date.now()
        await supabase.from('messages').insert({ id, chat_id: chatId, role: message.role, content: message.content, timestamp: now })
        await supabase.from('chats').update({ updated_at: now }).eq('id', chatId)
        const newMsg: Message = { id, ...message, timestamp: ts }
        set((s) => ({
          projects: s.projects.map((p) => p.id !== projectId ? p : {
            ...p, chats: p.chats.map((c) => c.id !== chatId ? c : { ...c, messages: [...c.messages, newMsg], updatedAt: ts }),
          }),
        }))
      },

      clearChat: async (projectId, chatId) => {
        await supabase.from('messages').delete().eq('chat_id', chatId)
        set((s) => ({
          projects: s.projects.map((p) => p.id !== projectId ? p : {
            ...p, chats: p.chats.map((c) => c.id !== chatId ? c : { ...c, messages: [], updatedAt: Date.now() }),
          }),
        }))
      },

      setActiveView: (view) => set({ activeView: view }),

      getActiveQuickChat: () => {
        const { quickChats, activeView } = get()
        if (activeView?.type !== 'quick') return null
        return quickChats.find((q) => q.id === activeView.chatId) ?? null
      },

      getActiveProjectChat: () => {
        const { projects, activeView } = get()
        if (activeView?.type !== 'project') return null
        const project = projects.find((p) => p.id === activeView.projectId)
        if (!project) return null
        const chat = project.chats.find((c) => c.id === activeView.chatId)
        if (!chat) return null
        return { project, chat }
      },
    }),
    {
      name: 'osschat-v3',
      partialize: (s) => ({ apiKey: s.apiKey, activeView: s.activeView }),
    }
  )
)
