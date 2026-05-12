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

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export type BoardColumn = {
  status: TaskStatus;
  label: string;
  tasks: Task[];
};
