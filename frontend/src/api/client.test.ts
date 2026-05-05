import { describe, expect, it } from 'vitest'
import { buildApiUrl } from './client'

describe('buildApiUrl', () => {
  it('joins base URL and path without duplicate slashes', () => {
    expect(buildApiUrl('http://localhost:3000/api/', '/products')).toBe(
      'http://localhost:3000/api/products',
    )
  })
})
