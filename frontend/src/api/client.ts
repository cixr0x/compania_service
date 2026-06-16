import axios from 'axios'

const LOCAL_API_BASE_URL = 'http://localhost:3000/api'
const PRODUCTION_API_BASE_URL = '/api'

export function buildApiUrl(baseUrl: string, path: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '')
  const trimmedPath = path.replace(/^\/+/, '')

  return trimmedPath ? `${trimmedBaseUrl}/${trimmedPath}` : trimmedBaseUrl
}

function resolveApiBaseUrl(configuredBaseUrl: string | undefined): string {
  const trimmedBaseUrl = configuredBaseUrl?.trim() ?? ''
  const defaultBaseUrl = import.meta.env.PROD
    ? PRODUCTION_API_BASE_URL
    : LOCAL_API_BASE_URL

  return buildApiUrl(trimmedBaseUrl || defaultBaseUrl, '')
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
)

export const api = axios.create({
  baseURL: API_BASE_URL,
})

type ApiErrorResponseBody = {
  errors?: unknown
  message?: unknown
}

export function formatApiErrorMessage(
  error: unknown,
  fallbackMessage = 'The request could not be completed.',
): string {
  const responseBody = getApiErrorResponseBody(error)
  const responseMessage = formatResponseMessage(responseBody?.message)
  const responseDetails = formatResponseErrors(responseBody?.errors)
  const fallback =
    error instanceof Error && error.message ? error.message : fallbackMessage

  if (responseDetails.length > 0) {
    if (responseMessage && !responseDetails.includes(responseMessage)) {
      return `${responseMessage}: ${responseDetails.join('; ')}`
    }

    return responseDetails.join('; ')
  }

  if (responseMessage) {
    return responseMessage
  }

  return fallback
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      error.message = formatApiErrorMessage(error)
    }

    return Promise.reject(error)
  },
)

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

export async function putJson<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await api.put<TResponse>(path, body)
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

function getApiErrorResponseBody(error: unknown): ApiErrorResponseBody | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  const responseData = error.response?.data
  if (typeof responseData === 'string') {
    return { message: responseData }
  }

  if (!isRecord(responseData)) {
    return null
  }

  return responseData
}

function formatResponseMessage(message: unknown): string {
  if (Array.isArray(message)) {
    return message
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join('; ')
  }

  return typeof message === 'string' ? message.trim() : ''
}

function formatResponseErrors(errors: unknown): string[] {
  if (!Array.isArray(errors)) {
    return []
  }

  return errors
    .map((error) => {
      if (typeof error === 'string') {
        return error.trim()
      }

      if (!isRecord(error)) {
        return ''
      }

      const message =
        typeof error.message === 'string' ? error.message.trim() : ''
      const field = typeof error.field === 'string' ? error.field.trim() : ''

      if (field && message) {
        return `${field}: ${message}`
      }

      return message
    })
    .filter(Boolean)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
