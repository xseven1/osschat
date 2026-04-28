'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import ApiKeyModal from './ApiKeyModal'

export default function App() {
  const { apiKey, loadAll, loading } = useAppStore()

  useEffect(() => {
    loadAll()
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0c14]">
      {!apiKey && <ApiKeyModal />}
      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-[#555570]">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
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
