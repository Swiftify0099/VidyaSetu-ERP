/**
 * VidyaSetu ERP — Shared Pagination Component
 * ==============================================
 * Reusable pagination bar with page size selector.
 * Usage:
 *   <Pagination
 *     page={page}
 *     totalPages={10}
 *     total={200}
 *     pageSize={20}
 *     onPageChange={setPage}
 *     onPageSizeChange={setPageSize}
 *   />
 */
import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showInfo?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showInfo = true,
}) => {
  if (totalPages <= 0) return null;

  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  // Build page window: always show first, last, current ±1
  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - delta && i <= page + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className={styles.container}>
      {showInfo && (
        <span className={styles.info}>
          Showing {start}–{end} of {total} records
        </span>
      )}

      <div className={styles.controls}>
        {/* Prev */}
        <button
          className={styles.btn}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous page"
        >
          ‹
        </button>

        {/* Page numbers */}
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.btn} ${p === page ? styles.active : ''}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          className={styles.btn}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="Next page"
        >
          ›
        </button>
      </div>

      {/* Page size selector */}
      {onPageSizeChange && (
        <div className={styles.sizeSelector}>
          <label className={styles.sizeLabel}>Rows:</label>
          <select
            className={styles.sizeSelect}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
