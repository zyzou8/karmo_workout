import { NextRequest } from 'next/server'
import type { Part } from '@google/genai'
import { getClient, GEMINI_MODEL } from '@/lib/gemini'
import { AI_LANGUAGE_INSTRUCTION, Locale } from '@/lib/i18n/translations'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are an expert personal trainer and movement specialist with 20+ years of coaching experience. You analyze exercise form with precision and provide actionable, encouraging feedback.

When analyzing exercise form, structure your response as follows:

## Form Score: X/10

## What You're Doing Well
- List specific positive aspects of the form

## Areas to Improve
- List specific corrections with clear instructions

## Safety Watch Points
- Note any injury risk factors (if none, say "No major safety concerns")

## Coaching Cues
Provide 2-3 concise, memorable cues the person can use during the exercise.

Keep your tone encouraging and motivating. Be specific — reference body parts, angles, and positions clearly.`

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null
  const exercise = (formData.get('exercise') as string) || 'exercise'
  const locale = (formData.get('locale') as string) || 'en'

  if (!imageFile) {
    return new Response('No image provided', { status: 400 })
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(imageFile.type)) {
    return new Response('Invalid image type', { status: 400 })
  }

  const buffer = await imageFile.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const systemPrompt = locale && locale !== 'en'
    ? `${SYSTEM_PROMPT}\n\n${AI_LANGUAGE_INSTRUCTION[locale as Locale] || ''}`
    : SYSTEM_PROMPT

  const parts: Part[] = [
    { inlineData: { data: base64, mimeType: imageFile.type } },
    { text: `Please analyze the form for this ${exercise}. Give me detailed, specific feedback I can use immediately to improve.` },
  ]

  let geminiStream
  try {
    geminiStream = await getClient().models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Analysis failed'
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
        const msg = error instanceof Error ? error.message : 'Analysis failed'
        controller.enqueue(encoder.encode(`\n\nError: ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
