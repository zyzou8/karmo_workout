import { NextRequest } from 'next/server'
import type { Part } from '@google/genai'
import { getClient, GEMINI_MODEL } from '@/lib/gemini'
import { AI_LANGUAGE_INSTRUCTION, Locale } from '@/lib/i18n/translations'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a registered dietitian and certified nutrition specialist. You provide accurate, practical nutritional analysis and actionable dietary guidance.

When analyzing food or meals, structure your response as follows:

## Nutritional Estimate

| Nutrient | Amount |
|----------|--------|
| Calories | ~XXX kcal |
| Protein  | ~Xg |
| Carbs    | ~Xg |
| Fat      | ~Xg |
| Fiber    | ~Xg |

## What's in This Meal

Brief 2-3 sentence description of the key nutritional components and their health benefits.

## Highlights & Concerns

- **Good:** What nutritional wins this meal has
- **Watch:** Any nutritional gaps or overconsumption risks

## Healthier Swap Ideas

2-3 simple, realistic modifications to improve the nutritional profile.

## Fits Your Goals?

1-2 sentences on how this meal fits typical fitness goals (muscle gain, fat loss, energy).

Use realistic estimates. Be encouraging and non-judgmental about food choices.

After the full response above, on its own final line with nothing else, output exactly:
NUTRIENT_DATA:{"calories":<number>,"protein":<number>,"carbs":<number>,"fat":<number>,"fiber":<number>}
Use plain numbers only (no units, no text) matching your nutritional estimate above. This line must always be the very last line of your response.`

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null
  const description = (formData.get('description') as string) || ''
  const mealType = (formData.get('mealType') as string) || 'meal'
  const goal = (formData.get('goal') as string) || 'general health'
  const locale = (formData.get('locale') as string) || 'en'

  if (!description && !imageFile) {
    return new Response('No food description or image provided', { status: 400 })
  }

  const contextText = `
Meal type: ${mealType}
User's fitness goal: ${goal}
${description ? `Food description: ${description}` : 'Please analyze the food shown in the image.'}

Provide a complete nutritional analysis.`.trim()

  const parts: Part[] = []

  if (imageFile) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (validTypes.includes(imageFile.type)) {
      const buffer = await imageFile.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      parts.push({ inlineData: { data: base64, mimeType: imageFile.type } })
    }
  }

  parts.push({ text: contextText })

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
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nutrition analysis failed'
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
        const msg = error instanceof Error ? error.message : 'Nutrition analysis failed'
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
