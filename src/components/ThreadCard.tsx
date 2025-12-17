'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Heart, Share2, MoreHorizontal, AlertTriangle, User, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { getAvatar } from '@/lib/avatar'
import { cn, getRelativeTime } from '@/lib/utils'
import { useState } from 'react'

interface ThreadCardProps {
    thread: any
    isBlurred?: boolean
    onReveal?: () => void
    onClick?: () => void
}

const EMOJI_OPTIONS = ['🔥', '😂', '❤️', '🤔', '😭', '🤯']

export function ThreadCard({ thread, isBlurred = false, onReveal, onClick }: ThreadCardProps) {
    const lastMsg = thread.messages?.[thread.messages.length - 1]
    const firstMsg = thread.messages?.[0]
    const content = firstMsg?.content || lastMsg?.content || "..."
    const avatar = getAvatar(firstMsg?.anon_hash || "User")
    const authorName = `Anon-${firstMsg?.anon_hash?.substring(0, 4) || '????'}`
    const timeAgo = getRelativeTime(thread.last_activity_at)

    const [voteStatus, setVoteStatus] = useState<'like' | 'dislike' | null>(null)
    const [score, setScore] = useState(Math.floor(Math.random() * 50) + 1)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)

    const handleVote = (type: 'like' | 'dislike') => {
        if (voteStatus === type) {
            setVoteStatus(null)
            if (type === 'like') setScore(s => s - 1)
        } else {
            if (voteStatus === 'like') setScore(s => s - 1)
            setVoteStatus(type)
            if (type === 'like') setScore(s => s + 1)
        }
        setShowEmojiPicker(false)
    }

    const handleEmoji = (emoji: string) => {
        if (selectedEmoji === emoji) {
            setSelectedEmoji(null)
        } else {
            setSelectedEmoji(emoji)
        }
        setShowEmojiPicker(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative mb-8 pl-4 transition-all duration-500"
        >
            {/* Thread Line Connector (The 'Timeline' Vibe) */}
            <div className="absolute left-0 top-6 bottom-[-32px] w-[2px] bg-gradient-to-b from-gray-800 to-transparent group-last:hidden group-hover:from-purple-500/50 transition-colors duration-500" />

            {/* HoverGlow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-xl" />

            <div className="relative">
                {/* Header Meta */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-2xl group-hover:border-purple-500/50 group-hover:scale-105 transition-all duration-300">
                        <span className="text-lg">{avatar.split(' ')[1]?.[0]}</span>
                    </div>
                    <div className="flex flex-col leading-tight">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-200 group-hover:text-purple-300 transition-colors">{thread.vault?.name || 'Vault'}</span>
                            <span className="text-[10px] text-gray-500">@{authorName}</span>
                        </div>
                        <span className="text-xs text-gray-600">{timeAgo}</span>
                    </div>
                    <button className="ml-auto text-gray-600 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <Link
                    href={`/thread/${thread.id}`}
                    onClick={(e) => {
                        if (onClick) {
                            e.preventDefault()
                            onClick()
                        }
                    }}
                    className="block pl-[3.75rem]"
                >
                    <h3 className="text-xl font-bold text-gray-100 mb-2 leading-tight tracking-tight hover:underline decoration-purple-500/30 underline-offset-4 transition-all">
                        {thread.title}
                    </h3>

                    <div className="relative">
                        {isBlurred && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-10 flex items-center justify-center rounded-xl border border-white/5">
                                <button
                                    onClick={(e) => { e.preventDefault(); onReveal?.() }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Review Sensitive Content
                                </button>
                            </div>
                        )}
                        <p className={cn("text-base text-gray-400 font-light leading-relaxed", isBlurred && "blur-sm opacity-20")}>
                            {content}
                        </p>
                    </div>

                    {/* Interaction Bar */}
                    <div className="flex items-center gap-6 mt-4 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                        {/* Reply */}
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-xs font-bold">{thread.messages?.length || 0}</span>
                        </div>

                        {/* Like / Emoji */}
                        <div
                            className="flex items-center gap-2 relative"
                            onMouseLeave={() => setShowEmojiPicker(false)}
                        >
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                        className="absolute bottom-full left-0 mb-2 bg-black border border-white/20 p-2 rounded-2xl flex gap-1 shadow-2xl z-20"
                                    >
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button key={emoji} onClick={(e) => { e.preventDefault(); handleEmoji(emoji) }} className="hover:scale-125 transition-transform text-xl p-1">{emoji}</button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onMouseEnter={() => setShowEmojiPicker(true)}
                                onClick={(e) => { e.preventDefault(); handleVote('like') }}
                                className={cn("hover:text-pink-500 transition-colors", (voteStatus === 'like' || selectedEmoji) && "text-pink-500")}
                            >
                                <Heart className={cn("w-5 h-5", voteStatus === 'like' && "fill-current")} />
                            </motion.button>
                            {(selectedEmoji || score > 0) && (
                                <span className={cn("text-xs font-bold", (voteStatus === 'like' || selectedEmoji) && "text-pink-500")}>
                                    {selectedEmoji || score}
                                </span>
                            )}
                        </div>

                        {/* Share */}
                        <div className="flex items-center gap-2 cursor-pointer hover:text-green-400 transition-colors">
                            <Share2 className="w-5 h-5" />
                        </div>
                    </div>
                </Link>
            </div>
        </motion.div>
    )
}
