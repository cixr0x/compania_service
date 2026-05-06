const moneyFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export function parseMoneyNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.replaceAll(',', '').trim()
  if (normalizedValue === '') {
    return null
  }

  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = parseMoneyNumber(value)
  return numericValue === null
    ? String(value)
    : moneyFormatter.format(numericValue)
}

export function formatCurrency(value: unknown): string {
  const formattedValue = formatMoney(value)
  return formattedValue === '' ? '' : `$${formattedValue}`
}
