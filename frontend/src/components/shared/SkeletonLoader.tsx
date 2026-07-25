import React from 'react';
import styles from './SkeletonLoader.module.css';

export interface SkeletonLoaderProps {
  variant?: 'text' | 'title' | 'avatar' | 'card' | 'tableRow' | 'button';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  style = {},
}) => {
  const variantClass = styles[variant] || styles.text;
  const items = Array.from({ length: count });

  const customStyle: React.CSSProperties = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <>
      {items.map((_, idx) => (
        <div
          key={idx}
          className={`${styles.skeleton} ${variantClass} ${className}`}
          style={customStyle}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export default SkeletonLoader;
