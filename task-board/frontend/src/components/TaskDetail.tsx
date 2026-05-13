import { useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { Task, TaskPriority } from '../types/task';
import { STATUS_I18N_KEYS, PRIORITY_I18N_KEYS } from '../i18n/labels';
import styles from './TaskDetail.module.css';

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const priorityColorClass: Record<TaskPriority, string> = {
  low: styles.priorityLow,
  medium: styles.priorityMedium,
  high: styles.priorityHigh,
};

export function TaskDetail({
  task,
  open,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailProps): JSX.Element | null {
  const handleEdit = useCallback(() => {
    if (task) onEdit(task);
  }, [task, onEdit]);

  const handleDelete = useCallback(() => {
    if (task) onDelete(task);
  }, [task, onDelete]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const intl = useIntl();

  if (!open || !task) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeBtn}
          onClick={onClose}
          type="button"
          aria-label={intl.formatMessage({ id: 'task.aria_close' })}
        >
          &times;
        </button>
        <div
          className={`${styles.priorityBar} ${priorityColorClass[task.priority]}`}
        >
          {intl.formatMessage({ id: PRIORITY_I18N_KEYS[task.priority] })}
        </div>
        <h2 className={styles.title}>{task.title}</h2>
        <p className={styles.description}>
          {task.description || intl.formatMessage({ id: 'task.no_description' })}
        </p>
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{intl.formatMessage({ id: 'task.status' })}</span>
            <span>{intl.formatMessage({ id: STATUS_I18N_KEYS[task.status] })}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{intl.formatMessage({ id: 'task.priority' })}</span>
            <span>{intl.formatMessage({ id: PRIORITY_I18N_KEYS[task.priority] })}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{intl.formatMessage({ id: 'task.created_at' })}</span>
            <span>{new Date(task.created_at).toLocaleString()}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{intl.formatMessage({ id: 'task.updated_at' })}</span>
            <span>{new Date(task.updated_at).toLocaleString()}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.editBtn} onClick={handleEdit} type="button">
            {intl.formatMessage({ id: 'task.edit' })}
          </button>
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            type="button"
          >
            {intl.formatMessage({ id: 'task.delete' })}
          </button>
        </div>
      </div>
    </div>
  );
}
