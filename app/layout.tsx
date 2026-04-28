import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OSS Chat',
  description: 'GPT-OSS 120B via OpenRouter — with Projects',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
