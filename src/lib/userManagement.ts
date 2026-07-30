import { supabase } from './supabase'
import type { UserRole } from '../types'

export type ManagedUser = {
  id: string
  email: string
  fullName: string
  role: UserRole
  phone: string
  isActive: boolean
  setupComplete: boolean
  createdAt: string
  lastSignInAt: string | null
  emailConfirmedAt: string | null
}

async function getAccessToken() {
  if (!supabase) throw new Error('Supabase is not connected.')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again.')
  return token
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(payload.error || 'The user-management request failed.')
  return payload
}

export async function listManagedUsers() {
  const result = await apiRequest<{ users: ManagedUser[] }>('/api/admin/users')
  return result.users
}

export async function updateManagedUser(values: {
  id: string
  email: string
  fullName: string
  role: UserRole
  phone: string
  isActive: boolean
}) {
  const result = await apiRequest<{ user: ManagedUser }>('/api/admin/users', {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
  return result.user
}

export async function setManagedUserPassword(userId: string, password: string) {
  return apiRequest<{ message: string }>('/api/admin/users/set-password', {
    method: 'POST',
    body: JSON.stringify({ userId, password }),
  })
}

export async function sendManagedUserPasswordReset(userId: string) {
  return apiRequest<{ message: string }>('/api/admin/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}
