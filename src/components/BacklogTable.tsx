import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { AssumptionFlag } from '../assumptionChecks'
import { finalPriority } from '../pmDecision'
import type { PmDecision } from '../pmDecision'
import { REACH_PERIOD, confidenceLabel, impactLabel } from '../riceOptions'
import { formatBreakdown, formatScore } from '../riceScoring'
import type { RankedItem } from '../riceScoring'
import type { Feature } from '../types'

interface BacklogTableProps {
  rankedFeatures: RankedItem<Feature>[] // already sorted in the order to show
  flagsById: Map<string, AssumptionFlag[]>
  decisions: Readonly<Record<string, PmDecision>>
  reviewId: string | null // the feature whose decision details are open
  onToggleReview: (id: string) => void
  renderReview: (entry: RankedItem<Feature>) => ReactNode
  editingId: string | null
  confirmDeleteId: string | null
  onEdit: (id: string) => void
  onAskDelete: (id: string | null) => void
  onDelete: (id: string) => void
}

const numberFormat = new Intl.NumberFormat('en-US')
const COLUMN_COUNT = 10

function FinalPriorityCell({
  decision,
  rank,
}: {
  decision: PmDecision | undefined
  rank: number | null
}) {
  const final = finalPriority(decision, rank)
  if (!decision || final === null) return <span className="muted">Not decided</span>
  return (
    <span>
      <span className="final-value">#{final}</span>
      <span className={decision.kind === 'manual' ? 'decision-tag tag-override' : 'decision-tag'}>
        {decision.kind === 'manual' ? 'Override' : 'Accepted'}
      </span>
    </span>
  )
}

export function BacklogTable({
  rankedFeatures,
  flagsById,
  decisions,
  reviewId,
  onToggleReview,
  renderReview,
  editingId,
  confirmDeleteId,
  onEdit,
  onAskDelete,
  onDelete,
}: BacklogTableProps) {
  if (rankedFeatures.length === 0) {
    return <p className="empty">Your backlog is empty. Add a feature to get started.</p>
  }

  return (
    <div className="table-wrap">
      <table className="backlog-table">
        <caption className="visually-hidden">
          Feature backlog with RICE score, suggested rank and final PM priority
        </caption>
        <thead>
          <tr>
            <th scope="col">Suggested rank</th>
            <th scope="col">ID</th>
            <th scope="col">Feature</th>
            <th scope="col">Reach</th>
            <th scope="col">Impact</th>
            <th scope="col">Confidence</th>
            <th scope="col">Effort</th>
            <th scope="col">RICE score</th>
            <th scope="col">Final PM priority</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rankedFeatures.map((entry) => {
            const { item: feature, result, rank } = entry
            const flags = flagsById.get(feature.id) ?? []
            const decision = decisions[feature.id]
            const isReviewing = reviewId === feature.id
            return (
              <Fragment key={feature.id}>
                <tr
                  className={
                    feature.id === editingId
                      ? 'row-editing'
                      : isReviewing
                        ? 'row-reviewing'
                        : undefined
                  }
                >
                  <td className="cell-rank">
                    {rank === null ? (
                      <span className="rank-badge rank-none" aria-label="Not ranked">
                        –
                      </span>
                    ) : (
                      <span className={rank === 1 ? 'rank-badge rank-top' : 'rank-badge'}>
                        <span className="visually-hidden">Rank </span>#{rank}
                      </span>
                    )}
                  </td>
                  <td className="cell-id">{feature.id}</td>
                  <td className="cell-feature">
                    <span className="feature-name">
                      {feature.name} <span className="badge">{feature.status}</span>
                    </span>
                    {feature.description && (
                      <span className="feature-description">{feature.description}</span>
                    )}
                    <span className="feature-note">
                      <strong>Evidence:</strong> {feature.evidenceNote}
                    </span>
                    {feature.dependencyNote && (
                      <span className="feature-note">
                        <strong>Dependency / override:</strong> {feature.dependencyNote}
                      </span>
                    )}
                    {decision?.kind === 'manual' && (
                      <span className="feature-note">
                        <strong>Override reason:</strong> {decision.reason}
                      </span>
                    )}
                    {flags.length > 0 && (
                      <button
                        type="button"
                        className="flag-chip"
                        aria-expanded={isReviewing}
                        onClick={() => onToggleReview(feature.id)}
                      >
                        {flags.length} {flags.length === 1 ? 'assumption' : 'assumptions'} to review
                      </button>
                    )}
                  </td>
                  <td data-label="Reach" className="cell-number">
                    <span>
                      {numberFormat.format(feature.reach)}
                      <span className="cell-unit">users {REACH_PERIOD}</span>
                    </span>
                  </td>
                  <td data-label="Impact">{impactLabel(feature.impact)}</td>
                  <td data-label="Confidence">{confidenceLabel(feature.confidence)}</td>
                  <td data-label="Effort" className="cell-number">
                    <span>
                      {feature.effort}
                      <span className="cell-unit">person-months</span>
                    </span>
                  </td>
                  <td data-label="RICE score" className="cell-score">
                    {result.ok ? (
                      <span>
                        <span className="score-value">{formatScore(result.score)}</span>
                        <span className="score-breakdown">{formatBreakdown(result)}</span>
                      </span>
                    ) : (
                      <span className="score-error">Can’t score: {result.reason}</span>
                    )}
                  </td>
                  <td data-label="Final PM priority" className="cell-final">
                    <FinalPriorityCell decision={decision} rank={rank} />
                  </td>
                  <td className="cell-actions">
                    {confirmDeleteId === feature.id ? (
                      <span className="confirm-delete" role="group" aria-label="Confirm delete">
                        <span className="confirm-text">Delete this feature?</span>
                        <button
                          type="button"
                          className="button-link danger"
                          onClick={() => onDelete(feature.id)}
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          className="button-link"
                          onClick={() => onAskDelete(null)}
                        >
                          Keep
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button-link"
                          aria-expanded={isReviewing}
                          aria-label={`${isReviewing ? 'Close decision for' : 'Decide on'} ${feature.name}`}
                          onClick={() => onToggleReview(feature.id)}
                        >
                          {isReviewing ? 'Close' : 'Decide'}
                        </button>
                        <button
                          type="button"
                          className="button-link"
                          aria-label={`Edit ${feature.name}`}
                          onClick={() => onEdit(feature.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-link danger"
                          aria-label={`Delete ${feature.name}`}
                          onClick={() => onAskDelete(feature.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {isReviewing && (
                  <tr className="row-details">
                    <td colSpan={COLUMN_COUNT}>{renderReview(entry)}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
