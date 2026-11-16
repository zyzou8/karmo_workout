import { NextRequest } from 'next/server'
import type { Content } from '@google/genai'
import { getClient, GEMINI_MODEL } from '@/lib/gemini'
import { AI_LANGUAGE_INSTRUCTION, Locale } from '@/lib/i18n/translations'

export const maxDuration = 60

const MAX_TURNS = 20
const MAX_CHARS_PER_TURN = 2000

const COACH_INTRO: Record<string, string> = {
  sage: 'You are Sage, a calm, warm fitness coach.',
  atlas: 'You are Atlas, a no-nonsense strength coach who is direct and holds people to their plan.',
  pip: 'You are Pip, an upbeat coach who answers in as few words as possible.',
}

const clamp = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback
}

function describe(value: number, low: string, high: string) {
  if (value >= 75) return high
  if (value >= 50) return `leaning ${high}`
  if (value > 25) return `leaning ${low}`
  return low
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const coach = (form.get('coach') as string) || 'sage'
  const gentle = clamp(form.get('gentle'), 80)
  const encourage = clamp(form.get('encourage'), 85)
  const brevity = clamp(form.get('brevity'), 40)
  const locale = (form.get('locale') as string) || 'en'

  let messages: { role: 'user' | 'model'; text: string }[]
  try {
    messages = JSON.parse((form.get('messages') as string) || '[]')
  } catch {
    return new Response('Invalid messages', { status: 400 })
  }
  messages = messages
    .filter(m => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, text: m.text.slice(0, MAX_CHARS_PER_TURN) }))
  // Gemini expects the conversation to start with the user.
  while (messages.length && messages[0].role !== 'user') messages.shift()
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return new Response('No question provided', { status: 400 })
  }

  const systemPrompt = `${COACH_INTRO[coach] || COACH_INTRO.sage} You coach users of a fitness app in chat.

Persona settings chosen by the user:
- Tone: ${describe(gentle, 'strict', 'gentle')}
- Feedback style: ${describe(encourage, 'blunt and critical', 'encouraging')}
- Length: ${describe(brevity, 'detailed', 'minimal')}${brevity >= 75 ? ' — keep answers to 1-3 short sentences or a very short list.' : ''}

Rules you always follow, whatever the persona:
- You are an AI coach, not a licensed clinician. Never diagnose, never give medical advice, never prescribe medication or treatment.
- If the user mentions pain, injury, dizziness, chest pain, an eating disorder, pregnancy, or a medical condition, tell them kindly to stop and check with a qualified professional before continuing.
- Even when strict or blunt, never shame or insult the user about their body, weight or food. Default to supportive, especially for fat-loss goals.
- Do not invent statistics, studies or quotes. If you estimate a number (calories, weights), say it is an estimate.
- Keep it practical: sets, reps, rest, form cues, simple meal ideas. Use short Markdown (bold, bullets) when it helps.
- Users may be teenagers or beginners: keep the tone friendly and clear without being childish.${locale !== 'en' ? `\n\n${AI_LANGUAGE_INSTRUCTION[locale as Locale] || ''}` : ''}`

  const contents: Content[] = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))

  let geminiStream
  try {
    geminiStream = await getClient().models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: brevity >= 75 ? 300 : 900,
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Coach is unavailable'
    return new Response(msg, { status: 502 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiStream) {
          const text = chunk.text ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Coach is unavailable'
        controller.enqueue(encoder.encode(`\n\nError: ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
