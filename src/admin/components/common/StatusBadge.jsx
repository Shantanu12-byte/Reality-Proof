import React from 'react';
import { getStatusBadgeStyle } from '../../utils/formatters';

export const StatusBadge = ({ status, size = 'sm', showDot = true, className = '' }) => {
  const styles = getStatusBadgeStyle(status);
  
  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-xs px-3 py-1.5',
  }[size] || 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs transition-all duration-200 hover:scale-[1.02] ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      )}
      <span className="truncate">{status}</span>
    </span>
  );
};
