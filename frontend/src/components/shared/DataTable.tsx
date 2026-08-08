/**
 * VidyaSetu ERP — Shared DataTable Component
 * ============================================
 * Reusable table with sort, pagination, empty state, and loading.
 * Usage:
 *   <DataTable columns={cols} data={rows} loading={false} />
 */
import React, { useState } from 'react';
import type { TableColumn, SortConfig } from '../../types';
import styles from './DataTable.module.css';

interface DataTableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  keyExtractor?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  striped?: boolean;
  compact?: boolean;
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  emptyIcon = '📋',
  onSort,
  keyExtractor,
  onRowClick,
  striped = true,
  compact = false,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable || !onSort) return;
    const newDirection =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: newDirection });
    onSort(key, newDirection);
  };

  const getValue = (row: T, key: keyof T | string): unknown =>
    String(key).split('.').reduce((obj: unknown, k) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
      return undefined;
    }, row as unknown);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={`${styles.table} ${compact ? styles.compact : ''} ${striped ? styles.striped : ''}`}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`${styles.th} ${col.sortable ? styles.sortable : ''}`}
                style={{ width: col.width, textAlign: col.align || 'left' }}
                onClick={() => handleSort(String(col.key), col.sortable)}
              >
                <span>{col.header}</span>
                {col.sortable && (
                  <span className={styles.sortIcon}>
                    {sortConfig?.key === String(col.key)
                      ? sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                      : ' ↕'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>{emptyIcon}</span>
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor ? keyExtractor(row, index) : index}
                className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={styles.td}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render
                      ? col.render(getValue(row, col.key), row)
                      : String(getValue(row, col.key) ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
