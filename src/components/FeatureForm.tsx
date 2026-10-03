import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { validateFeatureForm } from '../featureValidation'
import type { FeatureFormErrors, FeatureFormValues } from '../featureValidation'
import { CONFIDENCE_OPTIONS, IMPACT_OPTIONS, REACH_PERIOD, STATUS_OPTIONS } from '../riceOptions'
import type { Feature } from '../types'

interface FeatureFormProps {
  mode: 'add' | 'edit'
  featureId: string
  initialValues: FeatureFormValues
  onSave: (feature: Omit<Feature, 'id'>) => void
  onCancel: () => void
}

// Order used to move the cursor to the first problem after a failed save.
const fieldOrder: (keyof FeatureFormValues)[] = [
  'name',
  'description',
  'status',
  'reach',
  'impact',
  'confidence',
  'effort',
  'evidenceNote',
  'dependencyNote',
]

export function FeatureForm({ mode, featureId, initialValues, onSave, onCancel }: FeatureFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FeatureFormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  // Put the cursor in the name field when the form opens.
  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>('#feature-name')?.focus()
  }, [])

  function update(field: keyof FeatureFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // Clear a field's message as soon as the user starts fixing it.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateFeatureForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      const firstInvalid = fieldOrder.find((field) => result.errors[field])
      if (firstInvalid) {
        formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      }
      return
    }
    onSave(result.feature)
  }

  // Shared accessibility wiring so screen readers announce each field's error.
  function fieldProps(field: keyof FeatureFormValues) {
    const hasError = Boolean(errors[field])
    return {
      id: `feature-${field}`,
      name: field,
      value: values[field],
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `feature-${field}-error` : undefined,
      className: hasError ? 'input invalid' : 'input',
    }
  }

  function errorFor(field: keyof FeatureFormValues) {
    return errors[field] ? (
      <p id={`feature-${field}-error`} className="field-error">
        {errors[field]}
      </p>
    ) : null
  }

  const title = mode === 'add' ? 'Add a feature' : 'Edit feature'

  return (
    <form
      ref={formRef}
      className="feature-form"
      aria-labelledby="feature-form-title"
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <div className="form-title-row">
        <h3 id="feature-form-title">{title}</h3>
        <span className="feature-id">ID {featureId}</span>
      </div>

      <div className="form-grid">
        <div className="field field-wide">
          <label htmlFor="feature-name">Feature name</label>
          <input
            {...fieldProps('name')}
            type="text"
            placeholder="e.g. Class booking calendar"
            onChange={(e) => update('name', e.target.value)}
          />
          {errorFor('name')}
        </div>

        <div className="field field-wide">
          <label htmlFor="feature-description">
            Short description <span className="optional">(optional)</span>
          </label>
          <input
            {...fieldProps('description')}
            type="text"
            placeholder="One sentence on what it does and who it helps"
            onChange={(e) => update('description', e.target.value)}
          />
          {errorFor('description')}
        </div>

        <div className="field">
          <label htmlFor="feature-status">Status</label>
          <select {...fieldProps('status')} onChange={(e) => update('status', e.target.value)}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="feature-reach">Reach</label>
          <div className="input-with-unit">
            <input
              {...fieldProps('reach')}
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1500"
              onChange={(e) => update('reach', e.target.value)}
            />
            <span className="unit">users {REACH_PERIOD}</span>
          </div>
          <p className="hint">How many users this affects in one quarter (3 months).</p>
          {errorFor('reach')}
        </div>

        <div className="field">
          <label htmlFor="feature-impact">Impact</label>
          <select {...fieldProps('impact')} onChange={(e) => update('impact', e.target.value)}>
            <option value="">Choose impact…</option>
            {IMPACT_OPTIONS.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.value} = {option.label}
              </option>
            ))}
          </select>
          <p className="hint">How much it helps each user who sees it.</p>
          {errorFor('impact')}
        </div>

        <div className="field">
          <label htmlFor="feature-confidence">Confidence</label>
          <select
            {...fieldProps('confidence')}
            onChange={(e) => update('confidence', e.target.value)}
          >
            <option value="">Choose confidence…</option>
            {CONFIDENCE_OPTIONS.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.value}% = {option.label}
              </option>
            ))}
          </select>
          <p className="hint">How sure you are about reach and impact.</p>
          {errorFor('confidence')}
        </div>

        <div className="field">
          <label htmlFor="feature-effort">Effort</label>
          <div className="input-with-unit">
            <input
              {...fieldProps('effort')}
              type="text"
              inputMode="decimal"
              placeholder="e.g. 2.5"
              onChange={(e) => update('effort', e.target.value)}
            />
            <span className="unit">person-months</span>
          </div>
          <p className="hint">Total team time. Decimals are fine, like 0.5.</p>
          {errorFor('effort')}
        </div>

        <div className="field field-wide">
          <label htmlFor="feature-evidenceNote">Evidence or assumption</label>
          <textarea
            {...fieldProps('evidenceNote')}
            rows={2}
            placeholder="What supports these numbers? If unproven, start with “Assumption:”"
            onChange={(e) => update('evidenceNote', e.target.value)}
          />
          {errorFor('evidenceNote')}
        </div>

        <div className="field field-wide">
          <label htmlFor="feature-dependencyNote">
            Dependency or strategic override <span className="optional">(optional)</span>
          </label>
          <textarea
            {...fieldProps('dependencyNote')}
            rows={2}
            placeholder="e.g. Needs the new login first, or leadership has made this a must-do"
            onChange={(e) => update('dependencyNote', e.target.value)}
          />
          {errorFor('dependencyNote')}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button-primary">
          {mode === 'add' ? 'Add feature' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
