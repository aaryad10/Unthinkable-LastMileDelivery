import React from 'react';
import { DeliveryStatus } from '../types';

interface StatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
  id?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', id }) => {
  const getColors = (status: DeliveryStatus) => {
    switch (status) {
      case 'Created':
        return {
          bg: 'bg-slate-50/80 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400'
        };
      case 'Picked Up':
        return {
          bg: 'bg-amber-50/80 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
      case 'In Transit':
        return {
          bg: 'bg-blue-50/80 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500'
        };
      case 'Out for Delivery':
        return {
          bg: 'bg-purple-50/80 text-purple-800 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800',
          dot: 'bg-purple-500'
        };
      case 'Delivered':
        return {
          bg: 'bg-emerald-50/80 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'Failed':
        return {
          bg: 'bg-rose-50/80 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500'
        };
      default:
        return {
          bg: 'bg-gray-50/80 text-gray-800 border-gray-200 dark:bg-gray-850/20 dark:text-gray-300 dark:border-gray-800',
          dot: 'bg-gray-500'
        };
    }
  };

  const colors = getColors(status);

  return (
    <span
      id={id || `status-${status.toLowerCase().replace(/\s+/g, '-')}`}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${colors.dot}`} />
      {status}
    </span>
  );
};