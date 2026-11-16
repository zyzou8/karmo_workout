import { NextRequest, NextResponse } from 'next/server'
import { getClient, GEMINI_MODEL } from '@/lib/gemini'
import { AI_LANGUAGE_INSTRUCTION, Locale } from '@/lib/i18n/translations'
import { currentUser } from '@/lib/server/session'
import { getVideoQuota, refundVideoAnalysis, reserveVideoAnalysis } from '@/lib/server/quota'
import { VIDEO_MAX_BYTES, VideoAnalysisResult } from '@/lib/videoAnalysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

const SYSTEM_PROMPT = `You are an expert strength coach and movement specialist. You watch a short (about 5–6 second) video of someone exercising and coach them on their form.

Watch the whole clip, including how the movement changes over time. Be specific and practical, and reference body parts, angles and positions.

Rules for the JSON you return:
- formScore: 1–10 for overall form quality.
- summary: 1–2 sentences.
- repCount: full repetitions seen in the clip (0 for holds or if unclear).
- tempo: short description, e.g. "2s down, 1s up".
- phases: 3–4 phases of ONE representative rep in time order (e.g. setup, descent, bottom, ascent), with startSec/endSec inside the clip. Do not repeat phases for every rep.
- corrections: up to 4 most important issues, each with the timestampSec of the frame that shows it most clearly, and focusX/focusY = where that body part is in the frame (0–1, from the top-left). severity is low, medium or high.
- jointAngles: 1–3 key joint angles at their most important moment, with the observed angle estimate and the recommended range for this exercise, in degrees.
- strengths, safety, cues: short bullet strings. cues are 2–3 memorable coaching cues.
- If the video doesn't show the selected exercise or the body isn't visible, give formScore 0 and explain in summary.
- Keep "severity" values in English; write every other text field in the user's language.`

const num = { type: 'number' }
const str = { type: 'string' }
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    formScore: num, summary: str, repCount: { type: 'integer' }, tempo: str,
    phases: { type: 'array', items: { type: 'object', properties: { name: str, startSec: num, endSec: num, description: str }, required: ['name', 'startSec', 'endSec', 'description'] } },
    strengths: { type: 'array', items: str },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: str, fix: str, bodyPart: str, timestampSec: num,
          severity: { type: 'string', enum: ['low', 'medium', 'high'] }, focusX: num, focusY: num,
        },
        required: ['issue', 'fix', 'bodyPart', 'timestampSec', 'severity', 'focusX', 'focusY'],
      },
    },
    jointAngles: {
      type: 'array',
      items: { type: 'object', properties: { joint: str, timestampSec: num, observedDeg: num, targetMinDeg: num, targetMaxDeg: num, note: str }, required: ['joint', 'timestampSec', 'observedDeg', 'targetMinDeg', 'targetMaxDeg', 'note'] },
    },
    safety: { type: 'array', items: str },
    cues: { type: 'array', items: str },
  },
  required: ['formScore', 'summary', 'repCount', 'tempo', 'phases', 'strengths', 'corrections', 'jointAngles', 'safety', 'cues'],
}

const clamp = (v: unknown, lo: number, hi: number, fallback = lo) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}
const strings = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 6) : [])

/** Keep the model's output inside the shapes and ranges the figures expect. */
function sanitize(raw: Record<string, unknown>, durationSec: number): VideoAnalysisResult {
  const end = durationSec > 0 ? durationSec : 6
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
  return {
    formScore: Math.round(clamp(raw.formScore, 0, 10)),
    summary: String(raw.summary ?? ''),
    repCount: Math.round(clamp(raw.repCount, 0, 100)),
    tempo: String(raw.tempo ?? ''),
    phases: arr(raw.phases).slice(0, 6).map(p => {
      const startSec = clamp(p.startSec, 0, end)
      return { name: String(p.name ?? ''), startSec, endSec: clamp(p.endSec, startSec, end, end), description: String(p.description ?? '') }
    }),
    strengths: strings(raw.strengths),
    corrections: arr(raw.corrections).slice(0, 4).map(c => ({
      issue: String(c.issue ?? ''), fix: String(c.fix ?? ''), bodyPart: String(c.bodyPart ?? ''),
      timestampSec: clamp(c.timestampSec, 0, end),
      severity: (['low', 'medium', 'high'].includes(String(c.severity)) ? c.severity : 'medium') as VideoAnalysisResult['corrections'][number]['severity'],
      focusX: clamp(c.focusX, 0, 1, 0.5), focusY: clamp(c.focusY, 0, 1, 0.5),
    })),
    jointAngles: arr(raw.jointAngles).slice(0, 3).map(a => {
      const targetMinDeg = clamp(a.targetMinDeg, 0, 180)
      return {
        joint: String(a.joint ?? ''), timestampSec: clamp(a.timestampSec, 0, end),
        observedDeg: clamp(a.observedDeg, 0, 180), targetMinDeg,
        targetMaxDeg: clamp(a.targetMaxDeg, targetMinDeg, 180, targetMinDeg), note: String(a.note ?? ''),
      }
    }),
    safety: strings(raw.safety),
    cues: strings(raw.cues),
  }
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await getVideoQuota(user.id))
}

export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await req.formData()
  const video = form.get('video') as File | null
  const exercise = String(form.get('exercise') || 'exercise').slice(0, 80)
  const locale = String(form.get('locale') || 'en') as Locale
  const durationSec = clamp(form.get('durationSec'), 0, 30, 6)

  if (!video) return NextResponse.json({ error: 'noVideo' }, { status: 400 })
  const mimeType = video.type.split(';')[0]
  if (!VIDEO_TYPES.includes(mimeType)) return NextResponse.json({ error: 'badType' }, { status: 400 })
  if (video.size > VIDEO_MAX_BYTES) return NextResponse.json({ error: 'tooLarge' }, { status: 413 })

  const quota = await reserveVideoAnalysis(user.id)
  if (!quota) return NextResponse.json({ error: 'quotaExceeded', quota: await getVideoQuota(user.id) }, { status: 429 })

  try {
    const base64 = Buffer.from(await video.arrayBuffer()).toString('base64')
    const lang = AI_LANGUAGE_INSTRUCTION[locale] || ''
    const res = await getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType: mimeType === 'video/x-m4v' ? 'video/mp4' : mimeType } },
          { text: `Exercise: ${exercise}. The clip is about ${durationSec.toFixed(1)} seconds long. Analyze my form over the whole clip.` },
        ],
      }],
      config: {
        systemInstruction: lang ? `${SYSTEM_PROMPT}\n\n${lang}` : SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 4096,
        temperature: 0.4,
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
    const text = res.text ?? ''
    const result = sanitize(JSON.parse(text), durationSec)
    return NextResponse.json({ result, quota })
  } catch (e) {
    console.error('video analysis failed', e)
    await refundVideoAnalysis(user.id).catch(() => {})
    return NextResponse.json({ error: 'analysisFailed', quota: await getVideoQuota(user.id).catch(() => quota) }, { status: 502 })
  }
}
