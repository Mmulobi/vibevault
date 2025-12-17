'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface AgeGateModalProps {
    isOpen: boolean
    onVerify: () => void
    onCancel: () => void
}

export function AgeGateModal({ isOpen, onVerify, onCancel }: AgeGateModalProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#1a1a1b] border border-gray-700/50 p-6 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">NSFW Content</h2>
                        <p className="text-gray-400 mb-6">
                            This section contains explicit content (18+). <br />
                            You must be 18 years or older to proceed.
                        </p>

                        <div className="flex flex-col w-full gap-3">
                            <Button
                                onClick={onVerify}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-full transition-all"
                            >
                                I am 18 or older
                            </Button>
                            <Button
                                onClick={onCancel}
                                variant="ghost"
                                className="w-full text-gray-400 hover:text-white hover:bg-white/5 py-3 rounded-full"
                            >
                                Go Back
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
