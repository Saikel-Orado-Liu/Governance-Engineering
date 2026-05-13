/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="确认删除"
        message="确定要删除此任务吗？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('确认删除')).toBeTruthy();
    expect(screen.getByText('确定要删除此任务吗？')).toBeTruthy();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="确认删除"
        message="确定要删除此任务吗？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('cancel button calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="确认删除"
        message="确定要删除此任务吗？"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText('取消'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirm button calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="确认删除"
        message="确定要删除此任务吗？"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('确认'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
