/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Board } from '../components/Board';

vi.mock('../api/tasks', () => ({
  fetchBoard: vi.fn(),
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  updateTaskReorder: vi.fn().mockResolvedValue(undefined),
}));

import { fetchBoard } from '../api/tasks';

beforeAll(() => {
  if (typeof DataTransfer === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).DataTransfer =
      class {
        data: Record<string, string> = {};
        effectAllowed = 'move';
        dropEffect = 'move';
        setData(format: string, data: string) { this.data[format] = data; }
        getData(format: string) { return this.data[format] ?? ''; }
        clearData() { this.data = {}; }
      };
  }
});

describe('Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 columns', async () => {
    (fetchBoard as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: 'todo', label: 'To Do', tasks: [] },
      { status: 'in_progress', label: 'In Progress', tasks: [] },
      { status: 'done', label: 'Done', tasks: [] },
    ]);

    render(<Board />);

    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeTruthy();
      expect(screen.getByText('In Progress')).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
    });
  });

  it('dragstart sets dataTransfer', async () => {
    const mockTask = {
      id: 1,
      title: 'Test Task',
      description: '',
      status: 'todo' as const,
      priority: 'medium' as const,
      created_at: '',
      updated_at: '',
    };
    (fetchBoard as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: 'todo', label: 'To Do', tasks: [mockTask] },
      { status: 'in_progress', label: 'In Progress', tasks: [] },
      { status: 'done', label: 'Done', tasks: [] },
    ]);

    render(<Board />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeTruthy();
    });

    const dataTransfer = new DataTransfer();
    const card = screen.getByText('Test Task').closest('[draggable="true"]');
    expect(card).not.toBeNull();

    if (card) {
      fireEvent.dragStart(card, { dataTransfer });
      expect(dataTransfer.getData('text/plain')).toBe('1');
    }
  });

  it('error state', async () => {
    (fetchBoard as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('加载失败'),
    );

    render(<Board />);

    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeTruthy();
    });

    expect(screen.getByText('重试')).toBeTruthy();
  });
});
