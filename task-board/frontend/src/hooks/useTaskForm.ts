import { useState, useCallback, useEffect } from 'react';
import type { Task, TaskStatus, TaskPriority } from '../types/task';
import { createTask, updateTask } from '../api/tasks';

interface UseTaskFormReturn {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  status: TaskStatus;
  setStatus: (value: TaskStatus) => void;
  priority: TaskPriority;
  setPriority: (value: TaskPriority) => void;
  submitting: boolean;
  error: string | null;
  isTitleEmpty: boolean;
  handleSubmit: () => Promise<void>;
}

export function useTaskForm(
  open: boolean,
  mode: 'create' | 'edit',
  task: Task | undefined,
  onSuccess: () => void,
  onClose: () => void,
): UseTaskFormReturn {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize/reset form when the modal opens
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
    } else {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
    }
    setError(null);
    setSubmitting(false);
  }, [open, mode, task]);

  const isTitleEmpty = !title.trim();

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'edit' && task) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
        });
      }
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'edit'
            ? '保存失败'
            : '创建失败',
      );
      setSubmitting(false);
    }
  }, [title, description, status, priority, mode, task, onSuccess, onClose]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    status,
    setStatus,
    priority,
    setPriority,
    submitting,
    error,
    isTitleEmpty,
    handleSubmit,
  };
}
