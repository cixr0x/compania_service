import { getJson } from './client'

export const ENTITY_PAGE_SIZE = 100

/** Resolve only a complete catalog; cancellation or any failed page rejects it. */
export async function loadAllPages<T>(firstPagePath: string, signal: AbortSignal) {
  const rows: T[] = []
  let page = 1
  while (true) {
    signal.throwIfAborted()
    const pageRows = await getJson<T[]>(
      page === 1 ? firstPagePath : `${firstPagePath}&page=${page}`,
    )
    signal.throwIfAborted()
    rows.push(...pageRows)
    if (pageRows.length < ENTITY_PAGE_SIZE) {
      return rows
    }
    page += 1
  }
}
