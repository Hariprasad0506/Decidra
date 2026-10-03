// The fixed choices for Impact and Confidence. Using a small list of allowed values
// (instead of any number) keeps every feature scored on the same scale.
export type ImpactValue = 3 | 2 | 1 | 0.5 | 0.25
export type ConfidenceValue = 100 | 80 | 50

// A single product idea in the backlog, with the four RICE inputs.
// The RICE score is not stored; it is calculated from these inputs in riceScoring.ts.
export interface Feature {
  id: string
  name: string
  description: string
  status: 'Idea' | 'Planned' | 'In progress'
  reach: number // users affected per quarter
  impact: ImpactValue
  confidence: ConfidenceValue // percent
  effort: number // total person-months
  evidenceNote: string
  dependencyNote: string // optional, empty when not used
}
