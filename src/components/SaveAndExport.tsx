import { useState } from 'react'

interface SaveAndExportProps {
  saveWarning: string // empty when saving works
  summary: string
  featureCount: number
  onExportCsv: () => void
  onReset: () => void
}

// The "Save and share" card: save status, CSV export, stakeholder summary and the demo-data reset.
export function SaveAndExport({
  saveWarning,
  summary,
  featureCount,
  onExportCsv,
  onReset,
}: SaveAndExportProps) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopyMessage('Summary copied.')
    } catch {
      setCopyMessage('Copying is blocked here. Select the text above and copy it instead.')
    }
  }

  return (
    <section className="card share" aria-labelledby="share-heading">
      <div className="backlog-header">
        <div>
          <p className="eyebrow">Save and share</p>
          <h2 id="share-heading">Results</h2>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={onExportCsv}
          disabled={featureCount === 0}
        >
          Export CSV
        </button>
      </div>

      {saveWarning ? (
        <p className="gentle-note" role="alert">
          {saveWarning}
        </p>
      ) : (
        <p className="muted save-status" role="status">
          Your backlog and decisions are saved in this browser automatically. They stay on this
          device only.
        </p>
      )}

      <h3 className="share-subheading">Stakeholder summary</h3>
      <p className="muted hint">Written from fixed rules using the saved results, so it never changes unless the backlog does.</p>
      <pre className="summary-text" aria-label="Stakeholder summary">{summary}</pre>
      <div className="share-actions">
        <button type="button" className="button-secondary" onClick={copySummary}>
          Copy summary
        </button>
        <span className="muted copy-message" role="status">
          {copyMessage}
        </span>
      </div>

      <div className="reset-area">
        {confirmingReset ? (
          <div className="confirm-delete" role="alertdialog" aria-label="Confirm reset">
            <p className="confirm-text">
              Replace the whole backlog and every PM decision with the GymBuddy demo data? This
              cannot be undone, so export a CSV first if you want a copy.
            </p>
            <button
              type="button"
              className="button-link danger"
              onClick={() => {
                setConfirmingReset(false)
                setCopyMessage('')
                onReset()
              }}
            >
              Yes, reset
            </button>
            <button type="button" className="button-link" onClick={() => setConfirmingReset(false)}>
              Keep my data
            </button>
          </div>
        ) : (
          <button type="button" className="button-link danger" onClick={() => setConfirmingReset(true)}>
            Reset Demo Data
          </button>
        )}
      </div>
    </section>
  )
}
