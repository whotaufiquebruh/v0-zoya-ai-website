import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Zoya — Your AI Companion',
  description: 'A caring, emotionally intelligent AI companion who talks in Hinglish. Feel understood, never alone.',
  keywords: ['AI companion', 'Hinglish AI', 'emotional AI', 'Zoya AI'],
  authors: [{ name: 'Sk Taufique Hossain' }],
}

export const viewport: Viewport = {
  themeColor: '#fdf9fa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
