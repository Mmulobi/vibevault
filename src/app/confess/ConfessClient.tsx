'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, Lock, Loader2, Sparkles, Globe, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { AuthModal } from '@/components/AuthModal'

export default function ConfessClient({ vaults }: { vaults: any[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [content, setContent] = useState('')
    const [title, setTitle] = useState('')
    const [vaultId, setVaultId] = useState(searchParams.get('vault_id') || '')
    const [mood, setMood] = useState('😐')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    // Privacy & Auth
    const [isPublic, setIsPublic] = useState(true)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null)
        })
        return () => { authListener.subscription.unsubscribe() }
    }, [])

    const moods = ['💀', '🤡', '😭', '🔥', '👀', '🤬', '💅', '🥺', '🤫', '👽']

    const submitConfession = async () => {
        if (!content.trim() || !vaultId) return
        setLoading(true)

        // Check Toxicity
        try {
            const toxicRes = await fetch('/api/check-toxicity', {
                method: 'POST',
                body: JSON.stringify({ text: content })
            })
            const toxicJson = await toxicRes.json()
            if (toxicJson.isToxic) {
                alert("Too toxic! Tone it down.")
                setLoading(false)
                return
            }
        } catch { }

        const anonHash = Math.random().toString(36).substring(2) + Date.now()

        // 1. Insert Confession
        const { data, error } = await supabase.from('confessions').insert({
            title: title.trim() || null,
            content: content.trim(),
            mood,
            vault_id: vaultId,
            anon_hash: anonHash,
            is_public: isPublic,
            user_id: user?.id || null
        }).select().single()

        if (error) {
            console.error('Submission Error:', error)
            alert(`Error: ${JSON.stringify(error, null, 2)}`)
            setLoading(false)
            return
        }

        // 2. Trigger AI
        if (data) {
            await fetch('/api/match-echo', {
                method: 'POST',
                body: JSON.stringify({
                    confessionId: data.id,
                    content: data.content,
                    vaultId,
                    title: title.trim(),
                    isPublic,
                    userId: user?.id || null
                })
            })
            setSent(true)
            setTimeout(() => {
                router.push('/')
            }, 2000)
        } else {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow" />
                </div>
                <div className="flex flex-col items-center z-10 text-center">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center mb-6 shadow-2xl shadow-green-500/30"
                    >
                        <MockCheckmark />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">Secret Locked</h1>
                    <p className="text-gray-400">Your confession has been cast into the void.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-purple-500/30">
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setIsPublic(false)} />
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl relative z-10"
            >
                <div className="mb-8 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Vault</span>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-900/20 px-3 py-1 rounded-full border border-purple-500/20">
                        <Lock className="w-3 h-3" />
                        <span>End-to-End Anonymous</span>
                    </div>
                </div>

                <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

                    <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
                        Speak into the Void
                    </h1>
                    <p className="text-gray-500 mb-8">What burden do you wish to release today?</p>

                    <div className="space-y-6">
                        {/* Vault Selection */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {vaults.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setVaultId(v.id)}
                                    className={`relative p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2
                                        ${vaultId === v.id
                                            ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-2xl">{v.icon !== 'default' ? '🔒' : (v.name === 'Love' ? '❤️' : v.name === 'Stress' ? '🤯' : v.name === 'Dreams' ? '🌙' : '✨')}</span>
                                    <span className={`text-xs font-medium ${vaultId === v.id ? 'text-white' : 'text-gray-400'}`}>{v.name}</span>
                                    {vaultId === v.id && (
                                        <motion.div layoutId="active-vault" className="absolute inset-0 rounded-xl border-2 border-purple-500 pointer-events-none" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Privacy Toggle */}
                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                            <button
                                onClick={() => setIsPublic(true)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${isPublic ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Globe className="w-4 h-4" />
                                <span>Public</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!user) {
                                        setShowAuthModal(true)
                                    } else {
                                        setIsPublic(false)
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${!isPublic ? 'bg-purple-600 text-white font-bold' : 'text-gray-500 hover:text-white'}`}
                            >
                                {user ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                <span>Private {user ? '' : '(Login Required)'}</span>
                            </button>
                        </div>

                        {/* Title Input */}
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give it a title..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all mb-3"
                        />

                        {/* Text Area */}
                        <div className="relative group">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="I confess..."
                                className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 md:p-6 text-lg md:text-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none min-h-[200px]"
                            />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                {/* Moods could go here or separate */}
                            </div>
                        </div>

                        {/* Moods */}
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">What's the vibe?</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                {moods.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMood(m)}
                                        className={`p-2.5 rounded-xl border transition-all ${mood === m
                                            ? 'bg-white/10 border-white text-2xl scale-110'
                                            : 'bg-transparent border-transparent hover:bg-white/5 text-xl opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-4 flex justify-end">
                            <Button
                                onClick={submitConfession}
                                disabled={!content.trim() || !vaultId || loading}
                                size="lg"
                                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-8 h-14 rounded-xl shadow-xl shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Encrypting...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        <span>Cast Spell (Confess)</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function MockCheckmark() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    )
}
