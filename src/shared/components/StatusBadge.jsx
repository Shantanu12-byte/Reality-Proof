import React from 'react';
import { getStatusBadgeStyle } from '../../utils/formatters';

export const StatusBadge = ({ status, size = 'sm', showDot = true, className = '' }) => {
  const styles = getStatusBadgeStyle(status);
  
  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  }[size] || 'text-[11px] px-2.5 py-0.5';

  // Glow shadow for the dot based on status
  const getDotGlow = () => {
    const s = String(status).toLowerCase();
    if (s.includes('verif') || s.includes('complet') || s.includes('approv') || s.includes('captur') || s.includes('paid')) {
      return 'shadow-[0_0_8px_rgba(16,185,129,0.9)]';
    }
    if (s.includes('fail') || s.includes('flag') || s.includes('reject') || s.includes('quarant')) {
      return 'shadow-[0_0_8px_rgba(239,68,68,0.9)]';
    }
    if (s.includes('review') || s.includes('warn') || s.includes('hold')) {
      return 'shadow-[0_0_8px_rgba(245,158,11,0.9)]';
    }
    return 'shadow-[0_0_8px_rgba(37,99,235,0.8)]';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold font-mono tracking-tight rounded-full border shadow-2xs transition-all duration-200 hover:scale-105 hover:shadow-xs cursor-default ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot} ${getDotGlow()}`} />
      )}
      <span className="truncate">{status}</span>
    </span>
  );
};
