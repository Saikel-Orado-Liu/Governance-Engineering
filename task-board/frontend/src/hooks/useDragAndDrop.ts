import { useCallback, useRef } from 'react';
import type { BoardColumn, TaskStatus } from '../types/task';
import { updateTaskStatus, updateTaskReorder } from '../api/tasks';

interface DragState {
  taskId: string;
  sourceStatus: string;
  sourceIndex: number;
  snapshot?: BoardColumn[] | null;
}

interface UseDragAndDropReturn {
  hasDragged: React.MutableRefObject<boolean>;
  handleDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
    sourceStatus: TaskStatus,
    sourceIndex: number,
  ) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function useDragAndDrop(
  columns: BoardColumn[],
  setColumns: React.Dispatch<React.SetStateAction<BoardColumn[]>>,
): UseDragAndDropReturn {
  const dragState = useRef<DragState | null>(null);
  const hasDragged = useRef(false);

  const handleDragStart = useCallback(
    (
      e: React.DragEvent<HTMLDivElement>,
      taskId: string,
      sourceStatus: TaskStatus,
      sourceIndex: number,
    ) => {
      hasDragged.current = true;
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

      // For cross-column drags, skip index calculation -- drop will append to end
      if (dragState.current.sourceStatus !== targetStatus) return;

      // For same-column drag: compute insertion index via midpoint comparison
      const cardListEl = (e.currentTarget as HTMLElement).querySelector(
        '[class*="cardList"]',
      ) as HTMLElement | null;
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
    (
      taskId: string,
      adjustedTarget: number,
      sourceStatus: string,
      sourceIndex: number,
    ) => {
      const snapshot = dragState.current?.snapshot;

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
        .catch(() => {
          if (snapshot) setColumns(snapshot);
        });
    },
    [setColumns],
  );

  const handleCrossColumnDrop = useCallback(
    (taskId: string, targetStatus: string, targetIndex: number) => {
      const snapshot = dragState.current?.snapshot;

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
        .catch(() => {
          if (snapshot) setColumns(snapshot);
        });
    },
    [setColumns],
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

      // Early-return guards for same-column no-op cases (RF-8)
      if (dragInfo.sourceStatus === targetStatus) {
        if (
          targetIndex < 0 ||
          targetIndex === dragInfo.sourceIndex ||
          targetIndex === dragInfo.sourceIndex + 1
        ) {
          dragState.current = null;
          return;
        }
      }

      // Capture snapshot for optimistic rollback
      const snapshot = JSON.parse(JSON.stringify(columns)) as BoardColumn[];
      dragState.current = { ...dragInfo, snapshot };

      if (dragInfo.sourceStatus === targetStatus) {
        const adjustedTarget =
          targetIndex > dragInfo.sourceIndex ? targetIndex - 1 : targetIndex;
        handleSameColumnDrop(
          taskId,
          adjustedTarget,
          dragInfo.sourceStatus,
          dragInfo.sourceIndex,
        );
      } else {
        const targetCol = columns.find((c) => c.status === targetStatus);
        const crossColIndex = targetCol ? targetCol.tasks.length : 0;
        handleCrossColumnDrop(taskId, targetStatus, crossColIndex);
      }

      dragState.current = null;
    },
    [columns, handleSameColumnDrop, handleCrossColumnDrop],
  );

  return { hasDragged, handleDragStart, handleDragOver, handleDrop };
}
