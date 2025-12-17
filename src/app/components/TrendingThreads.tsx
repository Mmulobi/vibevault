'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getAvatar } from '@/lib/avatar'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { MessageCircle } from 'lucide-react'

type Thread = {
    id: string
    title?: string
    last_activity_at: string
    vault: { name: string, icon: string }
    messages: { content: string, anon_hash: string }[]
}

export default function TrendingThreads({ threads: initialThreads }: { threads: any[] }) {
    const [threads, setThreads] = useState<Thread[]>(initialThreads)

    useEffect(() => {
        const fetchThreads = async () => {
            const { data } = await supabase
                .from('echo_threads')
                .select(`*, vault:vault_id(name, icon), messages:thread_messages(id, content, anon_hash)`)
                .eq('is_public', true)
                .order('last_activity_at', { ascending: false })
                .limit(20)
            if (data) setThreads(data)
        }

        const channel = supabase
            .channel('public_threads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'echo_threads' }, fetchThreads)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'thread_messages' }, fetchThreads)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const item = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    }

    if (threads.length === 0) return <div className="text-center text-gray-600 text-xs italic mt-10">Use the pill above to start a thread...</div>

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 relative z-10"
        >
            <AnimatePresence>
                {threads.map((thread) => {
                    const lastMsg = thread.messages?.[thread.messages.length - 1]
                    const avatar = lastMsg ? getAvatar(lastMsg.anon_hash) : "?? Anon"
                    const time = new Date(thread.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    return (
                        <motion.div variants={item} key={thread.id} layout>
                            <Link href={`/thread/${thread.id}`}>
                                <GlassCard className="group p-3 flex items-center gap-4 hover:bg-white/5 hover:border-purple-500/20 transition-all cursor-pointer relative overflow-hidden bg-black/40" hoverEffect={false}>
                                    {/* Type Indicator */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/0 group-hover:bg-purple-500 transition-colors" />

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 flex items-center justify-center text-lg shrink-0">
                                        {avatar.split(' ')[1]?.[0]}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-gray-200 text-sm truncate group-hover:text-purple-300 transition-colors">
                                                {thread.title || "Untitled Echo"}
                                            </h3>
                                            <span className="text-[10px] text-gray-600 shrink-0 font-mono" suppressHydrationWarning>{time}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 uppercase tracking-widest border border-white/5">
                                                {thread.vault?.name}
                                            </span>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                                {lastMsg ? lastMsg.content : "..."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Icon */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                        <MessageCircle className="w-4 h-4 text-purple-400" />
                                    </div>
                                </GlassCard>
                            </Link>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </motion.div>
    )
}
