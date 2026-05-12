import { useState, useEffect, useCallback, useRef } from 'react';
import type { BoardColumn, TaskPriority, TaskStatus } from '../types/task';
import { TASK_STATUSES, STATUS_LABELS } from '../types/task';
import { fetchBoard, updateTaskStatus, updateTaskReorder } from '../api/tasks';
import styles from './Board.module.css';

const priorityClass: Record<TaskPriority, string> = {
  low: styles.priority_low,
  medium: styles.priority_medium,
  high: styles.priority_high,
};

export function Board() {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dragState = useRef<{taskId: string; sourceStatus: string; sourceIndex: number} | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBoard();
      setColumns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceStatus: TaskStatus, sourceIndex: number) => {
      e.dataTransfer.setData('text/plain', String(taskId));
      e.dataTransfer.effectAllowed = 'move';
      dragState.current = { taskId, sourceStatus, sourceIndex };
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!dragState.current) return;

      const targetStatus = e.currentTarget.dataset.status;
      if (!targetStatus) return;

      // For cross-column drags, skip index calculation — drop will append to end
      if (dragState.current.sourceStatus !== targetStatus) return;

      // For same-column drag: compute insertion index via midpoint comparison
      const cardListEl = (e.currentTarget as HTMLElement)
        .querySelector(`.${styles.cardList}`) as HTMLElement | null;
      if (!cardListEl) return;

      const cardEls = cardListEl.querySelectorAll('[data-task-id]');
      const mouseY = e.clientY;
      let insertIndex = cardEls.length;

      cardEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (mouseY < mid && insertIndex === cardEls.length) {
          insertIndex = i;
        }
      });

      e.dataTransfer.dropEffect = 'move';
      (e.currentTarget as HTMLElement).dataset.dropIndex = String(insertIndex);
    },
    [],
  );

  const handleSameColumnDrop = useCallback(
    (taskId: string, adjustedTarget: number, sourceStatus: string, sourceIndex: number) => {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.status !== sourceStatus) return col;
          const tasks = [...col.tasks];
          const [moved] = tasks.splice(sourceIndex, 1);
          tasks.splice(adjustedTarget, 0, moved);
          return { ...col, tasks };
        }),
      );

      updateTaskReorder(taskId, adjustedTarget)
        .then((updatedTask) => {
          if (!updatedTask) return;
          setColumns((prev) =>
            prev.map((col) => ({
              ...col,
              tasks: col.tasks.map((t) =>
                String(t.id) === taskId ? { ...t, ...updatedTask, id: t.id } : t,
              ),
            })),
          );
        })
        .catch(() => load());
    },
    [load],
  );

  const handleCrossColumnDrop = useCallback(
    (taskId: string, targetStatus: string, targetIndex: number) => {
      // Optimistic update: remove from source column, append to end of target column
      setColumns((prev) => {
        const foundTask = prev
          .flatMap((c) => c.tasks)
          .find((t) => String(t.id) === taskId);
        if (!foundTask) return prev;

        const updatedTask = { ...foundTask, status: targetStatus as TaskStatus };

        return prev.map((col) => {
          if (col.status === targetStatus) {
            return { ...col, tasks: [...col.tasks, updatedTask] };
          }
          return {
            ...col,
            tasks: col.tasks.filter((t) => String(t.id) !== taskId),
          };
        });
      });

      updateTaskStatus(taskId, targetStatus as TaskStatus)
        .then(() => updateTaskReorder(taskId, targetIndex))
        .then((updatedTask) => {
          if (!updatedTask) return;
          setColumns((prev) =>
            prev.map((col) => ({
              ...col,
              tasks: col.tasks.map((t) =>
                String(t.id) === taskId ? { ...t, ...updatedTask, id: t.id } : t,
              ),
            })),
          );
        })
        .catch(() => load());
    },
    [load],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      if (!taskId) return;

      const dragInfo = dragState.current;
      if (!dragInfo || dragInfo.taskId !== taskId) return;

      const targetStatus = e.currentTarget.dataset.status;
      if (!targetStatus) return;

      const targetIndexStr = (e.currentTarget as HTMLElement).dataset.dropIndex;
      const targetIndex = targetIndexStr ? parseInt(targetIndexStr, 10) : -1;

      dragState.current = null;

      if (dragInfo.sourceStatus === targetStatus) {
        // Same-column operation
        if (targetIndex < 0) return;
        if (targetIndex === dragInfo.sourceIndex || targetIndex === dragInfo.sourceIndex + 1) return;

        const adjustedTarget = targetIndex > dragInfo.sourceIndex ? targetIndex - 1 : targetIndex;
        handleSameColumnDrop(taskId, adjustedTarget, dragInfo.sourceStatus, dragInfo.sourceIndex);
      } else {
        // Cross-column operation: append to end of target column
        const targetCol = columns.find((c) => c.status === targetStatus);
        const crossColIndex = targetCol ? targetCol.tasks.length : 0;
        handleCrossColumnDrop(taskId, targetStatus, crossColIndex);
      }
    },
    [columns, handleSameColumnDrop, handleCrossColumnDrop],
  );

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
        <button className={styles.errorRetry} onClick={load} type="button">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <div className={styles.columns}>
        {columns.map((column) => (
          <div
            key={column.status}
            className={styles.column}
            data-status={column.status}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className={styles.columnHeader}>
              <h2 className={styles.columnTitle}>
                {STATUS_LABELS[column.status]}
              </h2>
              <span className={styles.count}>{column.tasks.length}</span>
            </div>
            <div className={styles.cardList}>
              {column.tasks.length === 0 ? (
                <p className={styles.empty}>暂无任务</p>
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
                  >
                    <div className={styles.cardTitle}>{task.title}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
