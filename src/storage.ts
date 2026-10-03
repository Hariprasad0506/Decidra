// Saving and restoring the backlog in the browser's localStorage.
//
// localStorage is a small storage area the browser keeps for this website. It survives page reloads
// but stays on this device and in this browser only. It can also be unavailable (private browsing,
// blocked site data) or full, so every read and write here is wrapped and never throws.

import { CONFIDENCE_OPTIONS, IMPACT_OPTIONS, STATUS_OPTIONS } from './riceOptions'
import { capManualPriorities } from './pmDecision'
import type { PmDecision } from './pmDecision'
import type { Feature } from './types'

export const STORAGE_KEY = 'decidra.backlog'
const STORAGE_VERSION = 1

// Everything that is saved: the features, the PM decisions, and the next ID number to hand out.
export interface SavedState {
  features: Feature[]
  decisions: Record<string, PmDecision>
  nextIdNumber: number
}

// The parts of localStorage used here, so tests can pass in a stand-in.
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type LoadResult =
  | { status: 'restored'; state: SavedState; skipped: number } // skipped = unreadable features left out
  | { status: 'empty' } // nothing saved yet: use the sample data
  | { status: 'unreadable'; message: string } // saved data exists but could not be used

export type SaveResult = { ok: true } | { ok: false; message: string }

// Returns the browser's localStorage, or null if the browser refuses access to it.
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown, max = 1000): value is string {
  return typeof value === 'string' && value.length <= max
}

// Checks one saved feature field by field. Anything unexpected means the feature is skipped,
// rather than letting bad data into the scoring.
function readFeature(value: unknown): Feature | null {
  if (!isRecord(value)) return null
  const { id, name, description, status, reach, impact, confidence, effort } = value
  const { evidenceNote, dependencyNote } = value
  if (!isText(id, 20) || !/^F-\d{3,}$/.test(id)) return null
  if (!isText(name) || name.trim() === '') return null
  if (!isText(description) || !isText(evidenceNote) || !isText(dependencyNote)) return null
  if (!STATUS_OPTIONS.includes(status as Feature['status'])) return null
  if (typeof reach !== 'number' || !Number.isSafeInteger(reach) || reach < 0) return null
  if (!IMPACT_OPTIONS.some((o) => o.value === impact)) return null
  if (!CONFIDENCE_OPTIONS.some((o) => o.value === confidence)) return null
  if (typeof effort !== 'number' || !Number.isFinite(effort) || effort <= 0) return null
  return {
    id,
    name,
    description,
    status: status as Feature['status'],
    reach,
    impact: impact as Feature['impact'],
    confidence: confidence as Feature['confidence'],
    effort,
    evidenceNote,
    dependencyNote,
  }
}

function readDecision(value: unknown): PmDecision | null {
  if (!isRecord(value)) return null
  if (value.kind === 'accepted') return { kind: 'accepted' }
  if (
    value.kind === 'manual' &&
    typeof value.priority === 'number' &&
    Number.isSafeInteger(value.priority) &&
    value.priority >= 1 &&
    isText(value.reason) &&
    value.reason.trim() !== ''
  ) {
    return { kind: 'manual', priority: value.priority, reason: value.reason }
  }
  return null
}

function idNumber(id: string): number {
  return Number(id.slice(2))
}

// Reads the saved backlog. Never throws: problems come back as a status with a plain-English message.
export function loadState(storage: KeyValueStorage | null): LoadResult {
  if (!storage) {
    return {
      status: 'unreadable',
      message: 'This browser is blocking saved data, so the demo data is shown and changes will not be kept.',
    }
  }

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      status: 'unreadable',
      message: 'Saved data could not be read in this browser, so the demo data is shown.',
    }
  }
  if (raw === null) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = null
  }
  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.features)) {
    return {
      status: 'unreadable',
      message: 'Saved data was damaged or from an unknown version, so the demo data is shown instead.',
    }
  }

  // Keep each readable feature once; skip broken ones and repeated IDs.
  const features: Feature[] = []
  const seen = new Set<string>()
  for (const item of parsed.features) {
    const feature = readFeature(item)
    if (feature && !seen.has(feature.id)) {
      features.push(feature)
      seen.add(feature.id)
    }
  }
  const skipped = parsed.features.length - features.length

  // Only keep decisions for features that still exist. Manual priorities above the number of
  // features are capped, so the priority always stays in the allowed range.
  const readable: Record<string, PmDecision> = {}
  if (isRecord(parsed.decisions)) {
    for (const [id, value] of Object.entries(parsed.decisions)) {
      const decision = readDecision(value)
      if (decision && seen.has(id)) readable[id] = decision
    }
  }
  const decisions = capManualPriorities(readable, features.length)

  // Never hand out an ID that is already used, even if the saved counter is missing or too low.
  const highestId = Math.max(0, ...features.map((f) => idNumber(f.id)))
  const savedNext = Number.isSafeInteger(parsed.nextIdNumber) ? Number(parsed.nextIdNumber) : 1
  const nextIdNumber = Math.max(savedNext, highestId + 1)

  return { status: 'restored', state: { features, decisions, nextIdNumber }, skipped }
}

// Saves the backlog. Never throws: a full or blocked storage comes back as a message to show.
export function saveState(storage: KeyValueStorage | null, state: SavedState): SaveResult {
  if (!storage) {
    return { ok: false, message: 'This browser is blocking saved data, so changes will be lost on reload.' }
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...state }))
    return { ok: true }
  } catch {
    return {
      ok: false,
      message:
        'Changes could not be saved in this browser (storage may be full or blocked), so they will be lost on reload.',
    }
  }
}
