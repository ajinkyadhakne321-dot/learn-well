type PageHeaderProps = { eyebrow: string; title: string; description: string }

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="feature-page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1}>{title}</h1>
      <p className="feature-intro">{description}</p>
    </header>
  )
}