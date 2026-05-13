/**
 * Task API functions — refactored to use the centralized fetch client.
 * Public function signatures remain unchanged.
 */

import { client } from './client';
import type { BoardColumn, Task, TaskPriority, TaskStatus } from '../types/task';

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return client.patch<Task>(`/api/tasks/${id}/status`, { status });
}

export async function updateTaskReorder(id: string, sortOrder: number): Promise<Task> {
  return client.patch<Task>(`/api/tasks/${id}/reorder`, { sort_order: sortOrder });
}

export async function updateTask(
  id: string,
  data: { title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority },
): Promise<Task> {
  return client.patch<Task>(`/api/tasks/${id}`, data);
}

export async function deleteTask(id: string): Promise<void> {
  return client.delete<void>(`/api/tasks/${id}`);
}

export async function createTask(body: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}): Promise<Task> {
  return client.post<Task>('/api/tasks', body);
}

export type FilterParams = {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
};

export async function fetchTasks(
  params?: FilterParams & { offset?: number; limit?: number },
): Promise<{ tasks: Task[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = qs ? `/api/tasks?${qs}` : '/api/tasks';
  return client.paginatedGet<Task[]>(url).then(({ data, total }) => ({
    tasks: data,
    total,
  }));
}

export async function fetchBoard(): Promise<BoardColumn[]> {
  return client.get<BoardColumn[]>('/api/boards');
}
