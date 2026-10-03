import { describe, expect, it } from 'vitest'
import {
  LOW_EFFORT_THRESHOLD,
  checkBacklog,
  checkFeature,
  everyFeatureHasMaxImpact,
  hasEvidence,
} from './assumptionChecks'
import {
  finalPriority,
  orderByFinalPriority,
  samePriorityAs,
  validateManualPriority,
} from './pmDecision'
import type { PmDecision } from './pmDecision'
import { calculateRice, rankByRice } from './riceScoring'
import { sampleFeatures } from './data/sampleFeatures'
import { confidenceSensitivity, describeScenario } from './sensitivity'
import type { Feature } from './types'

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'F-100',
    name: 'Test feature',
    description: '',
    status: 'Idea',
    reach: 1000,
    impact: 2,
    confidence: 80,
    effort: 2,
    evidenceNote: 'Interviews with 12 members.',
    dependencyNote: '',
    ...overrides,
  }
}

function kinds(feature: Feature, allMaxImpact = false) {
  return checkFeature(feature, allMaxImpact).map((flag) => flag.kind)
}

describe('assumption checks', () => {
  it('flags nothing for a well-supported, ordinary feature', () => {
    expect(kinds(makeFeature())).toEqual([])
  })

  it('flags 100% confidence when the evidence note is empty or marked as an assumption', () => {
    expect(kinds(makeFeature({ confidence: 100, evidenceNote: '' }))).toContain(
      'certain-without-evidence',
    )
    expect(
      kinds(makeFeature({ confidence: 100, evidenceNote: 'Assumption: people want it' })),
    ).toContain('certain-without-evidence')
    expect(
      kinds(makeFeature({ confidence: 100, evidenceNote: '  assumption - gut feel' })),
    ).toContain('certain-without-evidence')
  })

  it('does not flag 100% confidence that has an evidence note', () => {
    expect(kinds(makeFeature({ confidence: 100, evidenceNote: 'A/B test, 4 weeks' }))).toEqual([])
  })

  it('does not flag lower confidence without evidence', () => {
    expect(kinds(makeFeature({ confidence: 50, evidenceNote: 'Assumption: guess' }))).toEqual([])
  })

  it('recognises evidence notes', () => {
    expect(hasEvidence('Survey of 200 members')).toBe(true)
    expect(hasEvidence('Assumptions were checked in a survey')).toBe(true) // "Assumptions…" is a sentence, not a label
    expect(hasEvidence('Assumption: none yet')).toBe(false)
    expect(hasEvidence('   ')).toBe(false)
  })

  it('flags maximum impact only when every feature (two or more) has it', () => {
    const massive = makeFeature({ impact: 3 })
    expect(everyFeatureHasMaxImpact([massive, { ...massive, id: 'F-101' }])).toBe(true)
    expect(everyFeatureHasMaxImpact([massive, makeFeature({ id: 'F-101', impact: 2 })])).toBe(false)
    expect(everyFeatureHasMaxImpact([massive])).toBe(false)
    expect(everyFeatureHasMaxImpact([])).toBe(false)

    const flags = checkBacklog([massive, { ...massive, id: 'F-101' }])
    expect(flags.get('F-100')?.map((f) => f.kind)).toEqual(['all-max-impact'])
    expect(flags.get('F-101')?.map((f) => f.kind)).toEqual(['all-max-impact'])
  })

  it(`flags effort below ${LOW_EFFORT_THRESHOLD} person-months, but not at the threshold`, () => {
    expect(kinds(makeFeature({ effort: 0.25 }))).toContain('low-effort')
    expect(kinds(makeFeature({ effort: 0.1 }))).toContain('low-effort')
    expect(kinds(makeFeature({ effort: LOW_EFFORT_THRESHOLD }))).not.toContain('low-effort')
    expect(kinds(makeFeature({ effort: 3 }))).not.toContain('low-effort')
  })

  it('flags zero reach', () => {
    expect(kinds(makeFeature({ reach: 0 }))).toContain('zero-reach')
    expect(kinds(makeFeature({ reach: 1 }))).not.toContain('zero-reach')
  })

  it('flags a dependency or strategic-override note, ignoring blank space', () => {
    expect(kinds(makeFeature({ dependencyNote: 'Needs new login' }))).toContain(
      'dependency-or-override',
    )
    expect(kinds(makeFeature({ dependencyNote: '   ' }))).not.toContain('dependency-or-override')
  })

  it('can raise several flags at once', () => {
    const feature = makeFeature({
      confidence: 100,
      evidenceNote: 'Assumption: obvious win',
      effort: 0.2,
      reach: 0,
      dependencyNote: 'CEO request',
    })
    expect(kinds(feature, true)).toEqual([
      'certain-without-evidence',
      'all-max-impact',
      'low-effort',
      'zero-reach',
      'dependency-or-override',
    ])
  })

  it('uses non-judgmental wording', () => {
    const feature = makeFeature({
      confidence: 100,
      evidenceNote: '',
      effort: 0.2,
      reach: 0,
      dependencyNote: 'x',
    })
    for (const flag of checkFeature(feature, true)) {
      expect(flag.message).not.toMatch(/\b(wrong|incorrect|invalid|error|mistake|bad)\b/i)
    }
  })

  it('never changes the feature', () => {
    const feature = makeFeature({ confidence: 100, evidenceNote: '', effort: 0.1, reach: 0 })
    const before = structuredClone(feature)
    checkBacklog([feature])
    expect(feature).toEqual(before)
  })

  it('flags the GymBuddy samples where expected', () => {
    const flags = checkBacklog(sampleFeatures)
    expect(flags.get('F-001')?.map((f) => f.kind)).toEqual([])
    expect(flags.get('F-002')?.map((f) => f.kind)).toEqual(['dependency-or-override'])
    expect(flags.get('F-003')?.map((f) => f.kind)).toEqual([]) // 100% but has evidence
  })
})

describe('confidence sensitivity', () => {
  it('re-scores at each other confidence level and re-ranks the backlog', () => {
    // Samples: F-003 1,666.67 (#1), F-001 1,066.67 (#2), F-002 437.50 (#3).
    const scenarios = confidenceSensitivity(sampleFeatures, 'F-001') // F-001 is at 80%
    expect(scenarios.map((s) => s.toConfidence)).toEqual([100, 50])

    const [up, down] = scenarios
    expect(up.toScore).toBeCloseTo(4000 / 3, 10) // 2000 × 2 × 1 ÷ 3
    expect(up.toRank).toBe(2) // still below 1,666.67
    expect(down.toScore).toBeCloseTo(2000 / 3, 10) // 666.67, still above 437.50
    expect(down.toRank).toBe(2)
    expect(down.fromScore).toBeCloseTo(3200 / 3, 10)
    expect(down.fromRank).toBe(2)
  })

  it('shows rank changes when a different confidence would move the feature', () => {
    // F-003 at 50% scores 833.33, which drops below F-001 (1,066.67).
    const down = confidenceSensitivity(sampleFeatures, 'F-003').find((s) => s.toConfidence === 50)
    expect(down?.toRank).toBe(2)
    expect(down && describeScenario(down)).toBe(
      "If confidence decreases from 100% to 50%, this feature's score changes from 1,666.67 to 833.33 and its suggested rank changes from #1 to #2.",
    )
  })

  it('says when the rank stays the same', () => {
    const up = confidenceSensitivity(sampleFeatures, 'F-002').find((s) => s.toConfidence === 80)
    expect(up && describeScenario(up)).toBe(
      "If confidence increases from 50% to 80%, this feature's score changes from 437.50 to 700.00 and its suggested rank stays at #3.",
    )
  })

  it('gives the same answer every time and does not change the backlog', () => {
    const before = structuredClone(sampleFeatures)
    const first = confidenceSensitivity(sampleFeatures, 'F-002')
    const second = confidenceSensitivity(sampleFeatures, 'F-002')
    expect(first).toEqual(second)
    expect(sampleFeatures).toEqual(before)
  })

  it('returns nothing for an unknown or unscorable feature', () => {
    expect(confidenceSensitivity(sampleFeatures, 'F-999')).toEqual([])
    expect(confidenceSensitivity([makeFeature({ effort: 0 })], 'F-100')).toEqual([])
  })
})

describe('PM decisions', () => {
  const ranked = rankByRice(sampleFeatures) // F-003 #1, F-001 #2, F-002 #3

  it('works out the final priority', () => {
    expect(finalPriority(undefined, 2)).toBeNull()
    expect(finalPriority({ kind: 'accepted' }, 2)).toBe(2)
    expect(finalPriority({ kind: 'accepted' }, null)).toBeNull()
    expect(finalPriority({ kind: 'manual', priority: 1, reason: 'Launch' }, 3)).toBe(1)
  })

  it('validates a manual priority and reason', () => {
    expect(validateManualPriority('1', 'Partner launch', 3)).toEqual({
      ok: true,
      decision: { kind: 'manual', priority: 1, reason: 'Partner launch' },
    })
    expect(validateManualPriority(' 2 ', '  trimmed  ', 3)).toMatchObject({
      ok: true,
      decision: { priority: 2, reason: 'trimmed' },
    })

    const bad = (p: string, r: string, n = 3) => {
      const result = validateManualPriority(p, r, n)
      return result.ok ? null : result.errors
    }
    expect(bad('', 'x')?.priority).toBeDefined()
    expect(bad('0', 'x')?.priority).toBe('Choose a number from 1 to 3.')
    expect(bad('4', 'x')?.priority).toBe('Choose a number from 1 to 3.')
    expect(bad('1.5', 'x')?.priority).toBe('Use a whole number, like 2.')
    expect(bad('-1', 'x')?.priority).toBeDefined()
    expect(bad('abc', 'x')?.priority).toBeDefined()
    expect(bad('1', '   ')?.reason).toBeDefined()
    expect(bad('1', 'a'.repeat(301))?.reason).toBeDefined()
    expect(bad('2', 'x', 1)?.priority).toBe('With one feature, the priority can only be 1.')
  })

  it('orders by final priority, with undecided features last in suggested order', () => {
    const decisions: Record<string, PmDecision> = {
      'F-002': { kind: 'manual', priority: 1, reason: 'Needed for launch' },
      'F-003': { kind: 'accepted' }, // #1 too, ties keep suggested order
    }
    expect(orderByFinalPriority(ranked, decisions).map((r) => r.item.id)).toEqual([
      'F-003',
      'F-002',
      'F-001',
    ])
    expect(orderByFinalPriority(ranked, {}).map((r) => r.item.id)).toEqual([
      'F-003',
      'F-001',
      'F-002',
    ])
  })

  it('finds other features sharing a final priority', () => {
    const decisions: Record<string, PmDecision> = {
      'F-002': { kind: 'manual', priority: 1, reason: 'Needed for launch' },
      'F-003': { kind: 'accepted' },
    }
    expect(samePriorityAs(ranked, decisions, 'F-002', 1).map((f) => f.id)).toEqual(['F-003'])
    expect(samePriorityAs(ranked, decisions, 'F-001', 2)).toEqual([])
  })

  it('never changes the RICE score or suggested rank', () => {
    const decisions: Record<string, PmDecision> = {
      'F-002': { kind: 'manual', priority: 1, reason: 'Needed for launch' },
    }
    const reordered = orderByFinalPriority(ranked, decisions)
    const f002 = reordered.find((r) => r.item.id === 'F-002')
    expect(f002?.rank).toBe(3)
    expect(f002?.result).toEqual(calculateRice(sampleFeatures[1]))
    expect(rankByRice(sampleFeatures)).toEqual(ranked)
  })
})
