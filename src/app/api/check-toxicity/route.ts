import { NextResponse } from 'next/server'
import { analyzeContent } from '@/lib/ai'

export async function POST(req: Request) {
    try {
        const { content } = await req.json()
        const result = await analyzeContent(content)
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: 'Check failed' }, { status: 500 })
    }
}
