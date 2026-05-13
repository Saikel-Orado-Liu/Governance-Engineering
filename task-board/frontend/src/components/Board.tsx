import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { BoardColumn, Task, TaskPriority, TaskStatus } from '../types/task';
import { TASK_STATUSES, STATUS_LABELS } from '../types/task';
import { STATUS_I18N_KEYS } from '../i18n/labels';
import { fetchBoard, fetchTasks, deleteTask } from '../api/tasks';
import type { FilterParams } from '../api/tasks';
import { FilterBar } from './FilterBar';
import { TaskDetail } from './TaskDetail';
import { CreateTaskModal } from './CreateTaskModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { Pagination } from './Pagination';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import styles from './Board.module.css';

const PAGE_SIZE = 20;

interface LoadSetters {
  setColumns: React.Dispatch<React.SetStateAction<BoardColumn[]>>;
  setTotalItems: React.Dispatch<React.SetStateAction<number>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  currentPageRef: React.MutableRefObject<number>;
}

async function loadFiltered(
  filter: { status: TaskStatus | ''; priority: TaskPriority | '' },
  pageNum: number,
  setters: LoadSetters,
): Promise<void> {
  const params: FilterParams & { offset?: number; limit?: number } = {};
  if (filter.status) params.status = filter.status;
  if (filter.priority) params.priority = filter.priority;
  params.offset = pageNum * PAGE_SIZE;
  params.limit = PAGE_SIZE;
  const { tasks, total } = await fetchTasks(params);
  setters.setTotalItems(total);
  const clampedPage = Math.min(pageNum, Math.max(0, Math.ceil(total / PAGE_SIZE) - 1));
  setters.setCurrentPage(clampedPage);
  setters.currentPageRef.current = clampedPage;
  const grouped: BoardColumn[] = TASK_STATUSES.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    tasks: tasks.filter((t) => t.status === s),
  }));
  setters.setColumns(grouped);
}

async function loadAll(setters: LoadSetters): Promise<void> {
  const data = await fetchBoard();
  setters.setColumns(data);
  setters.setTotalItems(0);
  setters.setCurrentPage(0);
  setters.currentPageRef.current = 0;
}

const priorityClass: Record<TaskPriority, string> = {
  low: styles.priority_low,
  medium: styles.priority_medium,
  high: styles.priority_high,
};

export function Board() {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [filter, setFilter] = useState<{
    status: TaskStatus | '';
    priority: TaskPriority | '';
    search: string;
  }>({ status: '', priority: '', search: '' });
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const currentPageRef = useRef(0);
  const intl = useIntl();
  const { hasDragged, handleDragStart, handleDragOver, handleDrop } = useDragAndDrop(columns, setColumns);

  const handleCreate = useCallback(() => setShowCreateModal(true), []);
  const handleCloseModal = useCallback(() => setShowCreateModal(false), []);
  const handleEditClose = useCallback(() => setEditTask(null), []);
  const handleCancelDelete = useCallback(() => setDeleteTarget(null), []);
  const handleToastClose = useCallback(() => setToastMessage(''), []);

  const load = useCallback(async (page?: number) => {
    setLoading(true);
    setError(null);
    try {
      const targetPage = page ?? 0;
      if (filter.status || filter.priority) {
        await loadFiltered(filter, targetPage, {
          setColumns, setTotalItems, setCurrentPage, currentPageRef,
        });
      } else {
        await loadAll({ setColumns, setTotalItems, setCurrentPage, currentPageRef });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'board.error' }));
    } finally {
      setLoading(false);
    }
  }, [filter.status, filter.priority, intl]);

  useEffect(() => {
    load();
  }, [load]);

  const displayColumns = useMemo(() => {
    if (!filter.search) return columns;
    const q = filter.search.toLowerCase();
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      ),
    }));
  }, [columns, filter.search]);

  const handleStatusChange = useCallback((status: TaskStatus | '') => {
    setFilter((prev) => ({ ...prev, status }));
  }, []);

  const handlePriorityChange = useCallback((priority: TaskPriority | '') => {
    setFilter((prev) => ({ ...prev, priority }));
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setFilter((prev) => ({ ...prev, search }));
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilter({ status: '', priority: '', search: '' });
  }, []);

  const handleDetailEdit = useCallback((task: Task) => {
    setEditTask(task);
  }, []);

  const handleDetailDelete = useCallback((task: Task) => {
    setDeleteTarget(task);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailTask(null);
  }, []);

  const handleDeleteClick = useCallback((task: Task) => {
    setDeleteTarget(task);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const targetId = String(deleteTarget.id);
    setDeleteTarget(null);
    try {
      await deleteTask(targetId);
      await load(currentPageRef.current);
    } catch (err) {
      setToastMessage(`${intl.formatMessage({ id: 'common.delete_failed' })}: ${err instanceof Error ? err.message : intl.formatMessage({ id: 'common.unknown_error' })}`);
    }
  }, [deleteTarget, load, intl]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className={styles.board}>
        <div className={styles.columns}>
          {TASK_STATUSES.map((status) => (
            <div key={status} className={styles.column}>
              <div className={styles.columnHeader}>
                <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
                <div className={`${styles.skeleton} ${styles.skeletonCount}`} />
              </div>
              <div className={styles.cardList}>
                <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
                <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
                <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.errorRetry} onClick={() => load()} type="button">
          <FormattedMessage id="board.retry" />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <div className={styles.header}>
        <h1><FormattedMessage id="board.title" /></h1>
        <div className={styles.headerActions}>
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            type="button"
          >
            <FormattedMessage id="board.create_task" />
          </button>
        </div>
      </div>
      <FilterBar
        status={filter.status}
        priority={filter.priority}
        search={filter.search}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onSearchChange={handleSearchChange}
        onClear={handleClearFilter}
      />
      <div className={styles.columns}>
        {displayColumns.map((column) => (
          <div
            key={column.status}
            className={styles.column}
            data-status={column.status}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className={styles.columnHeader}>
              <h2 className={styles.columnTitle}>
                {intl.formatMessage({ id: STATUS_I18N_KEYS[column.status] })}
              </h2>
              <span className={styles.count}>{column.tasks.length}</span>
            </div>
            <div className={styles.cardList}>
              {column.tasks.length === 0 ? (
                <p className={styles.empty}><FormattedMessage id="board.no_tasks" /></p>
              ) : (
                column.tasks.map((task, index) => (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    className={`${styles.card} ${priorityClass[task.priority]}`}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, String(task.id), column.status, index)
                    }
                    onDragEnd={() => {
                      setTimeout(() => {
                        hasDragged.current = false;
                      }, 0);
                    }}
                    onClick={() => {
                      if (hasDragged.current) {
                        hasDragged.current = false;
                        return;
                      }
                      setDetailTask(task);
                    }}
                  >
                    <div className={styles.cardTitle}>{task.title}</div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDetailEdit(task);
                        }}
                        title={intl.formatMessage({ id: 'task.edit' })}
                        type="button"
                      >
                        {'✏️'}
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(task);
                        }}
                        title={intl.formatMessage({ id: 'task.delete' })}
                        type="button"
                      >
                        {'🗑️'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / PAGE_SIZE)}
        onPageChange={load}
      />
      <CreateTaskModal
        open={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={load}
      />
      {editTask && (
        <CreateTaskModal
          open={!!editTask}
          mode="edit"
          task={editTask}
          onClose={handleEditClose}
          onSuccess={load}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title={intl.formatMessage({ id: 'task.confirm_delete' })}
          message={intl.formatMessage(
            { id: 'task.confirm_delete_msg' },
            { title: deleteTarget.title },
          )}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onClose={handleToastClose} />
      )}
      <TaskDetail
        task={detailTask}
        open={!!detailTask}
        onClose={handleDetailClose}
        onEdit={handleDetailEdit}
        onDelete={handleDetailDelete}
      />
      {/* Mobile bottom navigation */}
      <div className={styles.mobileNav}>
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            className={styles.mobileNavBtn}
            onClick={() => {
              const el = document.querySelector(`[data-status="${s}"]`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            type="button"
          >
            {intl.formatMessage({ id: STATUS_I18N_KEYS[s] })}
          </button>
        ))}
        <button className={styles.mobileFab} onClick={handleCreate} type="button">
          +
        </button>
      </div>
    </div>
  );
}
