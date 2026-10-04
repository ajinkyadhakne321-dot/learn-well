import { CircleHelp } from 'lucide-react'

export type FeaturePageContent = {
  title: string
  eyebrow: string
  description: string
  items: { title: string; detail: string; meta: string }[]
}

type FeaturePageProps = { page: FeaturePageContent }

export function FeaturePage({ page }: FeaturePageProps) {
  const isHelp = page.title === 'Help'

  return (
    <div className="feature-page">
      <p className="eyebrow">{page.eyebrow}</p>
      <div className="feature-header">
        <div>
          <h1>{page.title}</h1>
          <p className="description">{page.description}</p>
        </div>
      </div>

      {isHelp && (
        <div className="notice-block">
          <CircleHelp size={20} aria-hidden="true" />
          <p>For this prototype, support details are examples and do not send a message.</p>
        </div>
      )}

      <section className="feature-section" aria-labelledby="feature-items-heading">
        <div className="feature-section-heading">
          <h2 id="feature-items-heading">
            {page.title === 'Accessibility Settings' ? 'Current settings' : 'In this section'}
          </h2>
          <span className="sample-label">SAMPLE CONTENT</span>
        </div>

        <div className="feature-grid">
          {page.items.map((item) => (
            <article key={item.title} className="feature-item">
              <span className="feature-item-meta">{item.meta}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <span className="feature-item-status">Available in workspace</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
