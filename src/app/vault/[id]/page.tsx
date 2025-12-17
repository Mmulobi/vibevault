'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, MessageCircle, MoreHorizontal, Share2, Sparkles, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { getAvatar } from '@/lib/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThreadDrawer } from '@/components/ThreadDrawer'

// Theme Configuration
const vaultThemes: Record<string, { bg: string, accent: string, glow: string }> = {
    'Love': { bg: 'from-rose-950 via-pink-950', accent: 'text-rose-400', glow: 'shadow-rose-500/20' },
    'Dreams': { bg: 'from-indigo-950 via-purple-950', accent: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
    'Stress': { bg: 'from-orange-950 via-red-950', accent: 'text-orange-400', glow: 'shadow-orange-500/20' },
    'Secrets': { bg: 'from-emerald-950 via-teal-950', accent: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    'default': { bg: 'from-zinc-950 via-slate-950', accent: 'text-zinc-400', glow: 'shadow-white/10' }
}

export default function VaultPage() {
    const { id } = useParams()
    const router = useRouter()
    const [threads, setThreads] = useState<any[]>([])
    const [vault, setVault] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
    const PAGE_SIZE = 20

    // Theme Logic
    const themeName = vault?.name && vaultThemes[vault.name] ? vault.name : 'default'
    const theme = vaultThemes[themeName]

    const fetchThreads = async (from: number, to: number) => {
        const { data: { user } } = await supabase.auth.getUser()

        let query = supabase
            .from('echo_threads')
            .select(`*, vault:vault_id(name, icon), messages:thread_messages(id, content, anon_hash)`)
            .eq('vault_id', id)
            .order('last_activity_at', { ascending: false })
            .range(from, to)

        if (!user) {
            query = query.eq('is_public', true)
        }

        const { data } = await query
        return data || []
    }

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            // Fetch Vault Details
            const { data: vaultData } = await supabase.from('vaults').select('*').eq('id', id).single()
            if (vaultData) setVault(vaultData)

            // Initial Threads
            const data = await fetchThreads(0, PAGE_SIZE - 1)
            setThreads(data)
            if (data.length < PAGE_SIZE) setHasMore(false)
            setLoading(false)
        }
        init()

        // Realtime Subscription
        const channel = supabase
            .channel(`vault_feed_${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'echo_threads', filter: `vault_id=eq.${id}` },
                async (payload) => {
                    const { data } = await supabase
                        .from('echo_threads')
                        .select(`*, vault:vault_id(name, icon), messages:thread_messages(id, content, anon_hash)`)
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setThreads(prev => [data, ...prev])
                    }
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [id])

    const loadMore = async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        const from = threads.length
        const to = from + PAGE_SIZE - 1
        const newThreads = await fetchThreads(from, to)

        if (newThreads.length < PAGE_SIZE) setHasMore(false)

        setThreads(prev => {
            const existingIds = new Set(prev.map(t => t.id))
            const uniqueNew = newThreads.filter(t => !existingIds.has(t.id))
            return [...prev, ...uniqueNew]
        })
        setLoadingMore(false)
    }

    return (
        <div className={`min-h-screen bg-black text-white relative font-sans selection:bg-purple-500/30 overflow-x-hidden transition-colors duration-1000`}>

            {/* Dynamic Background */}
            <div className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.bg} to-black opacity-50 transition-colors duration-1000`} />
            <div className="fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

            {/* Hero Section */}
            <div className="relative z-10 pt-16 pb-12 px-4 md:pt-24 md:pb-20">
                <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative">

                    {/* Back Nav */}
                    <div className="absolute top-[-50px] left-0 md:top-0">
                        <Link href="/">
                            <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10 rounded-full group">
                                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </Button>
                        </Link>
                    </div>

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", duration: 0.8 }}
                        className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl border border-white/20 flex items-center justify-center text-6xl md:text-7xl mb-8 shadow-2xl ${theme.glow}`}
                    >
                        {vault?.icon !== 'default' ? '🔒' : (vault?.name === 'Love' ? '❤️' : vault?.name === 'Stress' ? '🤯' : vault?.name === 'Dreams' ? '🌙' : '✨')}
                    </motion.div>

                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl md:text-7xl font-bold mb-4 tracking-tight"
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                            {vault?.name || 'Loading...'}
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg md:text-xl text-gray-400 max-w-xl font-light leading-relaxed mb-10"
                    >
                        {vault?.description || "Enter the vault and explore the echoes within."}
                    </motion.p>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex gap-4"
                    >
                        <Link href={`/confess?vault_id=${id}`}>
                            <Button className={`h-12 px-8 rounded-full font-bold text-lg bg-white text-black hover:bg-white/90 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all`}>
                                Confess in {vault?.name}
                            </Button>
                        </Link>
                        <Button variant="outline" className="h-12 w-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
                            <Share2 className="w-5 h-5" />
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Content Feed */}
            <div className="relative z-10 max-w-3xl mx-auto px-4 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex gap-2">
                        <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full text-sm font-medium">Top</Button>
                        <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full text-sm font-medium">New</Button>
                    </div>
                    <span className="text-xs font-mono text-gray-500">{threads.length} ECHOES</span>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/5 rounded-3xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence>
                            {threads.map((thread, i) => {
                                const lastMsg = thread.messages?.[thread.messages.length - 1]
                                const avatar = lastMsg ? getAvatar(lastMsg.anon_hash) : "?? Anon"
                                const time = new Date(thread.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                                return (
                                    <motion.div
                                        key={thread.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link
                                            href={`/thread/${thread.id}`}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setActiveThreadId(thread.id)
                                            }}
                                        >
                                            <GlassCard
                                                className={`group p-6 md:p-8 hover:bg-white/10 transition-all cursor-pointer border-white/5 hover:border-white/20`}
                                                hoverEffect={true}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg shadow-inner`}>
                                                            {avatar.split(' ')[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-200">{avatar}</div>
                                                            <div className="text-xs text-gray-500">{time}</div>
                                                        </div>
                                                    </div>
                                                    {thread.is_public === false && (
                                                        <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-gray-400 border border-white/5">
                                                            PRIVATE
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-purple-200 transition-colors">
                                                    {thread.title}
                                                </h3>
                                                <p className="text-gray-400 leading-relaxed line-clamp-3 mb-4 group-hover:text-gray-300">
                                                    {lastMsg?.content}
                                                </p>

                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1.5 hover:text-white transition-colors">
                                                        <MessageCircle className="w-4 h-4" />
                                                        <span>{thread.messages?.length || 0}</span>
                                                    </div>
                                                    <div className="flex-1" />
                                                    <div className={`hidden group-hover:flex items-center gap-2 ${theme.accent} text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full`}>
                                                        View Thread <ArrowLeft className="w-3 h-3 rotate-180" />
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
                {hasMore && !loading && (
                    <div className="flex justify-center pt-12 pb-8">
                        <Button
                            onClick={loadMore}
                            disabled={loadingMore}
                            variant="outline"
                            className="rounded-full border-white/10 hover:bg-white/10 text-gray-400"
                        >
                            {loadingMore ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : null}
                            Load More Magic
                        </Button>
                    </div>
                )}
            </div>

            <ThreadDrawer
                threadId={activeThreadId}
                onClose={() => setActiveThreadId(null)}
            />
        </div>
    )
}
