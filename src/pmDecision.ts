// The PM's decision for a feature: accept the suggested rank, or set a manual priority with a reason.
//
// Decisions are kept separately from the feature and its RICE inputs. Overriding never changes the
// RICE score or the suggested rank; it only sets the final PM priority shown next to them.

import type { RankedItem } from './riceScoring'

export type PmDecision =
  | { kind: 'accepted' } // follows the suggested rank, including if the inputs change later
  | { kind: 'manual'; priority: number; reason: string }

export const REASON_MAX = 300

// The final PM priority: the suggested rank if accepted, the manual number if overridden,
// or null if the PM has not decided yet (or accepted a rank that cannot be calculated).
export function finalPriority(decision: PmDecision | undefined, suggestedRank: number | null) {
  if (!decision) return null
  if (decision.kind === 'accepted') return suggestedRank
  return decision.priority
}

// Manual priorities run from 1 to the number of features. When features are removed, any manual
// priority above the new count is lowered to the last place, so the saved data and the screen agree.
export function capManualPriorities(
  decisions: Readonly<Record<string, PmDecision>>,
  featureCount: number,
): Record<string, PmDecision> {
  const max = Math.max(1, featureCount)
  const capped: Record<string, PmDecision> = {}
  for (const [id, decision] of Object.entries(decisions)) {
    capped[id] =
      decision.kind === 'manual' && decision.priority > max ? { ...decision, priority: max } : decision
  }
  return capped
}

export type ManualPriorityErrors = { priority?: string; reason?: string }

// Checks the manual-priority form. Priorities run from 1 (do first) to the number of features.
export function validateManualPriority(
  rawPriority: string,
  rawReason: string,
  featureCount: number,
): { ok: true; decision: PmDecision } | { ok: false; errors: ManualPriorityErrors } {
  const errors: ManualPriorityErrors = {}
  const text = rawPriority.trim()
  const reason = rawReason.trim()
  const max = Math.max(1, featureCount)

  if (text === '') errors.priority = 'Enter a priority number, where 1 means do first.'
  else if (!/^\d+$/.test(text)) errors.priority = 'Use a whole number, like 2.'
  else if (Number(text) < 1 || Number(text) > max) {
    errors.priority =
      max === 1
        ? 'With one feature, the priority can only be 1.'
        : `Choose a number from 1 to ${max}.`
  }

  if (reason === '') errors.reason = 'Add a short reason so others can follow the decision.'
  else if (reason.length > REASON_MAX)
    errors.reason = `Keep the reason under ${REASON_MAX} characters.`

  if (errors.priority || errors.reason) return { ok: false, errors }
  return { ok: true, decision: { kind: 'manual', priority: Number(text), reason } }
}

// IDs of other features that already have the same final priority. Used for a gentle warning only;
// two features may share a priority if the PM wants that.
export function samePriorityAs<T extends { id: string }>(
  ranked: readonly RankedItem<T>[],
  decisions: Readonly<Record<string, PmDecision>>,
  featureId: string,
  priority: number,
): T[] {
  return ranked
    .filter(
      ({ item, rank }) =>
        item.id !== featureId && finalPriority(decisions[item.id], rank) === priority,
    )
    .map(({ item }) => item)
}

// Orders the backlog by final PM priority (1 first). Features with the same final priority keep
// their suggested-rank order. Features without a decision go last, in suggested-rank order.
export function orderByFinalPriority<T extends { id: string }>(
  ranked: readonly RankedItem<T>[],
  decisions: Readonly<Record<string, PmDecision>>,
): RankedItem<T>[] {
  return ranked
    .map((entry, position) => ({
      entry,
      position,
      final: finalPriority(decisions[entry.item.id], entry.rank),
    }))
    .sort((a, b) => {
      if (a.final === null && b.final === null) return a.position - b.position
      if (a.final === null) return 1
      if (b.final === null) return -1
      return a.final - b.final || a.position - b.position
    })
    .map(({ entry }) => entry)
}
