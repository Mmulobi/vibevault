'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { getAvatar } from '@/lib/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, ArrowLeft, MoreVertical, Phone, Video, Mic, CheckCheck, Smile } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'

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

export default function ThreadPage() {
    const { id } = useParams()
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([])
    const [title, setTitle] = useState('Echo Thread')
    const [polls, setPolls] = useState<Poll[]>([])
    const [inputText, setInputText] = useState('')
    const [myHash, setMyHash] = useState('')
    const [isPublic, setIsPublic] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

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

    const fetchPolls = async (threadId: string, userHash: string) => {
        const { data: pollsData } = await supabase.from('polls').select('*').eq('thread_id', threadId)
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
        let storedHash = localStorage.getItem('vibe_anon_hash')
        if (!storedHash) {
            storedHash = Math.random().toString(36).substring(2)
            localStorage.setItem('vibe_anon_hash', storedHash)
        }
        setMyHash(storedHash)

        const fetchThread = async () => {
            const { data: thread } = await supabase.from('echo_threads').select('is_public, title').eq('id', id).single()
            if (thread) {
                setIsPublic(thread.is_public)
                if (thread.title) setTitle(thread.title)
            }
            const { data: msgs } = await supabase.from('thread_messages').select('*').eq('thread_id', id).order('created_at', { ascending: true })
            if (msgs) {
                const reactionMap = await fetchReactions(msgs.map(m => m.id), storedHash!)
                setMessages(msgs.map(m => ({ ...m, reactions: reactionMap[m.id] || { count: 0, hasReacted: false } })))
            }
            const loadedPolls = await fetchPolls(id as string, storedHash!)
            setPolls(loadedPolls)
        }
        fetchThread()
        const channel = supabase.channel(`thread:${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_messages', filter: `thread_id=eq.${id}` },
                (payload) => { if (payload.eventType === 'INSERT') setMessages(prev => [...prev, payload.new as Message]) })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => fetchThread())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `thread_id=eq.${id}` }, () => fetchThread())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchThread())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    const sendMessage = async () => {
        if (!inputText.trim()) return
        await supabase.from('thread_messages').insert({ thread_id: id, content: inputText.trim(), anon_hash: myHash })
        await supabase.from('echo_threads').update({ last_activity_at: new Date().toISOString() }).eq('id', id)
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
        <div className="flex items-center justify-center h-screen w-full bg-[#000] relative overflow-hidden font-sans selection:bg-purple-500/30">

            {/* Premium Ambient Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-50%] w-[100%] h-[100%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] left-[-50%] w-[100%] h-[100%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
            </div>

            {/* Tablet/Phone Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.8, bounce: 0.2 }}
                className="w-full md:w-[440px] h-full md:h-[85vh] md:max-h-[900px] bg-black/60 backdrop-blur-3xl relative z-10 shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col md:rounded-[2.5rem] md:border border-white/10 overflow-hidden ring-1 ring-white/5"
            >
                {/* Modern Header */}
                <header className="flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm shrink-0 z-20 absolute top-0 left-0 right-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/')}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 transition-all backdrop-blur-md group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </Button>

                    <div className="flex flex-col items-center cursor-pointer group">
                        <motion.div layoutId={`title-${id}`} className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-white/5 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            <h1 className="font-bold text-sm text-gray-100 tracking-wide">{title}</h1>
                        </motion.div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 transition-all backdrop-blur-md"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </Button>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-hidden relative pt-20"> {/* pt-20 for header space */}
                    <ScrollArea className="h-full px-4">
                        <div className="flex flex-col justify-end min-h-full pb-4 space-y-4">

                            {/* Polls Section */}
                            {polls.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    {polls.map(poll => (
                                        <GlassCard key={poll.id} className="w-full bg-gradient-to-br from-gray-900/90 to-black/90 border border-white/10 rounded-2xl overflow-hidden p-4 shadow-xl" hoverEffect={false}>
                                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                                <span className="w-1 h-4 bg-purple-500 rounded-full" />
                                                {poll.question}
                                            </h3>
                                            <div className="space-y-2">
                                                {poll.options.map((opt, i) => {
                                                    const count = poll.votes[i] || 0
                                                    const total = Object.values(poll.votes).reduce((a, b) => a + b, 0) || 1
                                                    const pct = Math.round((count / total) * 100)
                                                    const layoutId = `poll-${poll.id}-opt-${i}`

                                                    return (
                                                        <motion.button
                                                            key={i}
                                                            onClick={() => votePoll(poll.id, i)}
                                                            className="w-full relative h-10 rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all text-left group border border-white/5"
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${pct}%` }}
                                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 group-hover:from-purple-600/30 group-hover:to-indigo-600/30 transition-colors"
                                                            />
                                                            <div className="relative z-10 flex justify-between items-center px-4 h-full text-xs text-gray-300 font-medium group-hover:text-white transition-colors">
                                                                <span>{opt}</span>
                                                                <span className="font-mono opacity-60">{pct}%</span>
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
                            <AnimatePresence initial={false} mode="popLayout">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.anon_hash === myHash
                                    const isSystem = msg.anon_hash === "SYSTEM"
                                    const showHeader = !messages[idx - 1] || messages[idx - 1].anon_hash !== msg.anon_hash

                                    if (isSystem) return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className="flex justify-center my-4"
                                        >
                                            <span className="text-[10px] uppercase tracking-widest text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-medium">
                                                {msg.content}
                                            </span>
                                        </motion.div>
                                    )

                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 20, x: isMe ? 20 : -20, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full`}
                                        >
                                            {/* Avatar/Name Header for others */}
                                            {!isMe && showHeader && (
                                                <span className="text-[10px] text-gray-500 ml-3 mb-1 font-medium flex items-center gap-1">
                                                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[8px] text-white font-bold">
                                                        {getAvatar(msg.anon_hash).charAt(0)}
                                                    </span>
                                                    {getAvatar(msg.anon_hash)}
                                                </span>
                                            )}

                                            <div
                                                className={`
                                                    relative max-w-[85%] p-3 px-4 text-[14px] shadow-lg backdrop-blur-sm border
                                                    ${isMe
                                                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-[20px] rounded-br-[4px] border-indigo-500/30'
                                                        : 'bg-white/10 text-gray-100 rounded-[20px] rounded-bl-[4px] border-white/5'
                                                    }
                                                `}
                                            >
                                                <div className="leading-relaxed font-light tracking-wide break-words">{msg.content}</div>
                                                <div className={`flex items-center gap-1 justify-end mt-1 opacity-60 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                    <span className="text-[9px] font-medium" suppressHydrationWarning>{formatTime(msg.created_at)}</span>
                                                    {isMe && <CheckCheck className="w-3 h-3" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                            <div ref={bottomRef} className="h-2" />
                        </div>
                    </ScrollArea>
                </div>

                {/* Modern Footer */}
                <div className="p-4 bg-gradient-to-t from-black/80 to-transparent shrink-0 z-20">
                    <GlassCard
                        className="flex items-center gap-2 p-1.5 pl-4 rounded-[1.5rem] bg-white/5 border-white/10 focus-within:bg-white/10 focus-within:border-white/20 transition-all duration-300"
                        hoverEffect={false}
                    >
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Share your thoughts..."
                            className="bg-transparent border-none outline-none text-white w-full text-[15px] placeholder:text-white/30 font-light"
                        />

                        <div className="flex items-center gap-1">
                            <AnimatePresence mode="popLayout">
                                {inputText.trim() ? (
                                    <motion.button
                                        key="send"
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 45 }}
                                        onClick={sendMessage}
                                        className="w-10 h-10 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-colors"
                                    >
                                        <Send className="w-5 h-5 ml-0.5" />
                                    </motion.button>
                                ) : (
                                    <motion.div key="actions" className="flex items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                                            <Smile className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                                            <Mic className="w-5 h-5" />
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </GlassCard>
                </div>

            </motion.div>
        </div>
    )
}
