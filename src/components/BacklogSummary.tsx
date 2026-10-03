interface BacklogSummaryProps {
  featureCount: number
}

export function BacklogSummary({ featureCount }: BacklogSummaryProps) {
  const label = featureCount === 1 ? 'feature' : 'features'

  return (
    <section className="summary" aria-label="Backlog summary">
      <div className="summary-item">
        <span className="summary-value">{featureCount}</span>
        <span className="summary-label">{label} in backlog</span>
      </div>
      <div className="summary-item">
        <span className="summary-value">0</span>
        <span className="summary-label">scored with RICE</span>
      </div>
    </section>
  )
}
