import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  isLoading = false, 
  children, 
  className = '',
  disabled,
  ...props 
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center
        px-6 py-3
        bg-primary-600 hover:bg-primary-700
        text-white font-medium
        rounded-lg
        transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Carregando...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
