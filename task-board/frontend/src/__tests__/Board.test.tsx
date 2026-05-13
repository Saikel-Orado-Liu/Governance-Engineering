/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from '../i18n';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Board } from '../components/Board';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <IntlProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </IntlProvider>,
  );
}

vi.mock('../api/tasks', () => ({
  fetchBoard: vi.fn(),
  fetchTasks: vi.fn().mockResolvedValue({ tasks: [], total: 0 }),
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  updateTaskReorder: vi.fn().mockResolvedValue(undefined),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));

import { fetchBoard, updateTaskStatus } from '../api/tasks';

beforeAll(() => {
  // jsdom does not implement matchMedia; provide a stub
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

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

    renderWithProviders(<Board />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'To Do' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'In Progress' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Done' })).toBeTruthy();
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

    renderWithProviders(<Board />);

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

    renderWithProviders(<Board />);

    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeTruthy();
    });

    expect(screen.getByText('重试')).toBeTruthy();
  });

  it('shows loading state', () => {
    (fetchBoard as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Board />);

    // Since fetchBoard never resolves, the component remains in loading skeleton state
    // Column headings (from loaded state) should not be rendered
    expect(screen.queryByRole('heading', { name: 'To Do' })).toBeNull();
    // Empty state text should not appear during loading
    expect(screen.queryByText('暂无任务')).toBeNull();
    // Error state should not appear during loading
    expect(screen.queryByText('重试')).toBeNull();
  });

  it('shows empty state', async () => {
    (fetchBoard as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: 'todo', label: 'To Do', tasks: [] },
      { status: 'in_progress', label: 'In Progress', tasks: [] },
      { status: 'done', label: 'Done', tasks: [] },
    ]);

    renderWithProviders(<Board />);

    await waitFor(() => {
      expect(screen.getAllByText('暂无任务')).toHaveLength(3);
    });
  });

  it('dragover does not call api', async () => {
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

    renderWithProviders(<Board />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeTruthy();
    });

    const todoColumn = screen.getByRole('heading', { name: 'To Do' }).closest('[data-status]');
    expect(todoColumn).not.toBeNull();

    if (todoColumn) {
      const dataTransfer = new DataTransfer();
      fireEvent.dragOver(todoColumn, { dataTransfer });
    }

    // dragover should NOT trigger an API call
    expect(updateTaskStatus).not.toHaveBeenCalled();
  });
});
