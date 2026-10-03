import { useEffect, useRef, useState } from 'react'
import { BacklogSummary } from './components/BacklogSummary'
import { BacklogTable } from './components/BacklogTable'
import { FeatureForm } from './components/FeatureForm'
import { FeatureInsights } from './components/FeatureInsights'
import { RiceExplainer } from './components/RiceExplainer'
import { SaveAndExport } from './components/SaveAndExport'
import { sampleFeatures } from './data/sampleFeatures'
import { rankByRice } from './riceScoring'
import type { RankedItem } from './riceScoring'
import { checkBacklog, everyFeatureHasMaxImpact } from './assumptionChecks'
import { capManualPriorities, finalPriority, orderByFinalPriority, samePriorityAs } from './pmDecision'
import type { PmDecision } from './pmDecision'
import { confidenceSensitivity } from './sensitivity'
import { emptyFormValues, featureToFormValues, formatFeatureId } from './featureValidation'
import { browserStorage, loadState, saveState } from './storage'
import type { LoadResult } from './storage'
import { buildCsv, csvFileName, downloadCsv } from './csvExport'
import { buildStakeholderSummary } from './stakeholderSummary'
import type { Feature } from './types'

// Which form is open: none, a blank "add" form, or an "edit" form for one feature.
type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; id: string }
type SortMode = 'suggested' | 'final'

// Reads the saved backlog once, when the page first loads.
function readInitialState(): { loaded: LoadResult; features: Feature[]; decisions: Record<string, PmDecision>; nextIdNumber: number } {
  const loaded = loadState(browserStorage())
  if (loaded.status === 'restored') return { loaded, ...loaded.state }
  // Nothing saved (or it could not be read): start from the GymBuddy sample data.
  return { loaded, features: sampleFeatures, decisions: {}, nextIdNumber: sampleFeatures.length + 1 }
}

function startupMessage(loaded: LoadResult): string {
  if (loaded.status === 'unreadable') return loaded.message
  if (loaded.status === 'restored' && loaded.skipped > 0) {
    return `Restored your saved backlog. ${loaded.skipped} saved ${loaded.skipped === 1 ? 'feature was' : 'features were'} damaged and left out.`
  }
  return ''
}

function App() {
  const [initial] = useState(readInitialState)
  // The feature list and decisions are saved in this browser whenever they change (see below).
  const [features, setFeatures] = useState<Feature[]>(initial.features)
  // Running counter for new IDs, so a deleted feature's ID is never handed out again.
  const [nextIdNumber, setNextIdNumber] = useState(initial.nextIdNumber)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [message, setMessage] = useState(() => startupMessage(initial.loaded))
  // The feature waiting for the user to confirm deletion, if any.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // The PM's decisions, kept apart from the features so the RICE inputs are never changed by them.
  const [decisions, setDecisions] = useState<Record<string, PmDecision>>(initial.decisions)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('suggested')
  const [saveWarning, setSaveWarning] = useState(() =>
    browserStorage() ? '' : 'This browser is blocking saved data, so changes will be lost on reload.',
  )

  // Save whenever the backlog or decisions change. The first run is skipped while nothing has
  // changed yet, so simply opening the page never overwrites what is saved.
  const loadedRef = useRef(initial)
  useEffect(() => {
    const start = loadedRef.current
    if (
      features === start.features &&
      decisions === start.decisions &&
      nextIdNumber === start.nextIdNumber
    ) {
      return
    }
    const result = saveState(browserStorage(), { features, decisions, nextIdNumber })
    setSaveWarning(result.ok ? '' : result.message)
  }, [features, decisions, nextIdNumber])

  // Scores and ranks are worked out fresh from the list on every change, so they are never stale.
  const rankedFeatures = rankByRice(features)
  const scoredCount = rankedFeatures.filter((entry) => entry.rank !== null).length
  const topFeature = rankedFeatures[0]?.rank === 1 ? rankedFeatures[0].item : null
  const flagsById = checkBacklog(features)
  const flagCount = [...flagsById.values()].reduce((total, flags) => total + flags.length, 0)
  const decidedCount = rankedFeatures.filter(
    ({ item, rank }) => finalPriority(decisions[item.id], rank) !== null,
  ).length
  const shownFeatures =
    sortMode === 'final' ? orderByFinalPriority(rankedFeatures, decisions) : rankedFeatures

  const editingFeature =
    form.mode === 'edit' ? features.find((feature) => feature.id === form.id) : undefined

  function openAddForm() {
    setMessage('')
    setForm({ mode: 'add' })
  }

  function openEditForm(id: string) {
    setMessage('')
    setForm({ mode: 'edit', id })
    document.getElementById('backlog-heading')?.scrollIntoView({ behavior: 'smooth' })
  }

  function closeForm() {
    setForm({ mode: 'closed' })
  }

  function handleSave(details: Omit<Feature, 'id'>) {
    if (form.mode === 'add') {
      const id = formatFeatureId(nextIdNumber)
      setFeatures((current) => [...current, { id, ...details }])
      setNextIdNumber((n) => n + 1)
      setMessage(`Added “${details.name}” as ${id}.`)
    } else if (form.mode === 'edit') {
      const id = form.id
      setFeatures((current) =>
        current.map((feature) => (feature.id === id ? { id, ...details } : feature)),
      )
      setMessage(`Saved changes to “${details.name}”.`)
    }
    closeForm()
  }

  function toggleReview(id: string) {
    setReviewId((current) => (current === id ? null : id))
  }

  function handleDecide(id: string, decision: PmDecision | undefined) {
    const feature = features.find((f) => f.id === id)
    setDecisions((current) => {
      const next = { ...current }
      if (decision) next[id] = decision
      else delete next[id]
      return next
    })
    if (!feature) return
    if (!decision) setMessage(`Cleared the decision for “${feature.name}”.`)
    else if (decision.kind === 'accepted') setMessage(`Accepted the suggested rank for “${feature.name}”.`)
    else setMessage(`Set “${feature.name}” to final priority #${decision.priority}.`)
  }

  function renderReview(entry: RankedItem<Feature>) {
    const id = entry.item.id
    const decision = decisions[id]
    const final = finalPriority(decision, entry.rank)
    return (
      <FeatureInsights
        key={id}
        entry={entry}
        featureCount={features.length}
        flags={flagsById.get(id) ?? []}
        scenarios={confidenceSensitivity(features, id)}
        decision={decision}
        sharedWith={final === null ? [] : samePriorityAs(rankedFeatures, decisions, id, final)}
        onDecide={(next) => handleDecide(id, next)}
      />
    )
  }

  function handleExportCsv() {
    const ok = downloadCsv(buildCsv(features, decisions), csvFileName(new Date()))
    setMessage(
      ok
        ? 'Exported the backlog as a CSV file. Check your downloads. If no file appears, this page is blocking downloads, so open the app in a normal browser tab.'
        : 'The browser would not start the download. Try again in a normal browser tab.',
    )
  }

  function handleReset() {
    // Fresh copies, so the change is always saved, even when the page started with the demo data.
    setFeatures([...sampleFeatures])
    setDecisions({})
    setNextIdNumber(sampleFeatures.length + 1)
    setForm({ mode: 'closed' })
    setConfirmDeleteId(null)
    setReviewId(null)
    setSortMode('suggested')
    setMessage('Reset to the GymBuddy demo data.')
    document.getElementById('backlog-heading')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleDelete(id: string) {
    const feature = features.find((f) => f.id === id)
    setConfirmDeleteId(null)
    if (!feature) return
    setFeatures((current) => current.filter((f) => f.id !== id))
    setDecisions((current) => {
      const next = { ...current }
      delete next[id]
      // Same rule as when the backlog is reloaded, so a reload never changes a decision.
      return capManualPriorities(next, features.length - 1)
    })
    if (reviewId === id) setReviewId(null)
    if (form.mode === 'edit' && form.id === id) closeForm()
    setMessage(`Deleted “${feature.name}”.`)
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">Decidra</span>
        </div>
        <span className="project-pill">Project: GymBuddy</span>
      </header>

      <main className="content">
        <section className="hero" aria-labelledby="app-title">
          <h1 id="app-title">Decidra</h1>
          <p className="tagline">From possibilities to priorities.</p>
          <p className="hero-text muted">
            A calm, focused workspace for Product Managers to turn a long list of ideas into a
            clear, defensible order of what to build next.
          </p>
        </section>

        <RiceExplainer />

        <section className="card backlog" aria-labelledby="backlog-heading">
          <div className="backlog-header">
            <div>
              <p className="eyebrow">GymBuddy</p>
              <h2 id="backlog-heading">Feature backlog</h2>
            </div>
            {form.mode !== 'add' && (
              <button type="button" className="button-primary" onClick={openAddForm}>
                <span aria-hidden="true">+</span> Add Feature
              </button>
            )}
          </div>

          <p className="notice" role="status" hidden={message === ''}>
            {message}
          </p>

          {form.mode === 'add' && (
            <FeatureForm
              key="add"
              mode="add"
              featureId={formatFeatureId(nextIdNumber)}
              initialValues={emptyFormValues}
              onSave={handleSave}
              onCancel={closeForm}
            />
          )}

          {editingFeature && (
            <FeatureForm
              key={editingFeature.id}
              mode="edit"
              featureId={editingFeature.id}
              initialValues={featureToFormValues(editingFeature)}
              onSave={handleSave}
              onCancel={closeForm}
            />
          )}

          <BacklogSummary
            featureCount={features.length}
            scoredCount={scoredCount}
            topFeatureName={topFeature?.name ?? null}
            flagCount={flagCount}
            decidedCount={decidedCount}
          />
          {everyFeatureHasMaxImpact(features) && (
            <p className="gentle-note">
              Every feature is rated 3 (Massive) impact, so impact is not helping to tell them apart.
              It may be worth checking whether some are closer to High or Medium.
            </p>
          )}
          {features.length > 0 && (
            <div className="sort-toggle" role="group" aria-label="Order the backlog by">
              <span className="sort-label">Order by</span>
              <button
                type="button"
                className={sortMode === 'suggested' ? 'toggle active' : 'toggle'}
                aria-pressed={sortMode === 'suggested'}
                onClick={() => setSortMode('suggested')}
              >
                Suggested rank
              </button>
              <button
                type="button"
                className={sortMode === 'final' ? 'toggle active' : 'toggle'}
                aria-pressed={sortMode === 'final'}
                onClick={() => setSortMode('final')}
              >
                Final PM priority
              </button>
            </div>
          )}
          <BacklogTable
            rankedFeatures={shownFeatures}
            flagsById={flagsById}
            decisions={decisions}
            reviewId={reviewId}
            onToggleReview={toggleReview}
            renderReview={renderReview}
            editingId={editingFeature?.id ?? null}
            onEdit={openEditForm}
            confirmDeleteId={confirmDeleteId}
            onAskDelete={setConfirmDeleteId}
            onDelete={handleDelete}
          />
        </section>

        <SaveAndExport
          saveWarning={saveWarning}
          summary={buildStakeholderSummary(features, decisions)}
          featureCount={features.length}
          onExportCsv={handleExportCsv}
          onReset={handleReset}
        />
      </main>

      <footer className="site-footer muted">Decidra · Phase 5 preview</footer>
    </div>
  )
}

export default App
