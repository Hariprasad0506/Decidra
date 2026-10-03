interface BacklogSummaryProps {
  featureCount: number
  scoredCount: number
  topFeatureName: string | null
  flagCount: number
  decidedCount: number
}

export function BacklogSummary({
  featureCount,
  scoredCount,
  topFeatureName,
  flagCount,
  decidedCount,
}: BacklogSummaryProps) {
  const label = featureCount === 1 ? 'feature' : 'features'

  return (
    <section className="summary" aria-label="Backlog summary">
      <div className="summary-item">
        <span className="summary-value">{featureCount}</span>
        <span className="summary-label">{label} in backlog</span>
      </div>
      <div className="summary-item">
        <span className="summary-value">{scoredCount}</span>
        <span className="summary-label">scored with RICE</span>
      </div>
      <div className="summary-item">
        <span className="summary-value">{flagCount}</span>
        <span className="summary-label">
          {flagCount === 1 ? 'assumption' : 'assumptions'} to review
        </span>
      </div>
      <div className="summary-item">
        <span className="summary-value">{decidedCount}</span>
        <span className="summary-label">with a final PM priority</span>
      </div>
      {topFeatureName && (
        <div className="summary-item">
          <span className="summary-label">Suggested first:</span>
          <span className="summary-top">{topFeatureName}</span>
        </div>
      )}
    </section>
  )
}
