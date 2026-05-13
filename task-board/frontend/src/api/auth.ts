/**
 * Auth API functions using the centralized fetch client.
 */

import { client } from './client';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  username: string;
  created_at: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return client.post<LoginResponse>('/api/auth/login', { username, password });
}

export async function register(username: string, password: string): Promise<UserResponse> {
  return client.post<UserResponse>('/api/auth/register', { username, password });
}

export async function refreshToken(refreshTokenValue: string): Promise<LoginResponse> {
  return client.post<LoginResponse>('/api/auth/refresh', { refresh_token: refreshTokenValue });
}
