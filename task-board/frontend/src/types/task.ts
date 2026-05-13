export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export type BoardColumn = {
  status: TaskStatus;
  label: string;
  tasks: Task[];
};
