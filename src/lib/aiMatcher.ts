// src/lib/aiMatcher.ts
import { supabase } from './supabaseClient'

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

export async function findEchoMatches(confessionId: string, content: string, vaultId: string) {
  const { data: recent } = await supabase
    .from('confessions')
    .select('id, content, anon_hash')
    .eq('vault_id', vaultId)
    .neq('id', confessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!recent || recent.length < 2) return null

  let matches: string[] = []

  if (OPENAI_KEY) {
    try {
      const prompt = `
You are VibeVault AI. Match this new confession to the MOST emotionally similar ones from this list.
Return ONLY a JSON array of the top 3 confession IDs that feel like soulmates to this one.

New confession: "${content}"

Candidates:
${recent.map(c => `${c.id}: "${c.content}"`).join('\n')}

Return format: ["uuid1", "uuid2", "uuid3"]`

      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      })

      const json = await res.json()
      const contentStr = json.choices?.[0]?.message?.content
      if (contentStr) {
        const match = contentStr.match(/\[[\s\S]*\]/);
        if (match) {
          matches = JSON.parse(match[0])
        }
      }
    } catch (e) {
      console.error("AI Match failed, falling back to random", e)
      // Fallback
      matches = recent.slice(0, 3).map(c => c.id)
    }
  } else {
    // Mock behavior if no key
    console.warn("No OPENAI_API_KEY found. Using random mock matches.")
    matches = recent.slice(0, 3).map(c => c.id)
  }

  // Create echo thread with the new confession + matches
  if (matches.length > 0) {
    const { data: thread } = await supabase
      .from('echo_threads')
      .insert({ vault_id: vaultId })
      .select()
      .single()

    // Add all confessions to thread_messages
    const messages = [
      { thread_id: thread.id, confession_id: confessionId, content, anon_hash: "you" },
      ...matches.map((id: string) => {
        const conf = recent.find(c => c.id === id)
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
    return thread.id
  }
}