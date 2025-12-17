import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'VibeVault',
    description: 'Anonymous confessions and echo threads.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={cn(inter.className, "bg-black min-h-screen")}>
                {/* Global Wallpaper */}
                <div className="fixed inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 blur-sm pointer-events-none" />

                <div className="relative z-10 w-full h-full min-h-screen">
                    {children}
                </div>
            </body>
        </html>
    )
}
