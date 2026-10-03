import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AssumptionFlag } from '../assumptionChecks'
import { REASON_MAX, finalPriority, validateManualPriority } from '../pmDecision'
import type { ManualPriorityErrors, PmDecision } from '../pmDecision'
import { formatBreakdown, formatScore } from '../riceScoring'
import type { RankedItem } from '../riceScoring'
import { describeScenario } from '../sensitivity'
import type { ConfidenceScenario } from '../sensitivity'
import type { Feature } from '../types'

interface FeatureInsightsProps {
  entry: RankedItem<Feature>
  featureCount: number
  flags: AssumptionFlag[]
  scenarios: ConfidenceScenario[]
  decision: PmDecision | undefined
  sharedWith: Feature[] // other features with the same final priority
  onDecide: (decision: PmDecision | undefined) => void
}

type Choice = 'accepted' | 'manual'

// Everything behind one feature's position: score, suggested rank, final PM priority,
// assumption flags, the override reason, what-if confidence scenarios and the decision controls.
export function FeatureInsights({
  entry,
  featureCount,
  flags,
  scenarios,
  decision,
  sharedWith,
  onDecide,
}: FeatureInsightsProps) {
  const { item: feature, result, rank } = entry
  const id = feature.id
  const [choice, setChoice] = useState<Choice>(
    decision?.kind ?? (rank === null ? 'manual' : 'accepted'),
  )
  const [priority, setPriority] = useState(
    decision?.kind === 'manual' ? String(decision.priority) : rank !== null ? String(rank) : '',
  )
  const [reason, setReason] = useState(decision?.kind === 'manual' ? decision.reason : '')
  const [errors, setErrors] = useState<ManualPriorityErrors>({})

  const final = finalPriority(decision, rank)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (choice === 'accepted') {
      setErrors({})
      onDecide({ kind: 'accepted' })
      return
    }
    const checked = validateManualPriority(priority, reason, featureCount)
    if (!checked.ok) {
      setErrors(checked.errors)
      return
    }
    setErrors({})
    onDecide(checked.decision)
  }

  function handleClear() {
    setChoice('accepted')
    setPriority(rank !== null ? String(rank) : '')
    setReason('')
    setErrors({})
    onDecide(undefined)
  }

  return (
    <div className="insights" aria-label={`Decision details for ${feature.name}`}>
      <dl className="explain-grid">
        <div className="explain-item">
          <dt>Calculated score</dt>
          <dd>
            {result.ok ? (
              <>
                <strong>{formatScore(result.score)}</strong>
                <span className="explain-sub">{formatBreakdown(result)}</span>
              </>
            ) : (
              <span>Can’t score: {result.reason}</span>
            )}
          </dd>
        </div>
        <div className="explain-item">
          <dt>Suggested rank</dt>
          <dd>
            <strong>{rank === null ? 'Not ranked' : `#${rank}`}</strong>
            <span className="explain-sub">From the RICE score only</span>
          </dd>
        </div>
        <div className="explain-item">
          <dt>Final PM priority</dt>
          <dd>
            <strong>{final === null ? 'Not decided yet' : `#${final}`}</strong>
            <span className="explain-sub">
              {decision === undefined
                ? 'Choose below'
                : decision.kind === 'accepted'
                  ? 'Accepted the suggested rank'
                  : 'Manual override'}
            </span>
          </dd>
        </div>
        <div className="explain-item">
          <dt>Assumption flags</dt>
          <dd>
            <strong>{flags.length}</strong>
            <span className="explain-sub">
              {flags.length === 0 ? 'Nothing to review' : 'Listed below'}
            </span>
          </dd>
        </div>
      </dl>

      {decision?.kind === 'manual' && (
        <p className="override-reason">
          <strong>Override reason:</strong> {decision.reason}
        </p>
      )}
      {final !== null && sharedWith.length > 0 && (
        <p className="gentle-note">
          Priority #{final} is also the final priority of{' '}
          {sharedWith.map((f) => `“${f.name}”`).join(', ')}. That is allowed; you may want to give
          each feature its own number.
        </p>
      )}

      <div className="insights-columns">
        <section aria-labelledby={`flags-${id}`}>
          <h4 id={`flags-${id}`}>Assumption checks</h4>
          {flags.length === 0 ? (
            <p className="muted small">No assumptions flagged for this feature.</p>
          ) : (
            <ul className="flag-list">
              {flags.map((flag) => (
                <li key={flag.kind} className="flag">
                  <strong>{flag.title}</strong>
                  <span>{flag.message}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">
            Flags are prompts to double-check, not mistakes. A flagged estimate can still be right.
          </p>
        </section>

        <section aria-labelledby={`whatif-${id}`}>
          <h4 id={`whatif-${id}`}>What if confidence changed?</h4>
          {scenarios.length === 0 ? (
            <p className="muted small">
              This feature needs a valid score before scenarios can be shown.
            </p>
          ) : (
            <ul className="scenario-list">
              {scenarios.map((s) => (
                <li key={s.toConfidence}>{describeScenario(s)}</li>
              ))}
            </ul>
          )}
          <p className="muted small">
            Only this feature’s confidence changes in each scenario. Nothing is saved.
          </p>
        </section>
      </div>

      <form className="decision-form" noValidate onSubmit={handleSubmit}>
        <fieldset>
          <legend>Your decision</legend>
          <label className="radio">
            <input
              type="radio"
              name={`choice-${id}`}
              value="accepted"
              checked={choice === 'accepted'}
              disabled={rank === null}
              onChange={() => setChoice('accepted')}
            />
            Accept the suggested rank {rank !== null && `(#${rank})`}
          </label>
          <label className="radio">
            <input
              type="radio"
              name={`choice-${id}`}
              value="manual"
              checked={choice === 'manual'}
              onChange={() => setChoice('manual')}
            />
            Set a manual priority
          </label>
        </fieldset>

        {choice === 'manual' && (
          <div className="decision-fields">
            <div className="field">
              <label htmlFor={`priority-${id}`}>Final priority</label>
              <input
                id={`priority-${id}`}
                className={errors.priority ? 'input invalid' : 'input'}
                type="text"
                inputMode="numeric"
                value={priority}
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={errors.priority ? `priority-${id}-error` : `priority-${id}-hint`}
                onChange={(e) => {
                  setPriority(e.target.value)
                  setErrors((current) => ({ ...current, priority: undefined }))
                }}
              />
              <p id={`priority-${id}-hint`} className="hint">
                1 means do first. Choose from 1 to {Math.max(1, featureCount)}.
              </p>
              {errors.priority && (
                <p id={`priority-${id}-error`} className="field-error">
                  {errors.priority}
                </p>
              )}
            </div>
            <div className="field field-grow">
              <label htmlFor={`reason-${id}`}>Reason for the override</label>
              <textarea
                id={`reason-${id}`}
                className={errors.reason ? 'input invalid' : 'input'}
                rows={2}
                maxLength={REASON_MAX + 50}
                value={reason}
                placeholder="e.g. Needed before the January partner launch"
                aria-invalid={Boolean(errors.reason)}
                aria-describedby={errors.reason ? `reason-${id}-error` : undefined}
                onChange={(e) => {
                  setReason(e.target.value)
                  setErrors((current) => ({ ...current, reason: undefined }))
                }}
              />
              {errors.reason && (
                <p id={`reason-${id}-error`} className="field-error">
                  {errors.reason}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="muted small">
          Your decision does not change the RICE score or the suggested rank. Both stay visible.
        </p>

        <div className="form-actions">
          {decision && (
            <button type="button" className="button-secondary" onClick={handleClear}>
              Clear decision
            </button>
          )}
          <button type="submit" className="button-primary">
            Save decision
          </button>
        </div>
      </form>
    </div>
  )
}
