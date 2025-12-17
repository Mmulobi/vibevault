'use client'

import { supabase } from '@/lib/supabaseClient'

export default function VaultSuggestions() {
    return (
        <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
            <h3 className="text-sm font-bold text-gray-400 mb-2">Missing a vibe?</h3>
            <button
                onClick={async () => {
                    const name = prompt("What's the vault name?")
                    if (name) {
                        const reasoning = prompt("Why do we need this?")
                        await supabase.from('vault_suggestions').insert({ name, reasoning })
                        alert("Suggestion noted. The council will decide.")
                    }
                }}
                className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
                Suggest a new vault
            </button>
        </div>
    )
}
