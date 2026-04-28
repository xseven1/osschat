import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
}

export interface Chat {
  id: string
  project_id: string
  title: string
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

interface AppState {
  apiKey: string
  setApiKey: (key: string) => void

  projects: Project[]
  activeProjectId: string | null
  activeChatId: string | null
  loading: boolean

  loadAll: () => Promise<void>
  createProject: (name: string, description?: string, systemPrompt?: string) => Promise<string>
  updateProject: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'systemPrompt' | 'color'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setActiveProject: (id: string | null) => void

  createChat: (projectId: string, title?: string) => Promise<string>
  updateChatTitle: (chatId: string, title: string) => Promise<void>
  deleteChat: (projectId: string, chatId: string) => Promise<void>
  setActiveChat: (id: string | null) => void

  addMessage: (projectId: string, chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>
  clearChat: (projectId: string, chatId: string) => Promise<void>

  getActiveProject: () => Project | null
  getActiveChat: () => Chat | null
}

const PROJECT_COLORS = ['#7c6dfa','#4ade80','#f87171','#fbbf24','#22d3ee','#e879f9','#fb923c','#a3e635','#60a5fa','#f472b6']

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),

      projects: [],
      activeProjectId: null,
      activeChatId: null,
      loading: false,

      loadAll: async () => {
        set({ loading: true })
        try {
          const { data: projects } = await supabase.from('projects').select('*').order('created_at')
          const { data: chats } = await supabase.from('chats').select('*').order('created_at')
          const { data: messages } = await supabase.from('messages').select('*').order('timestamp')

          const enriched: Project[] = (projects ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? '',
            systemPrompt: p.system_prompt ?? '',
            color: p.color ?? '#7c6dfa',
            createdAt: new Date(p.created_at).getTime(),
            updatedAt: new Date(p.updated_at).getTime(),
            chats: (chats ?? [])
              .filter((c: any) => c.project_id === p.id)
              .map((c: any) => ({
                id: c.id,
                project_id: c.project_id,
                title: c.title,
                createdAt: new Date(c.created_at).getTime(),
                updatedAt: new Date(c.updated_at).getTime(),
                messages: (messages ?? [])
                  .filter((m: any) => m.chat_id === c.id)
                  .map((m: any) => ({
                    id: m.id,
                    role: m.role as Role,
                    content: m.content,
                    timestamp: new Date(m.timestamp).getTime(),
                  })),
              })),
          }))

          const current = get()
          const activeProject = enriched.find((p) => p.id === current.activeProjectId) ?? enriched[0]
          const activeChat = activeProject?.chats.find((c) => c.id === current.activeChatId) ?? activeProject?.chats[0]

          set({
            projects: enriched,
            loading: false,
            activeProjectId: activeProject?.id ?? null,
            activeChatId: activeChat?.id ?? null,
          })
        } catch (e) {
          console.error(e)
          set({ loading: false })
        }
      },

      createProject: async (name, description = '', systemPrompt = '') => {
        const id = uuidv4()
        const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
        const now = new Date().toISOString()
        const firstChatId = uuidv4()

        await supabase.from('projects').insert({ id, name, description, system_prompt: systemPrompt, color, created_at: now, updated_at: now })
        await supabase.from('chats').insert({ id: firstChatId, project_id: id, title: 'Chat 1', created_at: now, updated_at: now })

        const ts = Date.now()
        const newProject: Project = {
          id, name, description, systemPrompt, color, createdAt: ts, updatedAt: ts,
          chats: [{ id: firstChatId, project_id: id, title: 'Chat 1', messages: [], createdAt: ts, updatedAt: ts }],
        }

        set((s) => ({ projects: [...s.projects, newProject], activeProjectId: id, activeChatId: firstChatId }))
        return id
      },

      updateProject: async (id, data) => {
        await supabase.from('projects').update({
          name: data.name, description: data.description, system_prompt: data.systemPrompt, color: data.color,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p) }))
      },

      deleteProject: async (id) => {
        await supabase.from('projects').delete().eq('id', id)
        set((s) => {
          const remaining = s.projects.filter((p) => p.id !== id)
          return { projects: remaining, activeProjectId: remaining[0]?.id ?? null, activeChatId: remaining[0]?.chats[0]?.id ?? null }
        })
      },

      setActiveProject: (id) => set((s) => {
        const project = s.projects.find((p) => p.id === id)
        return { activeProjectId: id, activeChatId: project?.chats[0]?.id ?? null }
      }),

      createChat: async (projectId, title) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const project = get().projects.find((p) => p.id === projectId)
        const chatTitle = title ?? `Chat ${(project?.chats.length ?? 0) + 1}`

        await supabase.from('chats').insert({ id, project_id: projectId, title: chatTitle, created_at: now, updated_at: now })

        const ts = Date.now()
        const newChat: Chat = { id, project_id: projectId, title: chatTitle, messages: [], createdAt: ts, updatedAt: ts }

        set((s) => ({
          projects: s.projects.map((p) => p.id !== projectId ? p : { ...p, chats: [...p.chats, newChat] }),
          activeChatId: id,
        }))
        return id
      },

      updateChatTitle: async (chatId, title) => {
        await supabase.from('chats').update({ title, updated_at: new Date().toISOString() }).eq('id', chatId)
        set((s) => ({
          projects: s.projects.map((p) => ({ ...p, chats: p.chats.map((c) => c.id === chatId ? { ...c, title } : c) }))
        }))
      },

      deleteChat: async (projectId, chatId) => {
        await supabase.from('chats').delete().eq('id', chatId)
        set((s) => {
          const project = s.projects.find((p) => p.id === projectId)
          const remaining = project?.chats.filter((c) => c.id !== chatId) ?? []
          return {
            projects: s.projects.map((p) => p.id !== projectId ? p : { ...p, chats: remaining }),
            activeChatId: s.activeChatId === chatId ? (remaining[remaining.length - 1]?.id ?? null) : s.activeChatId,
          }
        })
      },

      setActiveChat: (id) => set({ activeChatId: id }),

      addMessage: async (projectId, chatId, message) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const ts = Date.now()

        await supabase.from('messages').insert({ id, chat_id: chatId, role: message.role, content: message.content, timestamp: now })
        await supabase.from('chats').update({ updated_at: now }).eq('id', chatId)

        const newMsg: Message = { id, ...message, timestamp: ts }
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId ? p : {
              ...p,
              chats: p.chats.map((c) => c.id !== chatId ? c : { ...c, messages: [...c.messages, newMsg], updatedAt: ts })
            }
          ),
        }))
      },

      clearChat: async (projectId, chatId) => {
        await supabase.from('messages').delete().eq('chat_id', chatId)
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId ? p : {
              ...p,
              chats: p.chats.map((c) => c.id !== chatId ? c : { ...c, messages: [], updatedAt: Date.now() })
            }
          ),
        }))
      },

      getActiveProject: () => {
        const { projects, activeProjectId } = get()
        return projects.find((p) => p.id === activeProjectId) ?? null
      },

      getActiveChat: () => {
        const { projects, activeProjectId, activeChatId } = get()
        const project = projects.find((p) => p.id === activeProjectId)
        return project?.chats.find((c) => c.id === activeChatId) ?? null
      },
    }),
    {
      name: 'osschat-v2',
      partialize: (s) => ({ apiKey: s.apiKey, activeProjectId: s.activeProjectId, activeChatId: s.activeChatId }),
    }
  )
)
