/**
 * VidyaSetu ERP — ExportButton Component
 * One-click PDF or Excel download with loading state and toast feedback.
 */
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  label?: string;
  format: 'pdf' | 'excel';
  onExport: () => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'ghost';
}

const FORMAT_ICONS = { pdf: '📄', excel: '📊' };
const FORMAT_LABELS = { pdf: 'PDF', excel: 'Excel' };

export function ExportButton({
  label,
  format,
  onExport,
  disabled = false,
  size = 'md',
  variant = 'secondary',
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const toastId = toast.loading(`Generating ${FORMAT_LABELS[format]}...`);
    try {
      await onExport();
      toast.success(`${FORMAT_LABELS[format]} downloaded!`, { id: toastId });
    } catch (err) {
      toast.error(`Failed to export ${FORMAT_LABELS[format]}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={[
        styles.btn,
        styles[size],
        styles[variant],
        loading || disabled ? styles.disabled : '',
      ].join(' ')}
      onClick={handleClick}
      disabled={loading || disabled}
      title={`Download ${FORMAT_LABELS[format]}`}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <span>{FORMAT_ICONS[format]}</span>
      )}
      {label ?? FORMAT_LABELS[format]}
    </button>
  );
}
