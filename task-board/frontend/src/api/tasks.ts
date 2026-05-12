import type { BoardColumn, Task, TaskStatus } from '../types/task';

const BASE_URL = '/api/tasks';

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(BASE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }
  return response.json() as Promise<Task[]>;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.statusText}`);
  }
  return response.json() as Promise<Task>;
}

export async function updateTaskReorder(id: string, sortOrder: number): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sort_order: sortOrder }),
  });
  if (!response.ok) {
    throw new Error(`Failed to reorder task: ${response.statusText}`);
  }
  return response.json() as Promise<Task>;
}

export async function fetchBoard(): Promise<BoardColumn[]> {
  const response = await fetch('/api/boards');
  if (!response.ok) {
    throw new Error(`Failed to fetch board: ${response.statusText}`);
  }
  return response.json() as Promise<BoardColumn[]>;
}
