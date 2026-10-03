import { CONFIDENCE_OPTIONS, IMPACT_OPTIONS } from './riceOptions'
import type { ConfidenceValue, Feature, ImpactValue } from './types'

// What the form holds while the user is typing. Everything is text until it is checked.
export interface FeatureFormValues {
  name: string
  description: string
  status: Feature['status']
  reach: string
  impact: string
  confidence: string
  effort: string
  evidenceNote: string
  dependencyNote: string
}

export type FeatureFormErrors = Partial<Record<keyof FeatureFormValues, string>>

export const NAME_MAX = 80
export const DESCRIPTION_MAX = 200
export const NOTE_MAX = 300
const EFFORT_MAX = 1000

export const emptyFormValues: FeatureFormValues = {
  name: '',
  description: '',
  status: 'Idea',
  reach: '',
  impact: '',
  confidence: '',
  effort: '',
  evidenceNote: '',
  dependencyNote: '',
}

export function featureToFormValues(feature: Feature): FeatureFormValues {
  return {
    name: feature.name,
    description: feature.description,
    status: feature.status,
    reach: String(feature.reach),
    impact: String(feature.impact),
    confidence: String(feature.confidence),
    effort: String(feature.effort),
    evidenceNote: feature.evidenceNote,
    dependencyNote: feature.dependencyNote,
  }
}

function checkReach(raw: string): string | undefined {
  const text = raw.trim()
  if (text === '') return 'Enter how many users this reaches per quarter. Use 0 if none.'
  if (/^-\s*\d/.test(text)) return 'Reach cannot be negative.'
  if (/^\d{1,3}(,\d{3})+$/.test(text)) return 'Type the number without commas, like 1500.'
  if (/^\d+\.\d+$/.test(text)) return 'Reach must be a whole number of users, like 1500.'
  if (!/^\d+$/.test(text)) return 'Reach must be a number, like 1500. Use digits only.'
  if (!Number.isSafeInteger(Number(text))) return 'That number is too large.'
  return undefined
}

function checkEffort(raw: string): string | undefined {
  const text = raw.trim()
  if (text === '') return 'Enter the total effort in person-months, like 2 or 0.5.'
  if (/^-\s*\d/.test(text)) return 'Effort cannot be negative.'
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(text)) return 'Effort must be a number, like 2 or 0.5.'
  const value = Number(text)
  if (value <= 0) return 'Effort must be greater than zero. Even small work takes some time.'
  if (value > EFFORT_MAX) return `Effort must be ${EFFORT_MAX} person-months or less.`
  return undefined
}

function checkMaxLength(text: string, max: number): string | undefined {
  return text.trim().length > max ? `Keep this under ${max} characters.` : undefined
}

// Checks the form. Returns either the errors to show, or a clean feature ready to save.
export function validateFeatureForm(
  values: FeatureFormValues,
): { ok: true; feature: Omit<Feature, 'id'> } | { ok: false; errors: FeatureFormErrors } {
  const errors: FeatureFormErrors = {}

  if (values.name.trim() === '') errors.name = 'Give the feature a name.'
  else errors.name = checkMaxLength(values.name, NAME_MAX)

  errors.description = checkMaxLength(values.description, DESCRIPTION_MAX)
  errors.reach = checkReach(values.reach)
  errors.effort = checkEffort(values.effort)

  const impact = IMPACT_OPTIONS.find((o) => String(o.value) === values.impact)
  if (!impact) errors.impact = 'Choose an impact level.'

  const confidence = CONFIDENCE_OPTIONS.find((o) => String(o.value) === values.confidence)
  if (!confidence) errors.confidence = 'Choose a confidence level.'

  if (values.evidenceNote.trim() === '') {
    errors.evidenceNote = 'Add the evidence behind your estimates, or note that it is an assumption.'
  } else {
    errors.evidenceNote = checkMaxLength(values.evidenceNote, NOTE_MAX)
  }
  errors.dependencyNote = checkMaxLength(values.dependencyNote, NOTE_MAX)

  // Drop the fields that passed, so only real problems remain.
  for (const key of Object.keys(errors) as (keyof FeatureFormValues)[]) {
    if (errors[key] === undefined) delete errors[key]
  }

  if (Object.keys(errors).length > 0 || !impact || !confidence) return { ok: false, errors }

  return {
    ok: true,
    feature: {
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
      reach: Number(values.reach.trim()),
      impact: impact.value as ImpactValue,
      confidence: confidence.value as ConfidenceValue,
      effort: Number(values.effort.trim()),
      evidenceNote: values.evidenceNote.trim(),
      dependencyNote: values.dependencyNote.trim(),
    },
  }
}

// Turns a running number into a readable ID like F-004.
export function formatFeatureId(n: number): string {
  return `F-${String(n).padStart(3, '0')}`
}
