'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { getAvatar } from '@/lib/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, X, MoreVertical, Smile, Mic, CheckCheck, ArrowLeft } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'

type Message = {
    id: string
    content: string
    anon_hash: string
    created_at: string
    reactions?: { count: number, hasReacted: boolean }
}

type Poll = {
    id: string
    question: string
    options: string[]
    votes: Record<number, number>
    myVote?: number
}

interface ThreadDrawerProps {
    threadId: string | null
    onClose: () => void
}

export function ThreadDrawer({ threadId, onClose }: ThreadDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [title, setTitle] = useState('Echo Thread')
    const [polls, setPolls] = useState<Poll[]>([])
    const [inputText, setInputText] = useState('')
    const [myHash, setMyHash] = useState('')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isPublic, setIsPublic] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
        checkDesktop()
        window.addEventListener('resize', checkDesktop)
        return () => window.removeEventListener('resize', checkDesktop)
    }, [])


    const fetchReactions = async (msgIds: string[], userHash: string) => {
        if (msgIds.length === 0) return {}
        const { data } = await supabase.from('message_reactions').select('message_id, anon_hash').in('message_id', msgIds)
        const reactionMap: Record<string, { count: number, hasReacted: boolean }> = {}
        data?.forEach(r => {
            if (!reactionMap[r.message_id]) reactionMap[r.message_id] = { count: 0, hasReacted: false }
            reactionMap[r.message_id].count++
            if (r.anon_hash === userHash) reactionMap[r.message_id].hasReacted = true
        })
        return reactionMap
    }

    const fetchPolls = async (tId: string, userHash: string) => {
        const { data: pollsData } = await supabase.from('polls').select('*').eq('thread_id', tId)
        if (!pollsData) return []
        const pollsWithVotes = await Promise.all(pollsData.map(async (p: any) => {
            const { data: votes } = await supabase.from('poll_votes').select('option_index, anon_hash').eq('poll_id', p.id)
            const voteCounts: Record<number, number> = {}
            p.options.forEach((_: any, i: number) => voteCounts[i] = 0)
            let myVote = undefined
            votes?.forEach(v => {
                voteCounts[v.option_index] = (voteCounts[v.option_index] || 0) + 1
                if (v.anon_hash === userHash) myVote = v.option_index
            })
            return { ...p, votes: voteCounts, myVote }
        }))
        return pollsWithVotes
    }

    useEffect(() => {
        if (!threadId) return

        let storedHash = localStorage.getItem('vibe_anon_hash')
        if (!storedHash) {
            storedHash = Math.random().toString(36).substring(2)
            localStorage.setItem('vibe_anon_hash', storedHash)
        }
        setMyHash(storedHash)

        const fetchThread = async () => {
            const { data: thread } = await supabase.from('echo_threads').select('is_public, title').eq('id', threadId).single()
            if (thread) {
                setIsPublic(thread.is_public)
                if (thread.title) setTitle(thread.title)
            }
            const { data: msgs } = await supabase.from('thread_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true })
            if (msgs) {
                const reactionMap = await fetchReactions(msgs.map(m => m.id), storedHash!)
                setMessages(msgs.map(m => ({ ...m, reactions: reactionMap[m.id] || { count: 0, hasReacted: false } })))
            }
            const loadedPolls = await fetchPolls(threadId, storedHash!)
            setPolls(loadedPolls)
        }
        fetchThread()

        const channel = supabase.channel(`thread:${threadId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_messages', filter: `thread_id=eq.${threadId}` },
                (payload) => { if (payload.eventType === 'INSERT') setMessages(prev => [...prev, payload.new as Message]) })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => fetchThread())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `thread_id=eq.${threadId}` }, () => fetchThread())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchThread())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [threadId])

    useEffect(() => {
        if (threadId) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
        }
    }, [messages, threadId])

    const sendMessage = async () => {
        if (!inputText.trim() || !threadId) return
        await supabase.from('thread_messages').insert({ thread_id: threadId, content: inputText.trim(), anon_hash: myHash })
        await supabase.from('echo_threads').update({ last_activity_at: new Date().toISOString() }).eq('id', threadId)
        setInputText('')
    }

    const votePoll = async (pollId: string, optionIndex: number) => {
        await supabase.from('poll_votes').delete().match({ poll_id: pollId, anon_hash: myHash })
        await supabase.from('poll_votes').insert({ poll_id: pollId, option_index: optionIndex, anon_hash: myHash })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <AnimatePresence>
            {threadId && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={isDesktop ? { x: "100%", opacity: 0.5 } : { y: "100%" }}
                        animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0 }}
                        exit={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={cn(
                            "fixed z-50 bg-[#0a0a0a] border-white/10 shadow-2xl flex flex-col overflow-hidden",
                            // Mobile Styles (Bottom Sheet)
                            "inset-x-0 bottom-0 h-[85vh] rounded-t-[2rem] border-t",
                            // Desktop Styles (Right Sidebar)
                            "md:inset-y-0 md:right-0 md:left-auto md:w-[450px] md:h-full md:rounded-l-3xl md:rounded-tr-none md:border-l md:border-t-0"
                        )}
                    >
                        {/* Drag Handle (Mobile Only) */}
                        <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing md:hidden" onClick={onClose}>
                            <div className="w-12 h-1.5 rounded-full bg-white/20" />
                        </div>

                        {/* Header */}
                        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md shrink-0">
                            <div className="flex items-center gap-3">
                                <motion.div layoutId={`title-${threadId}`} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <h1 className="font-bold text-lg text-gray-100 tracking-tight">{title}</h1>
                                </motion.div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </header>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-black/20 to-transparent">
                            <ScrollArea className="h-full px-4 md:px-6">
                                <div className="flex flex-col justify-end min-h-full pb-6 pt-6 space-y-6">

                                    {/* Polls Section */}
                                    {polls.length > 0 && (
                                        <div className="space-y-4 mb-8">
                                            {polls.map(poll => (
                                                <GlassCard key={poll.id} className="w-full bg-gradient-to-br from-gray-900/90 to-black/90 border border-white/10 rounded-2xl overflow-hidden p-5 shadow-xl" hoverEffect={false}>
                                                    <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                                        <span className="w-1 h-4 bg-purple-500 rounded-full" />
                                                        {poll.question}
                                                    </h3>
                                                    <div className="space-y-2">
                                                        {poll.options.map((opt, i) => {
                                                            const count = poll.votes[i] || 0
                                                            const total = Object.values(poll.votes).reduce((a, b) => a + b, 0) || 1
                                                            const pct = Math.round((count / total) * 100)

                                                            return (
                                                                <motion.button
                                                                    key={i}
                                                                    onClick={() => votePoll(poll.id, i)}
                                                                    className="w-full relative h-11 rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all text-left group border border-white/5"
                                                                    whileTap={{ scale: 0.98 }}
                                                                >
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${pct}%` }}
                                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 group-hover:from-purple-600/30 group-hover:to-indigo-600/30 transition-colors"
                                                                    />
                                                                    <div className="relative z-10 flex justify-between items-center px-4 h-full text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                                                                        <span>{opt}</span>
                                                                        <span className="font-mono opacity-60 text-xs">{pct}%</span>
                                                                    </div>
                                                                </motion.button>
                                                            )
                                                        })}
                                                    </div>
                                                </GlassCard>
                                            ))}
                                        </div>
                                    )}

                                    {/* Messages */}
                                    <div className="space-y-4">
                                        {messages.length === 0 && (
                                            <div className="text-center text-gray-600 py-10 flex flex-col items-center">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                    <Smile className="w-8 h-8 opacity-20" />
                                                </div>
                                                <p>No echoes yet. Be the first.</p>
                                            </div>
                                        )}

                                        {messages.map((msg, idx) => {
                                            const isMe = msg.anon_hash === myHash
                                            const isSystem = msg.anon_hash === "SYSTEM"
                                            const showHeader = !messages[idx - 1] || messages[idx - 1].anon_hash !== msg.anon_hash

                                            if (isSystem) return (
                                                <div key={msg.id} className="flex justify-center my-6">
                                                    <span className="text-[10px] uppercase tracking-widest text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-medium">
                                                        {msg.content}
                                                    </span>
                                                </div>
                                            )

                                            return (
                                                <motion.div
                                                    key={msg.id}
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full`}
                                                >
                                                    {!isMe && showHeader && (
                                                        <span className="text-[10px] text-gray-500 ml-3 mb-1.5 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                                            <div className={`w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-[9px] text-white`}>
                                                                {getAvatar(msg.anon_hash).charAt(0)}
                                                            </div>
                                                            {getAvatar(msg.anon_hash)}
                                                        </span>
                                                    )}

                                                    <div
                                                        className={cn(
                                                            "relative max-w-[85%] p-3.5 px-5 text-[15px] shadow-sm backdrop-blur-sm border transition-all hover:shadow-md",
                                                            isMe
                                                                ? 'bg-purple-600 text-white rounded-[24px] rounded-br-[4px] border-purple-500'
                                                                : 'bg-[#1a1a1a] text-gray-200 rounded-[24px] rounded-bl-[4px] border-white/5'
                                                        )}
                                                    >
                                                        <div className="leading-relaxed font-normal tracking-wide break-words">{msg.content}</div>
                                                        <div className={`flex items-center gap-1 justify-end mt-1.5 opacity-50 ${isMe ? 'text-purple-200' : 'text-gray-500'}`}>
                                                            <span className="text-[9px] font-medium tracking-wider">{formatTime(msg.created_at)}</span>
                                                            {isMe && <CheckCheck className="w-3 h-3" />}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                    <div ref={bottomRef} className="h-2" />
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Footer (Input) */}
                        <div className="p-4 bg-[#0a0a0a] border-t border-white/5 shrink-0 pb-8 md:pb-4">
                            <div className="flex items-end gap-2 bg-[#1a1a1a] p-1.5 rounded-[1.8rem] border border-white/5 focus-within:border-purple-500/50 transition-colors">
                                <div className="flex items-center pl-2 pb-1.5">
                                    <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                                        <Smile className="w-5 h-5" />
                                    </button>
                                </div>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            sendMessage()
                                        }
                                    }}
                                    placeholder="Add a comment..."
                                    className="bg-transparent border-none outline-none text-white w-full text-[15px] placeholder:text-gray-500 font-light resize-none py-3 px-2 max-h-24 min-h-[44px]"
                                    rows={1}
                                />
                                <div className="pr-1 pb-1">
                                    <AnimatePresence mode="popLayout">
                                        {inputText.trim() ? (
                                            <motion.button
                                                key="send"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                onClick={sendMessage}
                                                className="w-10 h-10 bg-purple-600 hover:bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20 transition-colors"
                                            >
                                                <Send className="w-4 h-4 ml-0.5" />
                                            </motion.button>
                                        ) : (
                                            <motion.button
                                                key="mic"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                className="w-10 h-10 rounded-full hover:bg-white/10 text-gray-400 flex items-center justify-center transition-colors"
                                            >
                                                <Mic className="w-5 h-5" />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
