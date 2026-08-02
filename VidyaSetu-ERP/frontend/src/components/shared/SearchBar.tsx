/**
 * VidyaSetu ERP — Shared SearchBar Component
 * ============================================
 * Debounced search input with clear button and filter support.
 * Usage:
 *   <SearchBar
 *     value={search}
 *     onChange={setSearch}
 *     placeholder="Search by name, GR number..."
 *     filters={<Select .../>}
 *   />
 */
import React, { useEffect, useRef, useState } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  disabled?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  filters,
  actions,
  disabled = false,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.input}
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Search"
        />
        {localValue && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            title="Clear search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {filters && <div className={styles.filters}>{filters}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};
