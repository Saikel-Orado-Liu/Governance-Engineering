/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateTaskModal } from '../components/CreateTaskModal';
import type { TaskStatus, TaskPriority } from '../types/task';

vi.mock('../api/tasks', () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));

import { createTask, updateTask } from '../api/tasks';

describe('CreateTaskModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields when open', () => {
    render(
      <CreateTaskModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    expect(screen.getByPlaceholderText('请输入任务标题')).toBeTruthy();
    expect(screen.getByLabelText('优先级')).toBeTruthy();
    expect(screen.getByLabelText('状态')).toBeTruthy();
    expect(screen.getByRole('button', { name: '创建任务' })).toBeTruthy();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <CreateTaskModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('submit disabled with empty title', () => {
    render(
      <CreateTaskModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    const submitBtn = screen.getByRole('button', { name: '创建任务' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const titleInput = screen.getByPlaceholderText('请输入任务标题');
    fireEvent.change(titleInput, { target: { value: 'New Task' } });
    expect(submitBtn.disabled).toBe(false);
  });

  it('successful submit calls onSuccess and onClose', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1',
      title: 'New Task',
    });

    render(
      <CreateTaskModal
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const titleInput = screen.getByPlaceholderText('请输入任务标题');
    fireEvent.change(titleInput, { target: { value: 'New Task' } });

    const submitBtn = screen.getByRole('button', { name: '创建任务' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({
        title: 'New Task',
        status: 'todo',
        priority: 'medium',
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('edit mode prefills form with task data', () => {
    const mockTask = {
      id: '1',
      title: 'Existing Task',
      description: 'Existing description',
      status: 'in_progress' as TaskStatus,
      priority: 'high' as TaskPriority,
      sort_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(
      <CreateTaskModal
        open={true}
        mode="edit"
        task={mockTask}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const titleInput = screen.getByPlaceholderText('请输入任务标题') as HTMLInputElement;
    expect(titleInput.value).toBe('Existing Task');

    const descTextarea = screen.getByLabelText('描述') as HTMLTextAreaElement;
    expect(descTextarea.value).toBe('Existing description');

    const statusSelect = screen.getByLabelText('状态') as HTMLSelectElement;
    expect(statusSelect.value).toBe('in_progress');

    const prioritySelect = screen.getByLabelText('优先级') as HTMLSelectElement;
    expect(prioritySelect.value).toBe('high');

    expect(screen.getByRole('button', { name: '保存修改' })).toBeTruthy();
  });

  it('shows error message and retry button on API error', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    (createTask as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Server error'),
    );

    render(
      <CreateTaskModal
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const titleInput = screen.getByPlaceholderText('请输入任务标题');
    fireEvent.change(titleInput, { target: { value: 'New Task' } });

    const submitBtn = screen.getByRole('button', { name: '创建任务' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
  });

  it('edit success resets form', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const mockTask = {
      id: '1',
      title: 'Existing Task',
      description: 'Existing description',
      status: 'in_progress' as TaskStatus,
      priority: 'high' as TaskPriority,
      sort_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    (updateTask as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockTask, title: 'Updated Title' });

    render(
      <CreateTaskModal
        open={true}
        mode="edit"
        task={mockTask}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const titleInput = screen.getByPlaceholderText('请输入任务标题');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const saveBtn = screen.getByRole('button', { name: '保存修改' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith('1', {
        title: 'Updated Title',
        description: 'Existing description',
        status: 'in_progress',
        priority: 'high',
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
