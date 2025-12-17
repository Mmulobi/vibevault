'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    hoverEffect?: boolean
}

export function GlassCard({ children, className, onClick, hoverEffect = true }: GlassCardProps) {
    return (
        <motion.div
            onClick={onClick}
            className={cn(
                "glass-panel rounded-2xl p-4 transition-all duration-300",
                hoverEffect && "hover:bg-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer",
                className
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={hoverEffect ? { scale: 0.98 } : undefined}
        >
            {children}
        </motion.div>
    )
}
