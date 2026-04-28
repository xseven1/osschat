import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
}

export interface Chat {
  id: string
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
  chats: Chat[]
  createdAt: number
  updatedAt: number
  color: string
}

interface AppState {
  apiKey: string
  setApiKey: (key: string) => void

  projects: Project[]
  activeProjectId: string | null
  activeChatId: string | null

  createProject: (name: string, description?: string, systemPrompt?: string) => string
  updateProject: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'systemPrompt' | 'color'>>) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string | null) => void

  createChat: (projectId: string, title?: string) => string
  updateChatTitle: (projectId: string, chatId: string, title: string) => void
  deleteChat: (projectId: string, chatId: string) => void
  setActiveChat: (id: string | null) => void

  addMessage: (projectId: string, chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  clearChat: (projectId: string, chatId: string) => void

  getActiveProject: () => Project | null
  getActiveChat: () => Chat | null
}

const PROJECT_COLORS = [
  '#7c6dfa', '#4ade80', '#f87171', '#fbbf24', '#22d3ee', '#e879f9', '#fb923c', '#a3e635'
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),

      projects: [],
      activeProjectId: null,
      activeChatId: null,

      createProject: (name, description = '', systemPrompt = '') => {
        const id = uuidv4()
        const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
        const now = Date.now()
        const firstChatId = uuidv4()
        set((s) => ({
          projects: [...s.projects, {
            id, name, description, systemPrompt, color,
            createdAt: now, updatedAt: now,
            chats: [{
              id: firstChatId,
              title: 'Chat 1',
              messages: [],
              createdAt: now,
              updatedAt: now,
            }]
          }],
          activeProjectId: id,
          activeChatId: firstChatId,
        }))
        return id
      },

      updateProject: (id, data) => set((s) => ({
        projects: s.projects.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
        )
      })),

      deleteProject: (id) => set((s) => {
        const remaining = s.projects.filter((p) => p.id !== id)
        return {
          projects: remaining,
          activeProjectId: remaining.length ? remaining[0].id : null,
          activeChatId: remaining.length && remaining[0].chats.length ? remaining[0].chats[0].id : null,
        }
      }),

      setActiveProject: (id) => set((s) => {
        const project = s.projects.find((p) => p.id === id)
        return {
          activeProjectId: id,
          activeChatId: project?.chats[0]?.id ?? null,
        }
      }),

      createChat: (projectId, title) => {
        const id = uuidv4()
        const now = Date.now()
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p
            const chatNum = p.chats.length + 1
            return {
              ...p,
              updatedAt: now,
              chats: [...p.chats, {
                id,
                title: title ?? `Chat ${chatNum}`,
                messages: [],
                createdAt: now,
                updatedAt: now,
              }]
            }
          }),
          activeChatId: id,
        }))
        return id
      },

      updateChatTitle: (projectId, chatId, title) => set((s) => ({
        projects: s.projects.map((p) =>
          p.id !== projectId ? p : {
            ...p,
            chats: p.chats.map((c) => c.id === chatId ? { ...c, title } : c)
          }
        )
      })),

      deleteChat: (projectId, chatId) => set((s) => {
        const project = s.projects.find((p) => p.id === projectId)
        if (!project) return s
        const remaining = project.chats.filter((c) => c.id !== chatId)
        const newChatId = remaining.length ? remaining[remaining.length - 1].id : null
        return {
          projects: s.projects.map((p) =>
            p.id !== projectId ? p : { ...p, chats: remaining }
          ),
          activeChatId: s.activeChatId === chatId ? newChatId : s.activeChatId,
        }
      }),

      setActiveChat: (id) => set({ activeChatId: id }),

      addMessage: (projectId, chatId, message) => {
        const now = Date.now()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId ? p : {
              ...p,
              updatedAt: now,
              chats: p.chats.map((c) =>
                c.id !== chatId ? c : {
                  ...c,
                  updatedAt: now,
                  messages: [...c.messages, { ...message, id: uuidv4(), timestamp: now }]
                }
              )
            }
          )
        }))
      },

      clearChat: (projectId, chatId) => set((s) => ({
        projects: s.projects.map((p) =>
          p.id !== projectId ? p : {
            ...p,
            chats: p.chats.map((c) =>
              c.id !== chatId ? c : { ...c, messages: [], updatedAt: Date.now() }
            )
          }
        )
      })),

      getActiveProject: () => {
        const { projects, activeProjectId } = get()
        return projects.find((p) => p.id === activeProjectId) ?? null
      },

      getActiveChat: () => {
        const { activeProjectId, activeChatId, projects } = get()
        const project = projects.find((p) => p.id === activeProjectId)
        return project?.chats.find((c) => c.id === activeChatId) ?? null
      },
    }),
    {
      name: 'osschat-storage',
    }
  )
)
