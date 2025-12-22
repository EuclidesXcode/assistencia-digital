import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  id,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          id={id}
          className={`
            w-full px-4 py-2.5 
            ${Icon ? 'pl-10' : ''} 
            border border-slate-300 
            rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            transition-all
            placeholder:text-slate-400
            text-slate-600
            ${className}
          `}
          {...props}
        />
      </div>
    </div>
  );
};
