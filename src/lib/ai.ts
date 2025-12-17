// src/lib/ai.ts
import { supabase } from './supabaseClient'

const HF_API_URL = "https://api-inference.huggingface.co/models"
const HF_TOKEN = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HUGGING_FACE_TOKEN
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

// Free toxicity model
const TOXIC_MODEL = "unitary/toxic-bert"

export async function analyzeContent(text: string): Promise<{ isToxic: boolean; isExplicit: boolean; score: number }> {
    if (!HF_TOKEN && !OPENAI_KEY) {
        console.warn("No AI tokens found. Skipping checks.")
        // Keyword fallback if no tokens
        return keywordCheck(text)
    }

    let isExplicit = false
    let isToxic = false
    let score = 0

    // 1. Quick Keyword Check (First layer of defense)
    const keywordResult = keywordCheck(text)
    if (keywordResult.isExplicit) isExplicit = true

    // 2. OpenAI Check (High Accuracy)
    if (OPENAI_KEY) {
        try {
            const prompt = `
            Analyze this text: "${text}"
            Return JSON: {"toxic": boolean, "explicit": boolean, "score": number (0-1)}
            "explicit" means sexual, NSFW, or extreme violence.
            "toxic" means hate speech, bullying, or harassment.
            `
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                    response_format: { type: "json_object" }
                })
            })
            const json = await res.json()
            const result = JSON.parse(json.choices[0].message.content)
            return {
                isToxic: result.toxic,
                isExplicit: result.explicit || isExplicit,
                score: result.score
            }
        } catch (e) {
            console.error("OpenAI analysis failed:", e)
        }
    }

    // 3. Hugging Face Check (Free Tier)
    try {
        if (HF_TOKEN) {
            const response = await fetch(`${HF_API_URL}/${TOXIC_MODEL}`, {
                headers: { Authorization: `Bearer ${HF_TOKEN}` },
                method: "POST",
                body: JSON.stringify({ inputs: text }),
            })

            if (response.ok) {
                const result = await response.json()
                const scores = Array.isArray(result) ? result[0] : result

                const toxicScore = scores.find((s: any) => s.label === 'toxic' || s.label === 'identity_hate')?.score || 0
                const obsceneScore = scores.find((s: any) => s.label === 'obscene')?.score || 0

                if (toxicScore > 0.7) isToxic = true
                if (obsceneScore > 0.8) isExplicit = true // High bar for explicit via this model

                score = Math.max(toxicScore, obsceneScore)
            }
        }
    } catch (e) { console.error("HF check failed", e) }

    return { isToxic, isExplicit, score }
}

function keywordCheck(text: string) {
    const explicitKeywords = [
        'nsfw', 'sex', 'nude', 'naked', 'xxx', 'porn', 'murder', 'kill', 'suicide', 'cock', 'dick', 'pussy',
        'vagina', 'boobs', 'tits', 'anal', 'bdsm', 'fetish', 'cum', 'orgasm', 'penetration', 'fuck', 'shit', 'bitch'
    ]
    const isExplicit = explicitKeywords.some(k => text.toLowerCase().includes(k))
    return { isToxic: false, isExplicit, score: isExplicit ? 0.9 : 0 }
}

// Legacy support if needed, redirects to analyzeContent
export async function checkToxicity(text: string): Promise<{ isToxic: boolean; score: number }> {
    const result = await analyzeContent(text)
    return { isToxic: result.isToxic, score: result.score }
}

export async function findSoulmates(
    content: string,
    candidates: { id: string, content: string }[]
): Promise<string[]> {
    if (candidates.length < 3) return candidates.map(c => c.id)

    // Option 1: Use OpenAI if key exists (Smartest)
    if (OPENAI_KEY) {
        try {
            const prompt = `
            Match this confession "${content}" to the 3 most emotionally similar ones from this list.
            Return ONLY a raw JSON array of IDs (e.g. ["id1", "id2"]).
            Candidates:
            ${candidates.map(c => `${c.id}: ${c.content}`).join('\n')}
            `
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1
                })
            })

            const json = await res.json()
            const contentStr = json.choices?.[0]?.message?.content
            if (contentStr) {
                // Try to find the JSON array in the response content, handling potential extra text
                const match = contentStr.match(/\[[\s\S]*\]/);
                if (match) {
                    const matches = JSON.parse(match[0])
                    if (Array.isArray(matches)) return matches.slice(0, 3)
                }
            }
        } catch (e) {
            console.error("OpenAI match failed:", e)
        }
    }

    // Option 2: Fallback to basic word overlap (Client-side, free, reliable)
    // Simple Jaccard similarity on words
    const targetWords = new Set(content.toLowerCase().split(/\s+/))

    const scored = candidates.map(c => {
        const cWords = new Set(c.content.toLowerCase().split(/\s+/))
        const intersection = [...targetWords].filter(x => cWords.has(x)).length
        const union = new Set([...targetWords, ...cWords]).size
        return { id: c.id, score: intersection / union }
    })

    return scored.sort((a, b) => b.score - a.score).slice(0, 3).map(s => s.id)
}

// Generate a short, catchy title for the thread
export async function generateTitle(content: string): Promise<string> {
    if (OPENAI_KEY) {
        try {
            const prompt = `
            Summarize this confession into a funny, catchy 3-5 word title for a chat thread.
            Confession: "${content}"
            Title:`

            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5,
                    max_tokens: 15
                })
            })
            const json = await res.json()
            const title = json.choices?.[0]?.message?.content?.trim()
            if (title) return title.replace(/"/g, '')
        } catch (e) {
            console.error("Title gen failed:", e)
        }
    }

    // Fallback: First 4 words or 30 chars
    const words = content.split(' ')
    if (words.length <= 4) return content
    return words.slice(0, 4).join(' ') + "..."
}
