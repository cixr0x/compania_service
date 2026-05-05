import type { AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('buildApiUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('joins base URL and path without duplicate slashes', async () => {
    const { buildApiUrl } = await import('./client')

    expect(buildApiUrl('http://localhost:3000/api/', '/products')).toBe(
      'http://localhost:3000/api/products',
    )
  })

  it('normalizes trailing slashes for the axios base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://example.test/api/')
    vi.resetModules()

    const { API_BASE_URL, api } = await import('./client')

    expect(API_BASE_URL).toBe('http://example.test/api')
    expect(api.defaults.baseURL).toBe('http://example.test/api')
  })

  it('falls back to the default API base URL when the env value is blank', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '   ')
    vi.resetModules()

    const { API_BASE_URL, api } = await import('./client')

    expect(API_BASE_URL).toBe('http://localhost:3000/api')
    expect(api.defaults.baseURL).toBe('http://localhost:3000/api')
  })

  it('returns response data from JSON helpers', async () => {
    const { api, deleteJson, getJson, patchJson, postJson, putJson } =
      await import('./client')
    const payload = { ok: true }
    const response = { data: payload } as AxiosResponse<typeof payload>

    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(response)
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue(response)
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue(response)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue(response)
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue(response)

    await expect(getJson<typeof payload>('/products')).resolves.toBe(payload)
    await expect(
      postJson<typeof payload, { name: string }>('/products', {
        name: 'Product',
      }),
    ).resolves.toBe(payload)
    await expect(
      putJson<typeof payload, { name: string }>('/products/1', {
        name: 'Replaced',
      }),
    ).resolves.toBe(payload)
    await expect(
      patchJson<typeof payload, { name: string }>('/products/1', {
        name: 'Updated',
      }),
    ).resolves.toBe(payload)
    await expect(deleteJson<typeof payload>('/products/1')).resolves.toBe(
      payload,
    )

    expect(getSpy).toHaveBeenCalledWith('/products')
    expect(postSpy).toHaveBeenCalledWith('/products', { name: 'Product' })
    expect(putSpy).toHaveBeenCalledWith('/products/1', { name: 'Replaced' })
    expect(patchSpy).toHaveBeenCalledWith('/products/1', { name: 'Updated' })
    expect(deleteSpy).toHaveBeenCalledWith('/products/1')
  })
})
