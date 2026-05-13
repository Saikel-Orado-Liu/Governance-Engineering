import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const intl = useIntl();
  const visiblePages = useMemo(() => {
    if (totalPages <= 0) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const result: (number | 'ellipsis')[] = [];
    result.push(0);

    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages - 2, currentPage + 1);

    if (start > 1) result.push('ellipsis');
    for (let i = start; i <= end; i++) result.push(i);
    if (end < totalPages - 2) result.push('ellipsis');

    result.push(totalPages - 1);
    return result;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        {intl.formatMessage({ id: 'pagination.prev' })}
      </button>
      {visiblePages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`e-${idx}`} className={styles.ellipsis}>
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === currentPage ? styles.active : ''}`}
            disabled={p === currentPage}
            onClick={() => onPageChange(p)}
            type="button"
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        className={styles.pageBtn}
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        {intl.formatMessage({ id: 'pagination.next' })}
      </button>
    </nav>
  );
}
