/**
 * Maps TaskStatus and TaskPriority to i18n message keys.
 * Use these in place of hardcoded STATUS_LABELS / PRIORITY_LABELS
 * so that rendered text responds to locale switching.
 */

import type { TaskStatus, TaskPriority } from '../types/task';

export const STATUS_I18N_KEYS: Record<TaskStatus, string> = {
  todo: 'status.todo',
  in_progress: 'status.inProgress',
  done: 'status.done',
};

export const PRIORITY_I18N_KEYS: Record<TaskPriority, string> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
};
