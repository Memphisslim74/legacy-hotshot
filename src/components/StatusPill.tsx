export function StatusPill({ status }: { status: string }) {
  const className = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-pill status-pill--${className}`}>{status}</span>
}
