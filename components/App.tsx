'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import ApiKeyModal from './ApiKeyModal'

export default function App() {
  const { apiKey, projects, activeProjectId, activeChatId, createProject, setActiveProject } = useAppStore()

  // On first load with no projects, create a default one
  useEffect(() => {
    if (projects.length === 0) {
      createProject('General', 'Default project for general conversations')
    }
  }, [])

  // If active project was deleted, reset
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProject(projects[0].id)
    }
  }, [projects, activeProjectId])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090f]">
      {!apiKey && <ApiKeyModal />}
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatArea />
      </main>
    </div>
  )
}
