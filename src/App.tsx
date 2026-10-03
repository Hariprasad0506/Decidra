import { useState } from 'react'
import { BacklogSummary } from './components/BacklogSummary'
import { BacklogTable } from './components/BacklogTable'
import { RiceExplainer } from './components/RiceExplainer'
import { sampleFeatures } from './data/sampleFeatures'

function App() {
  // Phase 1 shows sample data only. Adding and saving features arrives in Phase 2.
  const features = sampleFeatures
  const [showAddNotice, setShowAddNotice] = useState(false)

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
            <button
              type="button"
              className="button-primary"
              aria-expanded={showAddNotice}
              aria-controls="add-feature-notice"
              onClick={() => setShowAddNotice((open) => !open)}
            >
              <span aria-hidden="true">+</span> Add Feature
            </button>
          </div>

          {showAddNotice && (
            <p id="add-feature-notice" className="notice" role="status">
              Adding your own features is coming in the next phase. For now, explore the GymBuddy
              samples below.
            </p>
          )}

          <BacklogSummary featureCount={features.length} />
          <BacklogTable features={features} />
        </section>
      </main>

      <footer className="site-footer muted">Decidra · Phase 1 preview</footer>
    </div>
  )
}

export default App
