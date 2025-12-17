import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { findSoulmates, generateTitle, analyzeContent } from '@/lib/ai'

export async function POST(req: Request) {
    try {
        const { confessionId, content, vaultId, title: userTitle, isPublic, userId } = await req.json()

        // 1. Get recent candidates (last 50 from same vault)
        const { data: candidates } = await supabase
            .from('confessions')
            .select('id, content, anon_hash')
            .eq('vault_id', vaultId)
            .neq('id', confessionId)
            .order('created_at', { ascending: false })
            .limit(50)

        // Handle case where this is the very first confession
        const candidateList = candidates || []

        // 2. Find matches and Analyze Content
        const matchedIds = await findSoulmates(content, candidateList)

        // Use user title or generate one
        let title = userTitle
        if (!title || !title.trim()) {
            title = await generateTitle(content)
        }

        const analysis = await analyzeContent(content)

        // 3. Create Echo Thread
        const { data: thread, error: threadError } = await supabase
            .from('echo_threads')
            .insert({
                vault_id: vaultId,
                is_public: isPublic ?? true, // Default to true if undefined
                user_id: userId || null,
                is_explicit: analysis.isExplicit,
                title,
                last_activity_at: new Date().toISOString()
            })
            .select()
            .single()

        if (threadError || !thread) throw threadError

        // 4. Add messages (original + matches)
        const messages = [
            { thread_id: thread.id, confession_id: confessionId, content, anon_hash: "you" },
            ...matchedIds.map((id: string) => {
                const conf = candidateList.find(c => c.id === id)
                if (!conf) return null
                return {
                    thread_id: thread.id,
                    confession_id: id,
                    content: conf.content,
                    anon_hash: conf.anon_hash
                }
            }).filter((item): item is NonNullable<typeof item> => item !== null)
        ]

        await supabase.from('thread_messages').insert(messages)

        return NextResponse.json({ threadId: thread.id })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }
}
