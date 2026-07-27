interface BrandSymbolProps {
  className?: string;
  label?: string;
}

/**
 * DRAWN's recognition device: four ranked cards with one pulled from the set.
 * It stays geometric and readable at favicon scale without relying on an SVG.
 */
export function BrandSymbol({
  className = "",
  label,
}: BrandSymbolProps) {
  return (
    <span
      className={`drawn-symbol ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function BrandLockup() {
  return (
    <span className="drawn-lockup">
      <BrandSymbol />
      <span className="drawn-wordmark">
        <strong>Drawn</strong>
        <small>Drawn from the best.</small>
      </span>
    </span>
  );
}
