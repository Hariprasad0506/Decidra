import type { Feature } from '../types'

interface BacklogTableProps {
  features: Feature[]
}

export function BacklogTable({ features }: BacklogTableProps) {
  if (features.length === 0) {
    return <p className="empty">Your backlog is empty. Add a feature to get started.</p>
  }

  return (
    <div className="table-wrap">
      <table className="backlog-table">
        <caption className="visually-hidden">Feature backlog</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Feature</th>
            <th scope="col">Status</th>
            <th scope="col">RICE score</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={feature.id}>
              <td className="cell-index">{index + 1}</td>
              <td>
                <span className="feature-name">{feature.name}</span>
                <span className="feature-description">{feature.description}</span>
              </td>
              <td data-label="Status">
                <span className="badge">{feature.status}</span>
              </td>
              <td className="cell-score" data-label="RICE score">Not scored yet</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
