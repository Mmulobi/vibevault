'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function ConfessButton({ className }: { className?: string }) {
    return (
        <Link href="/confess" className={cn("block", className)}>
            <button className="w-full bg-white text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-lg shadow-white/10">
                <Plus className="w-5 h-5" />
                <span>Create Confession</span>
            </button>
        </Link>
    )
}
