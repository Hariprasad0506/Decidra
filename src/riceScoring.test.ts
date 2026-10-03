import { describe, expect, it } from 'vitest'
import {
  calculateRice,
  confidenceToDecimal,
  formatBreakdown,
  formatScore,
  rankByRice,
} from './riceScoring'
import type { RiceInputs } from './riceScoring'

function scoreOf(inputs: RiceInputs): number {
  const result = calculateRice(inputs)
  if (!result.ok) throw new Error(`Expected a score, got: ${result.reason}`)
  return result.score
}

function feature(id: string, inputs: RiceInputs) {
  return { id, ...inputs }
}

describe('calculateRice', () => {
  it('scores the slide example as 800', () => {
    expect(scoreOf({ reach: 1000, impact: 2, confidence: 80, effort: 2 })).toBe(800)
  })

  it('turns confidence percentages into decimals before multiplying', () => {
    expect(confidenceToDecimal(80)).toBe(0.8)
    expect(confidenceToDecimal(50)).toBe(0.5)
    expect(confidenceToDecimal(100)).toBe(1)
    const result = calculateRice({ reach: 100, impact: 1, confidence: 50, effort: 1 })
    expect(result).toMatchObject({ ok: true, confidenceDecimal: 0.5, score: 50 })
  })

  it('handles decimal effort', () => {
    expect(scoreOf({ reach: 1000, impact: 1, confidence: 100, effort: 0.5 })).toBe(2000)
    expect(scoreOf({ reach: 5000, impact: 0.5, confidence: 100, effort: 1.5 })).toBeCloseTo(
      1666.6666667,
      6,
    )
  })

  it('does not round intermediate steps', () => {
    // 2000 × 2 × 0.8 ÷ 3 = 1066.666… and must stay unrounded until display.
    const score = scoreOf({ reach: 2000, impact: 2, confidence: 80, effort: 3 })
    expect(score).toBeCloseTo(3200 / 3, 10)
    expect(formatScore(score)).toBe('1,066.67')
  })

  it('refuses zero effort instead of dividing by zero', () => {
    const result = calculateRice({ reach: 1000, impact: 2, confidence: 80, effort: 0 })
    expect(result).toEqual({ ok: false, reason: 'Effort must be greater than zero.' })
  })

  it('refuses negative or missing effort', () => {
    expect(calculateRice({ reach: 1000, impact: 2, confidence: 80, effort: -1 }).ok).toBe(false)
    expect(calculateRice({ reach: 1000, impact: 2, confidence: 80, effort: NaN }).ok).toBe(false)
    expect(
      calculateRice({ reach: 1000, impact: 2, confidence: 80, effort: Infinity }).ok,
    ).toBe(false)
  })

  it('refuses other invalid inputs safely', () => {
    expect(calculateRice({ reach: -5, impact: 2, confidence: 80, effort: 1 }).ok).toBe(false)
    expect(calculateRice({ reach: 10, impact: NaN, confidence: 80, effort: 1 }).ok).toBe(false)
    expect(calculateRice({ reach: 10, impact: 2, confidence: 120, effort: 1 }).ok).toBe(false)
    expect(calculateRice({ reach: 10, impact: 2, confidence: -1, effort: 1 }).ok).toBe(false)
    const notNumbers = { reach: '10', impact: 2, confidence: 80, effort: 1 } as unknown as RiceInputs
    expect(calculateRice(notNumbers).ok).toBe(false)
    const huge = { reach: Number.MAX_VALUE, impact: 3, confidence: 100, effort: 0.1 }
    expect(calculateRice(huge).ok).toBe(false)
  })

  it('allows a reach of zero, which scores zero', () => {
    expect(scoreOf({ reach: 0, impact: 2, confidence: 80, effort: 2 })).toBe(0)
  })
})

describe('rankByRice', () => {
  it('sorts from highest to lowest score and numbers the ranks', () => {
    const ranked = rankByRice([
      feature('low', { reach: 100, impact: 1, confidence: 100, effort: 1 }), // 100
      feature('high', { reach: 1000, impact: 2, confidence: 80, effort: 2 }), // 800
      feature('mid', { reach: 500, impact: 1, confidence: 100, effort: 1 }), // 500
    ])
    expect(ranked.map((r) => r.item.id)).toEqual(['high', 'mid', 'low'])
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('ranks the GymBuddy samples in the expected order', () => {
    const ranked = rankByRice([
      feature('F-001', { reach: 2000, impact: 2, confidence: 80, effort: 3 }), // 1,066.67
      feature('F-002', { reach: 3500, impact: 1, confidence: 50, effort: 4 }), // 437.50
      feature('F-003', { reach: 5000, impact: 0.5, confidence: 100, effort: 1.5 }), // 1,666.67
    ])
    expect(ranked.map((r) => r.item.id)).toEqual(['F-003', 'F-001', 'F-002'])
  })

  it('breaks a tie by lower effort first', () => {
    const ranked = rankByRice([
      feature('more-effort', { reach: 1000, impact: 2, confidence: 100, effort: 4 }), // 500
      feature('less-effort', { reach: 500, impact: 2, confidence: 100, effort: 2 }), // 500
    ])
    expect(ranked.map((r) => r.item.id)).toEqual(['less-effort', 'more-effort'])
  })

  it('then breaks a tie by higher confidence', () => {
    const ranked = rankByRice([
      feature('less-sure', { reach: 1000, impact: 1, confidence: 50, effort: 1 }), // 500
      feature('more-sure', { reach: 500, impact: 1, confidence: 100, effort: 1 }), // 500
    ])
    expect(ranked.map((r) => r.item.id)).toEqual(['more-sure', 'less-sure'])
  })

  it('then keeps the original order', () => {
    const ranked = rankByRice([
      feature('first', { reach: 1000, impact: 1, confidence: 80, effort: 2 }),
      feature('second', { reach: 1000, impact: 1, confidence: 80, effort: 2 }),
      feature('third', { reach: 1000, impact: 1, confidence: 80, effort: 2 }),
    ])
    expect(ranked.map((r) => r.item.id)).toEqual(['first', 'second', 'third'])
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('treats scores that differ only by computer rounding as a tie', () => {
    // 0.1 × 3 ÷ 1 is 0.30000000000000004 in computer maths; 0.3 × 1 ÷ 1 is 0.3.
    const ranked = rankByRice([
      feature('clean', { reach: 0.3, impact: 1, confidence: 100, effort: 1 }),
      feature('rounding-noise', { reach: 0.1, impact: 3, confidence: 100, effort: 1 }),
    ])
    // Without tie handling, the slightly larger noisy score would jump ahead.
    expect(ranked.map((r) => r.item.id)).toEqual(['clean', 'rounding-noise'])
  })

  it('puts features that cannot be scored at the bottom with no rank', () => {
    const ranked = rankByRice([
      feature('broken', { reach: 1000, impact: 2, confidence: 80, effort: 0 }),
      feature('ok', { reach: 10, impact: 1, confidence: 50, effort: 1 }),
    ])
    expect(ranked.map((r) => [r.item.id, r.rank])).toEqual([
      ['ok', 1],
      ['broken', null],
    ])
  })

  it('returns an empty list for an empty backlog', () => {
    expect(rankByRice([])).toEqual([])
  })
})

describe('display helpers', () => {
  it('rounds displayed scores to two decimal places', () => {
    expect(formatScore(800)).toBe('800.00')
    expect(formatScore(437.5)).toBe('437.50')
    expect(formatScore(1666.666666)).toBe('1,666.67')
  })

  it('shows the full calculation', () => {
    const result = calculateRice({ reach: 1000, impact: 2, confidence: 80, effort: 2 })
    if (!result.ok) throw new Error('expected a score')
    expect(formatBreakdown(result)).toBe('1,000 × 2 × 0.8 ÷ 2 = 800.00')
  })
})
