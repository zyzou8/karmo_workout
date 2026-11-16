import { NextRequest } from 'next/server'
import type { Part } from '@google/genai'
import { getClient, GEMINI_MODEL } from '@/lib/gemini'
import { AI_LANGUAGE_INSTRUCTION, Locale } from '@/lib/i18n/translations'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a certified personal trainer and exercise physiologist. You create evidence-based, personalized workout programs tailored to individual needs, goals, and fitness levels.

When creating a workout plan, structure your response as follows:

## Your Personalized Plan

Brief 2-sentence summary of the approach and why it suits this person.

## Weekly Schedule

Lay out each training day with:
- Day name and focus (e.g., "Day 1 — Lower Body Strength")
- 4-6 exercises with sets × reps and rest periods
- Effort level note

## Key Exercises Explained

For 2-3 main exercises, explain proper form in 2-3 sentences.

## Progressive Overload Guide

How to advance the program over the first 8 weeks.

## Recovery & Lifestyle Tips

3-4 practical recovery tips specific to their goals.

## Daily Nutrition Target

A brief estimate of a suitable daily calorie and macronutrient target for this person given their stats and goal (a short explanation, 2-3 sentences).

Use clear formatting. Be specific with numbers (sets, reps, rest). Keep it practical and immediately actionable.

After the full response above, on its own final line with nothing else, output exactly:
TARGET_DATA:{"calories":<number>,"protein":<number>,"carbs":<number>,"fat":<number>}
Use plain numbers only (whole-number grams/kcal, no units, no text) matching the Daily Nutrition Target section above. This line must always be the very last line of your response.`

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null
  const age = formData.get('age') as string
  const heightCm = formData.get('heightCm') as string
  const weightKg = formData.get('weightKg') as string
  const gender = formData.get('gender') as string
  const fitnessLevel = formData.get('fitnessLevel') as string
  const goals = formData.get('goals') as string
  const daysPerWeek = formData.get('daysPerWeek') as string
  const equipment = formData.get('equipment') as string
  const locale = (formData.get('locale') as string) || 'en'

  const profileText = `
Profile:
- Age: ${age || 'Not specified'}
- Height: ${heightCm ? `${heightCm} cm` : 'Not specified'}
- Weight: ${weightKg ? `${weightKg} kg` : 'Not specified'}
- Gender: ${gender || 'Not specified'}
- Fitness Level: ${fitnessLevel || 'Beginner'}
- Primary Goals: ${goals || 'General fitness'}
- Training Days per Week: ${daysPerWeek || '3'}
- Available Equipment: ${equipment || 'No equipment specified'}

Please create a personalized workout plan for this person.`.trim()

  const parts: Part[] = []

  if (imageFile) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (validTypes.includes(imageFile.type)) {
      const buffer = await imageFile.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      parts.push({ inlineData: { data: base64, mimeType: imageFile.type } })
      parts.push({ text: `Here is a photo for body composition reference.\n\n${profileText}` })
    } else {
      parts.push({ text: profileText })
    }
  } else {
    parts.push({ text: profileText })
  }

  const systemPrompt = locale && locale !== 'en'
    ? `${SYSTEM_PROMPT}\n\n${AI_LANGUAGE_INSTRUCTION[locale as Locale] || ''}`
    : SYSTEM_PROMPT

  let geminiStream
  try {
    geminiStream = await getClient().models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Plan generation failed'
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
        const msg = error instanceof Error ? error.message : 'Plan generation failed'
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
