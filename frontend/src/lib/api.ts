export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError('The server could not be reached. Check that the backend is running.', 0)
  }

  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new ApiError(payload.error || 'The request could not be completed.', response.status)
  return payload as T
}

export function adminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('sandiego-admin-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function customerHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('sandiego-customer-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
