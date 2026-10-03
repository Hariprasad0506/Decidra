// The RICE scoring engine. Plain functions with no React code, so they can be tested on their own.
//
//   RICE score = (Reach × Impact × Confidence) ÷ Effort
//
// Confidence is entered as a percentage (80) and turned into a decimal (0.8) before multiplying.
// Nothing is rounded here; rounding only happens when a score is shown on screen.

export interface RiceInputs {
  reach: number // users per quarter
  impact: number // 3, 2, 1, 0.5 or 0.25
  confidence: number // percent, 0 to 100
  effort: number // person-months, must be above zero
}

export type RiceResult =
  | {
      ok: true
      score: number
      reach: number
      impact: number
      confidenceDecimal: number
      effort: number
    }
  | { ok: false; reason: string }

export function confidenceToDecimal(percent: number): number {
  return percent / 100
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// Returns the score, or a plain-English reason why it cannot be calculated.
// Never throws and never returns Infinity or NaN.
export function calculateRice(inputs: RiceInputs): RiceResult {
  const { reach, impact, confidence, effort } = inputs

  if (!isNumber(reach) || reach < 0) return { ok: false, reason: 'Reach must be zero or more.' }
  if (!isNumber(impact) || impact < 0) return { ok: false, reason: 'Impact must be zero or more.' }
  if (!isNumber(confidence) || confidence < 0 || confidence > 100) {
    return { ok: false, reason: 'Confidence must be between 0% and 100%.' }
  }
  if (!isNumber(effort) || effort <= 0) {
    return { ok: false, reason: 'Effort must be greater than zero.' }
  }

  const confidenceDecimal = confidenceToDecimal(confidence)
  const score = (reach * impact * confidenceDecimal) / effort
  if (!Number.isFinite(score)) return { ok: false, reason: 'These numbers are too large to score.' }

  return { ok: true, score, reach, impact, confidenceDecimal, effort }
}

export interface RankedItem<T> {
  item: T
  result: RiceResult
  rank: number | null // 1 is the top suggestion; null when the item cannot be scored
}

// Scores that differ only by tiny computer rounding (like 800 vs 800.0000000001) count as a tie.
function sameScore(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
}

// Sorts items from highest to lowest score and gives each a suggested rank.
// Ties are settled the same way every time:
//   1. lower effort first, 2. then higher confidence, 3. then the original order of the list.
// Items that cannot be scored go to the bottom, in their original order, with no rank.
export function rankByRice<T extends RiceInputs>(items: readonly T[]): RankedItem<T>[] {
  const scored = items.map((item, index) => ({ item, index, result: calculateRice(item) }))

  const valid = scored.filter((entry) => entry.result.ok)
  const invalid = scored.filter((entry) => !entry.result.ok)

  valid.sort((a, b) => {
    const scoreA = a.result.ok ? a.result.score : 0
    const scoreB = b.result.ok ? b.result.score : 0
    if (!sameScore(scoreA, scoreB)) return scoreB - scoreA
    if (a.item.effort !== b.item.effort) return a.item.effort - b.item.effort
    if (a.item.confidence !== b.item.confidence) return b.item.confidence - a.item.confidence
    return a.index - b.index
  })

  return [
    ...valid.map(({ item, result }, position) => ({ item, result, rank: position + 1 })),
    ...invalid.map(({ item, result }) => ({ item, result, rank: null })),
  ]
}

const scoreFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const inputFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 })

// Shows a score rounded to two decimal places, like 1,066.67.
export function formatScore(score: number): string {
  return scoreFormat.format(score)
}

// The working shown under each score, like "1,000 × 2 × 0.8 ÷ 2 = 800.00".
export function formatBreakdown(result: Extract<RiceResult, { ok: true }>): string {
  const parts = [result.reach, result.impact, result.confidenceDecimal].map((n) =>
    inputFormat.format(n),
  )
  return `${parts.join(' × ')} ÷ ${inputFormat.format(result.effort)} = ${formatScore(result.score)}`
}
