// A short stakeholder summary written from fixed rules (no AI), so the same backlog always gives
// exactly the same text. Plain functions with no React code, so they can be tested on their own.

import { checkBacklog } from './assumptionChecks'
import type { PmDecision } from './pmDecision'
import { formatScore, rankByRice } from './riceScoring'
import type { Feature } from './types'

// How many of the highest-ranked features the summary names.
export const SUMMARY_TOP_COUNT = 3

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export function buildStakeholderSummary(
  features: readonly Feature[],
  decisions: Readonly<Record<string, PmDecision>>,
): string {
  if (features.length === 0) return 'The backlog is empty, so there is nothing to summarize yet.'

  const ranked = rankByRice(features)
  const scored = ranked.filter((entry) => entry.result.ok)
  const top = scored.slice(0, SUMMARY_TOP_COUNT)
  const flagsById = checkBacklog(features)
  const lines: string[] = []

  lines.push('Decidra prioritization summary')
  lines.push(
    `${plural(features.length, 'feature', 'features')} in the backlog, ` +
      `${scored.length} scored with RICE (Reach × Impact × Confidence ÷ Effort).`,
  )

  lines.push('')
  lines.push(top.length === 1 ? 'Highest-ranked feature:' : `Top ${top.length} features by RICE score:`)
  for (const { item, result, rank } of top) {
    if (result.ok) lines.push(`${rank}. ${item.name}: score ${formatScore(result.score)}`)
  }
  const unscored = ranked.length - scored.length
  if (unscored > 0) lines.push(`${plural(unscored, 'feature', 'features')} could not be scored.`)

  // Assumptions are listed for the top features, because those are the ones stakeholders act on.
  lines.push('')
  lines.push('Important assumptions:')
  const topIds = new Set(top.map(({ item }) => item.id))
  let topFlags = 0
  for (const { item } of top) {
    const flags = flagsById.get(item.id) ?? []
    topFlags += flags.length
    if (flags.length > 0) lines.push(`- ${item.name}: ${flags.map((f) => f.title).join('; ')}`)
  }
  if (topFlags === 0) lines.push('- None flagged for the top features.')
  const otherFlags = features
    .filter((f) => !topIds.has(f.id))
    .reduce((total, f) => total + (flagsById.get(f.id)?.length ?? 0), 0)
  if (otherFlags > 0) {
    lines.push(`- ${plural(otherFlags, 'more assumption', 'more assumptions')} flagged in the rest of the backlog.`)
  }

  // Overrides are listed in suggested-rank order, so the summary does not depend on the order of decisions.
  lines.push('')
  lines.push('PM overrides:')
  const overrides = ranked.filter(({ item }) => decisions[item.id]?.kind === 'manual')
  for (const { item, rank } of overrides) {
    const decision = decisions[item.id]
    if (decision?.kind !== 'manual') continue
    const from = rank === null ? 'not ranked' : `suggested #${rank}`
    lines.push(`- ${item.name}: ${from}, set to priority #${decision.priority}. Reason: ${decision.reason}`)
  }
  if (overrides.length === 0) {
    const anyDecision = features.some((f) => decisions[f.id] !== undefined)
    lines.push(
      anyDecision
        ? '- None. The PM decisions so far follow the suggested ranks.'
        : '- None. No PM decisions have been made yet.',
    )
  }

  return lines.join('\n')
}
