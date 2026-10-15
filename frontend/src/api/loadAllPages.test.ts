import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getJson } from './client'
import { loadAllPages } from './loadAllPages'

vi.mock('./client', () => ({ getJson: vi.fn() }))

describe('loadAllPages', () => {
  beforeEach(() => vi.resetAllMocks())

  it('keeps the initial path and returns all pages after a short final page', async () => {
    const first = Array.from({ length: 100 }, (_, i) => i + 1)
    vi.mocked(getJson).mockResolvedValueOnce(first).mockResolvedValueOnce([101])
    await expect(loadAllPages<number>('/projects?pageSize=100', new AbortController().signal))
      .resolves.toEqual([...first, 101])
    expect(getJson).toHaveBeenNthCalledWith(1, '/projects?pageSize=100')
    expect(getJson).toHaveBeenNthCalledWith(2, '/projects?pageSize=100&page=2')
    expect(getJson).toHaveBeenCalledTimes(2)
  })

  it('requests an empty trailing page for an exact multiple', async () => {
    vi.mocked(getJson).mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => i)).mockResolvedValueOnce([])
    await expect(loadAllPages<number>('/products?pageSize=100', new AbortController().signal)).resolves.toHaveLength(100)
    expect(getJson).toHaveBeenCalledTimes(2)
  })

  it('rejects a later page failure rather than resolving partial rows', async () => {
    vi.mocked(getJson).mockResolvedValueOnce(Array(100).fill(1)).mockRejectedValueOnce(new Error('Later page failed'))
    await expect(loadAllPages('/products?pageSize=100', new AbortController().signal)).rejects.toThrow('Later page failed')
  })

  it('does not request any page when already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(loadAllPages('/projects?pageSize=100', controller.signal)).rejects.toThrow()
    expect(getJson).not.toHaveBeenCalled()
  })

  it('rejects cancellation during a request without publishing rows or fetching the next page', async () => {
    const controller = new AbortController()
    let finish!: (rows: number[]) => void
    vi.mocked(getJson).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const loading = loadAllPages('/projects?pageSize=100', controller.signal)
    controller.abort()
    finish(Array(100).fill(1))
    await expect(loading).rejects.toThrow()
    expect(getJson).toHaveBeenCalledTimes(1)
  })
})
