// Sensitivity analysis: "what if our confidence were different?"
//
// For one feature, this re-scores it at every other allowed confidence level and re-ranks the backlog
// with only that one change. Everything else stays as entered, and nothing is saved, so the real
// scores and ranks are never touched. Same inputs always give the same answer.

import { CONFIDENCE_OPTIONS } from './riceOptions'
import { calculateRice, formatScore, rankByRice } from './riceScoring'
import type { ConfidenceValue, Feature } from './types'

export interface ConfidenceScenario {
  fromConfidence: ConfidenceValue
  toConfidence: ConfidenceValue
  fromScore: number
  toScore: number
  fromRank: number
  toRank: number
}

function rankOf(features: readonly Feature[], id: string): number | null {
  return rankByRice(features).find((entry) => entry.item.id === id)?.rank ?? null
}

// Returns one scenario per other confidence level, highest confidence first.
// Returns an empty list if the feature is not in the backlog or cannot be scored.
export function confidenceSensitivity(
  features: readonly Feature[],
  featureId: string,
): ConfidenceScenario[] {
  const feature = features.find((f) => f.id === featureId)
  if (!feature) return []

  const current = calculateRice(feature)
  const currentRank = rankOf(features, featureId)
  if (!current.ok || currentRank === null) return []

  const scenarios: ConfidenceScenario[] = []
  for (const option of CONFIDENCE_OPTIONS) {
    if (option.value === feature.confidence) continue

    const changed = { ...feature, confidence: option.value }
    const result = calculateRice(changed)
    const newRank = rankOf(
      features.map((f) => (f.id === featureId ? changed : f)),
      featureId,
    )
    if (!result.ok || newRank === null) continue

    scenarios.push({
      fromConfidence: feature.confidence,
      toConfidence: option.value,
      fromScore: current.score,
      toScore: result.score,
      fromRank: currentRank,
      toRank: newRank,
    })
  }
  return scenarios
}

// A one-sentence explanation, for example:
// "If confidence decreases from 80% to 50%, this feature's score changes from 1,066.67 to 666.67
//  and its suggested rank changes from #2 to #3."
export function describeScenario(s: ConfidenceScenario): string {
  const direction = s.toConfidence > s.fromConfidence ? 'increases' : 'decreases'
  const rankPart =
    s.toRank === s.fromRank
      ? `its suggested rank stays at #${s.fromRank}`
      : `its suggested rank changes from #${s.fromRank} to #${s.toRank}`
  return (
    `If confidence ${direction} from ${s.fromConfidence}% to ${s.toConfidence}%, ` +
    `this feature's score changes from ${formatScore(s.fromScore)} to ${formatScore(s.toScore)} ` +
    `and ${rankPart}.`
  )
}
