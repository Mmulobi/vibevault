'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function VaultList({ vaults: initialVaults = [] }: { vaults?: any[] }) {
    const [vaults, setVaults] = useState<any[]>(initialVaults)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (initialVaults.length > 0) {
            setVaults(initialVaults)
        } else {
            supabase.from('vaults').select('*').then(({ data }) => {
                if (data) setVaults(data)
            })
        }
    }, [initialVaults])

    useEffect(() => {
        const channel = supabase
            .channel('vaults_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vaults' }, (payload) => {
                setVaults((current) => [...current, payload.new])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (!mounted) return <div className="space-y-3 p-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}</div>
    if (!vaults || vaults.length === 0) return <div className="text-sm text-gray-500 p-2">No vaults found.</div>

    return (
        <div className="flex flex-col gap-2 w-full">
            {vaults.map((vault, i) => (
                <VaultItem key={vault.id} vault={vault} index={i} />
            ))}
        </div>
    )
}

function VaultItem({ vault, index }: { vault: any, index: number }) {
    return (
        <Link href={`/vault/${vault.id}`} className="w-full">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.02, x: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                className="group flex items-center gap-3 p-2 pr-3 rounded-xl cursor-pointer transition-colors bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5"
            >
                {/* Icon Container */}
                <div className="relative w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-[#1a1a1b] to-black border border-white/10 flex items-center justify-center shadow-lg group-hover:border-purple-500/50 group-hover:shadow-purple-500/20 transition-all">
                    <span className="text-lg group-hover:scale-110 transition-transform">
                        {vault.icon !== 'default' ? '🔒' : vault.name.charAt(0)}
                    </span>
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors truncate">
                        {vault.name}
                    </span>
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-wider truncate">
                        {vault.description ? "Active" : "Vault"}
                    </span>
                </div>

                {/* Hover Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
            </motion.div>
        </Link>
    )
}
