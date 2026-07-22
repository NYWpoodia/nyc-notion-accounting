import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface NotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const NotionModal: React.FC<NotionModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = '2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box with max-h-[88vh] Viewport Constraint & Fixed Header/Scrollable Body */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[88vh] flex flex-col bg-notion-card-light dark:bg-notion-card-dark rounded-2xl border border-notion-border-light dark:border-notion-border-dark shadow-2xl overflow-hidden animate-slide-up z-10`}
      >
        {/* Fixed Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-notion-border-light dark:border-notion-border-dark bg-notion-sidebar-light dark:bg-notion-sidebar-dark shrink-0">
          <div className="flex items-center gap-3">
            {icon && <div className="p-2 rounded-xl bg-notion-hover-light dark:bg-notion-hover-dark shrink-0">{icon}</div>}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-notion-text-main dark:text-notion-text-darkMain tracking-tight leading-snug">{title}</h2>
              {subtitle && <p className="text-xs sm:text-sm text-notion-text-muted dark:text-notion-text-darkMuted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-notion-text-muted hover:text-notion-text-main hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors shrink-0 ml-2"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
};
