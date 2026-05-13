/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../components/FilterBar';

describe('FilterBar', () => {
  it('renders all filter controls', () => {
    render(
      <FilterBar
        status=""
        priority=""
        search=""
        onStatusChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onSearchChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('状态')).toBeTruthy();
    expect(screen.getByLabelText('优先级')).toBeTruthy();
    expect(screen.getByLabelText('搜索')).toBeTruthy();
  });

  it('status dropdown triggers onStatusChange', () => {
    const onStatusChange = vi.fn();
    render(
      <FilterBar
        status=""
        priority=""
        search=""
        onStatusChange={onStatusChange}
        onPriorityChange={vi.fn()}
        onSearchChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const statusSelect = screen.getByLabelText('状态') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'todo' } });
    expect(onStatusChange).toHaveBeenCalledWith('todo');
  });

  it('priority dropdown triggers onPriorityChange', () => {
    const onPriorityChange = vi.fn();
    render(
      <FilterBar
        status=""
        priority=""
        search=""
        onStatusChange={vi.fn()}
        onPriorityChange={onPriorityChange}
        onSearchChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const prioritySelect = screen.getByLabelText('优先级') as HTMLSelectElement;
    fireEvent.change(prioritySelect, { target: { value: 'high' } });
    expect(onPriorityChange).toHaveBeenCalledWith('high');
  });

  it('search input triggers onSearchChange', () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar
        status=""
        priority=""
        search=""
        onStatusChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onSearchChange={onSearchChange}
        onClear={vi.fn()}
      />,
    );

    const searchInput = screen.getByLabelText('搜索');
    fireEvent.input(searchInput, { target: { value: 'test' } });
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('clear button triggers onClear', () => {
    const onClear = vi.fn();
    render(
      <FilterBar
        status="todo"
        priority=""
        search=""
        onStatusChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onSearchChange={vi.fn()}
        onClear={onClear}
      />,
    );

    const clearBtn = screen.getByText('清除');
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it('clear button is hidden when no filter is active', () => {
    render(
      <FilterBar
        status=""
        priority=""
        search=""
        onStatusChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onSearchChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByText('清除')).toBeNull();
  });
});
