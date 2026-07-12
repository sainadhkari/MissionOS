import axios from 'axios'
import { AUTH_TOKEN_KEY } from '../constants/auth'
import { config } from '../config'

const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 5000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

export default apiClient
