/** Shared types for the video form analysis (server response ↔ client figures). */

export const VIDEO_MAX_SECONDS = 6
export const VIDEO_MIN_SECONDS = 2
/** Upload size cap after any client-side re-encode (Gemini inline data limit is ~20 MB). */
export const VIDEO_MAX_BYTES = 15 * 1024 * 1024

export type Severity = 'low' | 'medium' | 'high'

export interface VideoPhase { name: string; startSec: number; endSec: number; description: string }

export interface VideoCorrection {
  issue: string
  fix: string
  bodyPart: string
  timestampSec: number
  severity: Severity
  /** Approximate location of the problem in the frame, 0–1 from the top-left. */
  focusX: number
  focusY: number
}

export interface JointAngle {
  joint: string
  timestampSec: number
  observedDeg: number
  targetMinDeg: number
  targetMaxDeg: number
  note: string
}

export interface VideoAnalysisResult {
  formScore: number
  summary: string
  repCount: number
  tempo: string
  phases: VideoPhase[]
  strengths: string[]
  corrections: VideoCorrection[]
  jointAngles: JointAngle[]
  safety: string[]
  cues: string[]
}

export interface VideoQuota { used: number; limit: number; remaining: number; resetsAtISO: string }
