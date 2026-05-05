import axios from 'axios'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export function buildApiUrl(baseUrl: string, path: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '')
  const trimmedPath = path.replace(/^\/+/, '')

  return trimmedPath ? `${trimmedBaseUrl}/${trimmedPath}` : trimmedBaseUrl
}

export const api = axios.create({
  baseURL: API_BASE_URL,
})

export async function getJson<T>(path: string): Promise<T> {
  const response = await api.get<T>(path)
  return response.data
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await api.post<TResponse>(path, body)
  return response.data
}

export async function patchJson<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await api.patch<TResponse>(path, body)
  return response.data
}

export async function deleteJson<TResponse>(path: string): Promise<TResponse> {
  const response = await api.delete<TResponse>(path)
  return response.data
}
