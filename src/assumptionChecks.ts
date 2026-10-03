// Rule-based assumption checks. Plain functions with no React code, so they can be tested on their own.
//
// A flag is a prompt to look again, not a verdict. Every message says why the estimate is worth a
// second look and never claims it is wrong. The checks never change a feature or its RICE score.

import type { Feature } from './types'

// Effort below this many person-months is flagged as unusually low.
// 0.5 person-months is roughly two weeks of one person's time, so anything smaller is about a week or less.
export const LOW_EFFORT_THRESHOLD = 0.5

// The highest Impact value on the scale (3 = Massive).
export const MAX_IMPACT = 3

export type FlagKind =
  | 'certain-without-evidence'
  | 'all-max-impact'
  | 'low-effort'
  | 'zero-reach'
  | 'dependency-or-override'

export interface AssumptionFlag {
  kind: FlagKind
  title: string
  message: string
}

// An evidence note that is empty, or that the PM has marked as an assumption, is not evidence yet.
export function hasEvidence(evidenceNote: string): boolean {
  const note = evidenceNote.trim()
  return note !== '' && !/^assumption\b/i.test(note)
}

// True when there are at least two features and every one is rated maximum impact.
// With a single feature, "every feature" says nothing useful, so it is not flagged.
export function everyFeatureHasMaxImpact(features: readonly Pick<Feature, 'impact'>[]): boolean {
  return features.length >= 2 && features.every((feature) => feature.impact === MAX_IMPACT)
}

// The flags for one feature. `allMaxImpact` comes from everyFeatureHasMaxImpact on the whole backlog.
export function checkFeature(feature: Feature, allMaxImpact: boolean): AssumptionFlag[] {
  const flags: AssumptionFlag[] = []

  if (feature.confidence === 100 && !hasEvidence(feature.evidenceNote)) {
    flags.push({
      kind: 'certain-without-evidence',
      title: '100% confidence without evidence',
      message:
        'Confidence is set to 100%, but the evidence note is empty or marked as an assumption. ' +
        'If there is data behind this, adding it to the note will make the estimate easier to trust.',
    })
  }

  if (allMaxImpact) {
    flags.push({
      kind: 'all-max-impact',
      title: 'Every feature has maximum impact',
      message:
        'All features in the backlog are rated 3 (Massive) impact, so impact is not helping to tell them apart. ' +
        'It may be worth checking whether some are closer to High or Medium.',
    })
  }

  if (feature.effort < LOW_EFFORT_THRESHOLD) {
    flags.push({
      kind: 'low-effort',
      title: 'Unusually low effort',
      message:
        `Effort is ${feature.effort} person-months, which is under ${LOW_EFFORT_THRESHOLD} (about two weeks of one person). ` +
        'Small efforts raise the score a lot, so it is worth confirming this includes design, testing and release.',
    })
  }

  if (feature.reach === 0) {
    flags.push({
      kind: 'zero-reach',
      title: 'Zero reach',
      message:
        'Reach is 0, so the RICE score is 0 whatever the other inputs are. ' +
        'If this feature does reach some users each quarter, updating the estimate will give it a fair score.',
    })
  }

  if (feature.dependencyNote.trim() !== '') {
    flags.push({
      kind: 'dependency-or-override',
      title: 'Dependency or strategic override',
      message:
        'This feature has a dependency or strategic-override note. The RICE score does not take it into account, ' +
        'so it is worth considering when you set the final priority.',
    })
  }

  return flags
}

// Flags for every feature in the backlog, keyed by feature ID.
export function checkBacklog(features: readonly Feature[]): Map<string, AssumptionFlag[]> {
  const allMaxImpact = everyFeatureHasMaxImpact(features)
  return new Map(features.map((feature) => [feature.id, checkFeature(feature, allMaxImpact)]))
}
