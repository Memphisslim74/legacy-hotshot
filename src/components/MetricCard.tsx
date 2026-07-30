type MetricCardProps = {
  label: string
  value: string
  note: string
  trend: string
}

export function MetricCard({ label, value, note, trend }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={`metric-card__note metric-card__note--${trend}`}>{note}</small>
    </article>
  )
}
