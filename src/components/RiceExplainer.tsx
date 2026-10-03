const factors = [
  { letter: 'R', name: 'Reach', text: 'How many people will this affect in a given period?' },
  { letter: 'I', name: 'Impact', text: 'How much will it move the needle for each person?' },
  { letter: 'C', name: 'Confidence', text: 'How sure are we about the reach and impact estimates?' },
  { letter: 'E', name: 'Effort', text: 'How much team time will it take to build?' },
]

export function RiceExplainer() {
  return (
    <section className="card rice" aria-labelledby="rice-heading">
      <div className="rice-intro">
        <p className="eyebrow">The method</p>
        <h2 id="rice-heading">How RICE works</h2>
        <p className="muted">
          RICE is a simple way to compare ideas fairly. Each feature is judged on four factors,
          and the result is a single score. A higher score means more value for the effort.
        </p>
        <p className="formula" aria-label="RICE score equals Reach times Impact times Confidence, divided by Effort">
          <span>Reach × Impact × Confidence</span>
          <span className="formula-divider" aria-hidden="true" />
          <span>Effort</span>
        </p>
        <p className="formula-example muted">
          Confidence is used as a decimal, so 80% becomes 0.8. Example: 1,000 users × 2 impact ×
          0.8 confidence ÷ 2 person-months = <strong>800</strong>.
        </p>
      </div>
      <dl className="rice-grid">
        {factors.map((factor) => (
          <div className="rice-factor" key={factor.name}>
            <dt>
              <span className="rice-letter" aria-hidden="true">{factor.letter}</span>
              {factor.name}
            </dt>
            <dd>{factor.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
