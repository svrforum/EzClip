import type { JobResponse } from './types'

const API_BASE = '/api'

/**
 * Make a POST request to the API and return the JSON response.
 * Handles FastAPI validation errors and provides consistent error handling.
 */
export async function post<T>(url: string, data: T): Promise<JobResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    // Handle FastAPI validation errors (detail is an array)
    if (Array.isArray(error.detail)) {
      const messages = error.detail.map((e: { msg?: string }) => e.msg || 'Validation error').join(', ')
      throw new Error(messages)
    }
    throw new Error(typeof error.detail === 'string' ? error.detail : 'Request failed')
  }

  return res.json()
}

/**
 * Make a GET request to the API and return the JSON response.
 */
export async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(typeof error.detail === 'string' ? error.detail : 'Request failed')
  }

  return res.json()
}

/**
 * Build an API URL with the base path.
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export { API_BASE }
