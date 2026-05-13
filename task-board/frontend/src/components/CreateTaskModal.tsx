import { useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { Task, TaskStatus, TaskPriority } from '../types/task';
import { TASK_STATUSES, TASK_PRIORITIES } from '../types/task';
import { STATUS_I18N_KEYS, PRIORITY_I18N_KEYS } from '../i18n/labels';
import { useTaskForm } from '../hooks/useTaskForm';
import styles from './CreateTaskModal.module.css';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  task?: Task;
}

export function CreateTaskModal({ open, onClose, onSuccess, mode = 'create', task }: CreateTaskModalProps) {
  const intl = useIntl();

  const {
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
  } = useTaskForm(open, mode, task, onSuccess, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!open) return null;

  const submitBtnText = submitting
    ? intl.formatMessage({ id: mode === 'edit' ? 'task.saving' : 'task.creating' })
    : intl.formatMessage({ id: mode === 'edit' ? 'task.save' : 'task.create' });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={handleDialogClick}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="modal-title">
            {intl.formatMessage({ id: 'task.title' })}
          </label>
          <input
            id="modal-title"
            className={`${styles.input}${isTitleEmpty && !submitting ? ` ${styles.titleError}` : ''}`}
            type="text"
            placeholder={intl.formatMessage({ id: 'task.title_placeholder' })}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="modal-desc">
            {intl.formatMessage({ id: 'task.description' })}
          </label>
          <textarea
            id="modal-desc"
            className={styles.textarea}
            placeholder={intl.formatMessage({ id: 'task.description_placeholder' })}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="modal-status">
            {intl.formatMessage({ id: 'task.status' })}
          </label>
          <select
            id="modal-status"
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            disabled={submitting}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {intl.formatMessage({ id: STATUS_I18N_KEYS[s] })}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="modal-priority">
            {intl.formatMessage({ id: 'task.priority' })}
          </label>
          <select
            id="modal-priority"
            className={styles.select}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            disabled={submitting}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {intl.formatMessage({ id: PRIORITY_I18N_KEYS[p] })}
              </option>
            ))}
          </select>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.submitBtn}
          type="button"
          onClick={handleSubmit}
          disabled={isTitleEmpty || submitting}
        >
          {submitting ? (
            <>
              <span className={styles.spinner} />
              {submitBtnText}
            </>
          ) : (
            submitBtnText
          )}
        </button>
        {error && (
          <button
            className={styles.retryBtn}
            type="button"
            onClick={handleSubmit}
            disabled={isTitleEmpty || submitting}
          >
            {intl.formatMessage({ id: 'common.retry' })}
          </button>
        )}
      </div>
    </div>
  );
}
