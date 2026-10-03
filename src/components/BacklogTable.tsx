import { REACH_PERIOD, confidenceLabel, impactLabel } from '../riceOptions'
import type { Feature } from '../types'

interface BacklogTableProps {
  features: Feature[]
  editingId: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const numberFormat = new Intl.NumberFormat('en-US')

export function BacklogTable({ features, editingId, onEdit, onDelete }: BacklogTableProps) {
  if (features.length === 0) {
    return <p className="empty">Your backlog is empty. Add a feature to get started.</p>
  }

  return (
    <div className="table-wrap">
      <table className="backlog-table">
        <caption className="visually-hidden">Feature backlog</caption>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Feature</th>
            <th scope="col">Reach</th>
            <th scope="col">Impact</th>
            <th scope="col">Confidence</th>
            <th scope="col">Effort</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.id} className={feature.id === editingId ? 'row-editing' : undefined}>
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
              <td className="cell-actions">
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
                  onClick={() => onDelete(feature.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
