type BrandMarkProps = {
  compact?: boolean
  inverse?: boolean
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''} ${inverse ? 'brand-mark--inverse' : ''}`}>
      <div className="brand-mark__badge" aria-hidden="true">
        <span className="brand-mark__wing brand-mark__wing--left" />
        <span className="brand-mark__letter">L</span>
        <span className="brand-mark__wing brand-mark__wing--right" />
      </div>
      {!compact && (
        <div className="brand-mark__copy">
          <strong>LEGACY HOTSHOT</strong>
          <span>COMMAND CENTER</span>
        </div>
      )}
    </div>
  )
}
