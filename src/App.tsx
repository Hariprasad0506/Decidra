import { useState } from 'react'
import { BacklogSummary } from './components/BacklogSummary'
import { BacklogTable } from './components/BacklogTable'
import { FeatureForm } from './components/FeatureForm'
import { RiceExplainer } from './components/RiceExplainer'
import { sampleFeatures } from './data/sampleFeatures'
import { emptyFormValues, featureToFormValues, formatFeatureId } from './featureValidation'
import type { Feature } from './types'

// Which form is open: none, a blank "add" form, or an "edit" form for one feature.
type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; id: string }

function App() {
  // The feature list lives in React state for now. It resets when the page reloads;
  // saving in the browser arrives in a later phase.
  const [features, setFeatures] = useState<Feature[]>(sampleFeatures)
  // Running counter for new IDs, so a deleted feature's ID is never handed out again.
  const [nextIdNumber, setNextIdNumber] = useState(sampleFeatures.length + 1)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [message, setMessage] = useState('')

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

  function handleDelete(id: string) {
    const feature = features.find((f) => f.id === id)
    if (!feature) return
    const confirmed = window.confirm(`Delete “${feature.name}”? This cannot be undone.`)
    if (!confirmed) return
    setFeatures((current) => current.filter((f) => f.id !== id))
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

          <BacklogSummary featureCount={features.length} />
          <BacklogTable
            features={features}
            editingId={editingFeature?.id ?? null}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        </section>
      </main>

      <footer className="site-footer muted">Decidra · Phase 2 preview</footer>
    </div>
  )
}

export default App
