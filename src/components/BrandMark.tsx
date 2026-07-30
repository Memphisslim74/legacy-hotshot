type BrandMarkProps = {
  compact?: boolean
  inverse?: boolean
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''} ${inverse ? 'brand-mark--inverse' : ''}`}>
      <img
        className="brand-mark__logo"
        src="/legacy-hotshot-logo.svg"
        alt="Legacy Hotshot, LLC"
      />
      {!compact && <span className="brand-mark__product">Command Center</span>}
    </div>
  )
}
