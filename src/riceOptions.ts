import type { ConfidenceValue, Feature, ImpactValue } from './types'

// Reach is always counted over the same time period so features are comparable.
export const REACH_PERIOD = 'per quarter'

export const IMPACT_OPTIONS: { value: ImpactValue; label: string }[] = [
  { value: 3, label: 'Massive' },
  { value: 2, label: 'High' },
  { value: 1, label: 'Medium' },
  { value: 0.5, label: 'Low' },
  { value: 0.25, label: 'Minimal' },
]

export const CONFIDENCE_OPTIONS: { value: ConfidenceValue; label: string }[] = [
  { value: 100, label: 'Strong evidence' },
  { value: 80, label: 'Some evidence' },
  { value: 50, label: 'Weak evidence' },
]

export const STATUS_OPTIONS: Feature['status'][] = ['Idea', 'Planned', 'In progress']

export function impactLabel(value: ImpactValue): string {
  const option = IMPACT_OPTIONS.find((o) => o.value === value)
  return option ? `${value} · ${option.label}` : String(value)
}

export function confidenceLabel(value: ConfidenceValue): string {
  const option = CONFIDENCE_OPTIONS.find((o) => o.value === value)
  return option ? `${value}% · ${option.label}` : `${value}%`
}
