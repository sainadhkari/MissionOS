import apiClient from './api'
import { AUTH_TOKEN_KEY } from '../constants/auth'
import type { User } from '../types/User'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

interface TokenResponse {
  access_token: string
  token_type: string
}

function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
    })
    return response.data
  },

  async login(payload: LoginPayload): Promise<void> {
    const body = new URLSearchParams()
    body.set('username', payload.email)
    body.set('password', payload.password)

    const response = await apiClient.post<TokenResponse>('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    setToken(response.data.access_token)
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },

  logout(): void {
    clearToken()
  },

  getToken,

  isAuthenticated(): boolean {
    return getToken() !== null
  },
}
