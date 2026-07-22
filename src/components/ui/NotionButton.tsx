import React from 'react';

interface NotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const NotionButton: React.FC<NotionButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none";

  const variants = {
    primary: "bg-notion-accent-blue text-white hover:bg-blue-600 shadow-notion-sm",
    secondary: "bg-notion-hover-light dark:bg-notion-hover-dark text-notion-text-main dark:text-notion-text-darkMain border border-notion-border-light dark:border-notion-border-dark hover:bg-black/5 dark:hover:bg-white/10",
    ghost: "text-notion-text-main dark:text-notion-text-darkMain hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark",
    danger: "bg-notion-accent-rose text-white hover:bg-red-600 shadow-notion-sm",
    success: "bg-notion-accent-green text-white hover:bg-emerald-700 shadow-notion-sm",
  };

  const sizes = {
    sm: "text-xs px-2.5 py-1 gap-1.5",
    md: "text-sm px-3.5 py-1.5 gap-2",
    lg: "text-base px-4 py-2 gap-2.5",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
