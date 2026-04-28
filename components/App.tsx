'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import ApiKeyModal from './ApiKeyModal'

export default function App() {
  const { apiKey, loadAll, loading, projects, activeProjectId, setActiveProject } = useAppStore()

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!loading && projects.length > 0 && !activeProjectId) {
      setActiveProject(projects[0].id)
    }
  }, [loading, projects, activeProjectId])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090f]">
      {!apiKey && <ApiKeyModal />}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#4a4a68] text-sm">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="ml-1">Loading from Supabase…</span>
          </div>
        </div>
      ) : (
        <>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <ChatArea />
          </main>
        </>
      )}
    </div>
  )
}
