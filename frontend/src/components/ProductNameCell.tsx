import type { ReactNode } from 'react'

type ProductNameCellProps = {
  imageUrl?: unknown
  name: ReactNode
  thumbnailAlt?: string
}

function getImageUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getFallbackAlt(name: ReactNode): string {
  return typeof name === 'string' && name.trim() !== ''
    ? `${name.trim()} thumbnail`
    : 'Product thumbnail'
}

export function ProductNameCell({
  imageUrl,
  name,
  thumbnailAlt,
}: ProductNameCellProps) {
  const resolvedImageUrl = getImageUrl(imageUrl)

  return (
    <span className="product-name-cell">
      {resolvedImageUrl ? (
        <img
          alt={thumbnailAlt ?? getFallbackAlt(name)}
          className="product-thumbnail"
          loading="lazy"
          src={resolvedImageUrl}
        />
      ) : null}
      <span className="product-name-text">{name}</span>
    </span>
  )
}
