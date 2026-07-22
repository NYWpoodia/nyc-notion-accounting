import React from 'react';

interface StatWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  accentColor?: 'blue' | 'green' | 'rose' | 'amber' | 'purple';
}

export const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'positive',
  icon,
  accentColor = 'blue',
}) => {
  const bgStyles = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  const changeColors = {
    positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    negative: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
    neutral: 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800',
  };

  return (
    <div className="bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark rounded-2xl p-5 shadow-notion-sm hover:shadow-notion-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-notion-text-muted dark:text-notion-text-darkMuted">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${bgStyles[accentColor]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-notion-text-main dark:text-notion-text-darkMain">
          {value}
        </div>
        <div className="flex items-center justify-between mt-2">
          {subtitle && (
            <span className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted">
              {subtitle}
            </span>
          )}
          {change && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${changeColors[changeType]}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
