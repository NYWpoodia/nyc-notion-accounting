import React from 'react';

interface NotionCardProps {
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const NotionCard: React.FC<NotionCardProps> = ({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className = '',
  hoverable = false,
}) => {
  return (
    <div
      className={`bg-notion-card-light dark:bg-notion-card-dark rounded-xl border border-notion-border-light dark:border-notion-border-dark p-5 transition-all duration-200 ${
        hoverable ? 'hover:shadow-notion-md hover:-translate-y-0.5' : 'shadow-notion-sm'
      } ${className}`}
    >
      {(title || icon || headerAction) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-notion-border-light dark:border-notion-border-dark">
          <div className="flex items-center gap-2.5">
            {icon && <div className="p-2 rounded-lg bg-notion-hover-light dark:bg-notion-hover-dark text-notion-text-main dark:text-notion-text-darkMain">{icon}</div>}
            <div>
              {title && <h3 className="font-semibold text-base text-notion-text-main dark:text-notion-text-darkMain">{title}</h3>}
              {subtitle && <p className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
