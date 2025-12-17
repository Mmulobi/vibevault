'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { ThreadCard } from '@/components/ThreadCard'
import { AgeGateModal } from '@/components/AgeGateModal'
import { ThreadDrawer } from '@/components/ThreadDrawer'
import { Button } from '@/components/ui/button'
import VaultList from '@/app/components/VaultList'
import ConfessButton from '@/app/components/ConfessButton'
import { Flame, Star, AlertCircle, Menu, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Home() {
    const [threads, setThreads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'nsfw'>('hot')
    const [isAgeVerified, setIsAgeVerified] = useState(false)
    const [showAgeGate, setShowAgeGate] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

    const fetchThreads = async (tab: 'hot' | 'new' | 'nsfw') => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        let query = supabase
            .from('echo_threads')
            .select(`
                *,
                vault:vault_id(name, icon),
                messages:thread_messages(id, content, anon_hash)
            `)
            .limit(30)

        // If not logged in, only show public. If logged in, show all (or filter by user ownership? 
        // Requirement said: "private content to be visible they must sign up or sign in".
        // This implies if signed in, you see EVERYTHING? Or just your own private stuff? 
        // "if they choose private then they will have to sign or signup and this will apply to every user such that for private content to be visible they must sign up or sign in on the platform"
        // This sounds like "Private" = "Registered Users Only". 
        // So if Guest -> is_public=true. If User -> No filter (sees private too).

        if (!user) {
            query = query.eq('is_public', true)
        }

        if (tab === 'nsfw') {
            query = query.eq('is_explicit', true).order('created_at', { ascending: false })
        } else {
            query = query.eq('is_explicit', false)
            if (tab === 'new') {
                query = query.order('created_at', { ascending: false })
            } else {
                query = query.order('last_activity_at', { ascending: false })
            }
        }
        const { data } = await query
        if (data) setThreads(data)
        setLoading(false)
    }

    useEffect(() => {
        // Listen for auth changes to re-fetch
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchThreads(activeTab)
        })

        if (activeTab === 'nsfw' && !isAgeVerified) {
            setShowAgeGate(true)
        } else {
            fetchThreads(activeTab)
        }
        return () => subscription.unsubscribe()
    }, [activeTab, isAgeVerified])

    const handleTabChange = (tab: 'hot' | 'new' | 'nsfw') => {
        if (tab === 'nsfw' && !isAgeVerified) {
            setShowAgeGate(true)
            return
        }
        setActiveTab(tab)
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-purple-500/30 overflow-x-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            </div>

            <AgeGateModal
                isOpen={showAgeGate}
                onVerify={() => { setIsAgeVerified(true); setShowAgeGate(false); setActiveTab('nsfw') }}
                onCancel={() => setShowAgeGate(false)}
            />

            <div className="relative z-10 max-w-[1400px] mx-auto flex min-h-screen">

                {/* 1. Navigation Rail (Floating) */}
                <div className="hidden lg:flex flex-col w-[280px] shrink-0 p-6 h-screen sticky top-0 justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-10 pl-2">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/20">
                                <span className="text-black font-black text-2xl">V</span>
                            </div>
                            <span className="font-bold text-2xl text-white tracking-tighter">VibeVault</span>
                        </div>

                        <div className="space-y-2 mb-10">
                            {[
                                { id: 'hot', icon: Flame, label: 'Trending' },
                                { id: 'new', icon: Star, label: 'Fresh' },
                                { id: 'nsfw', icon: AlertCircle, label: 'NSFW' }
                            ].map((tab: any) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                                        activeTab === tab.id
                                            ? "bg-white/10 text-white shadow-lg backdrop-blur-sm"
                                            : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                    )}
                                >
                                    <tab.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === tab.id && "text-purple-400 fill-purple-400/20")} />
                                    <span className="font-medium text-lg">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="pl-4 pr-2">
                            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">Vaults</h3>
                            <VaultList />
                        </div>
                    </div>

                    <div className="pb-4">
                        <ConfessButton className="shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow" />
                    </div>
                </div>

                {/* 2. Main Stream */}
                <div className="flex-1 w-full max-w-2xl border-x border-white/5 bg-black/20 backdrop-blur-sm min-h-screen">
                    {/* Header */}
                    <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                        <h1 className="text-xl font-bold text-white tracking-tight">Home</h1>
                        <div className="flex gap-4 lg:hidden">
                            <Button variant="ghost" size="icon"><Search className="w-5 h-5" /></Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 md:p-6">
                        <AnimatePresence mode='wait'>
                            {loading ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex gap-4 animate-pulse">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl" />
                                            <div className="flex-1 space-y-3">
                                                <div className="h-4 bg-white/5 rounded w-1/4" />
                                                <div className="h-24 bg-white/5 rounded-2xl w-full" />
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="space-y-2 pb-32">
                                    {threads.map((thread, i) => (
                                        <ThreadCard
                                            key={thread.id}
                                            thread={thread}
                                            isBlurred={activeTab === 'nsfw'}
                                            onClick={() => setActiveThreadId(thread.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <ThreadDrawer
                    threadId={activeThreadId}
                    onClose={() => setActiveThreadId(null)}
                />

                {/* 3. Right Context (Search & Info) */}
                <div className="hidden xl:block w-[350px] shrink-0 p-6 sticky top-0 h-screen">
                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                        <input
                            placeholder="Find a vibe..."
                            className="w-full bg-[#111] border border-white/5 rounded-full pl-10 pr-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 focus:bg-black transition-all"
                        />
                    </div>

                    <div className="bg-[#111]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                        <h2 className="font-bold text-lg text-white mb-4">Daily Mix</h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-black flex items-center justify-center font-bold text-gray-500 group-hover:text-white group-hover:from-purple-900 group-hover:to-blue-900 transition-all">#</div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-300 group-hover:text-white">LateNightThoughts</div>
                                        <div className="text-xs text-gray-600">2.4k echoes</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 p-6 bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/10 rounded-3xl">
                        <h3 className="text-purple-300 font-bold mb-2">VibeVault Premium</h3>
                        <p className="text-xs text-gray-500 mb-4">Support the void. Get exclusive badges and ad-free silence.</p>
                        <Button className="w-full bg-white text-black hover:bg-gray-200 rounded-full font-bold text-xs h-8">Coming Soon</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
