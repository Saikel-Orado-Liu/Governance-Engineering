import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { TaskStatus, TaskPriority } from '../types/task';
import { TASK_STATUSES, TASK_PRIORITIES } from '../types/task';
import { STATUS_I18N_KEYS, PRIORITY_I18N_KEYS } from '../i18n/labels';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  status: TaskStatus | '';
  priority: TaskPriority | '';
  search: string;
  onStatusChange: (status: TaskStatus | '') => void;
  onPriorityChange: (priority: TaskPriority | '') => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}

export function FilterBar({
  status,
  priority,
  search,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
  onClear,
}: FilterBarProps) {
  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onStatusChange(e.target.value as TaskStatus | '');
    },
    [onStatusChange],
  );

  const handlePriorityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPriorityChange(e.target.value as TaskPriority | '');
    },
    [onPriorityChange],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  const intl = useIntl();
  const hasFilter = status !== '' || priority !== '' || search !== '';

  return (
    <div className={styles.filterBar}>
      <select
        className={styles.select}
        value={status}
        onChange={handleStatusChange}
        aria-label={intl.formatMessage({ id: 'task.status' })}
      >
        <option value="">{intl.formatMessage({ id: 'filter.all_status' })}</option>
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {intl.formatMessage({ id: STATUS_I18N_KEYS[s] })}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={priority}
        onChange={handlePriorityChange}
        aria-label={intl.formatMessage({ id: 'task.priority' })}
      >
        <option value="">{intl.formatMessage({ id: 'filter.all_priority' })}</option>
        {TASK_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {intl.formatMessage({ id: PRIORITY_I18N_KEYS[p] })}
          </option>
        ))}
      </select>
      <input
        className={styles.input}
        type="text"
        placeholder={intl.formatMessage({ id: 'filter.search' })}
        value={search}
        onChange={handleSearchChange}
        aria-label={intl.formatMessage({ id: 'common.search' })}
      />
      {hasFilter && (
        <button className={styles.clearBtn} onClick={onClear} type="button">
          {intl.formatMessage({ id: 'filter.clear' })}
        </button>
      )}
    </div>
  );
}
