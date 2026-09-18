import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98] whitespace-nowrap tracking-tight';

    const variants: Record<string, string> = {
      primary: 'bg-[#0F2747] hover:bg-[#0B1D3A] text-white focus-visible:ring-[#0F2747] shadow-sm shadow-[#0F2747]/20 hover:shadow-md hover:shadow-[#0F2747]/25',
      secondary: 'bg-[#1B4332] hover:bg-[#112A1F] text-[#FAF9F6] focus-visible:ring-[#1B4332] shadow-sm shadow-[#1B4332]/15',
      outline: 'bg-transparent border border-[#D5CFC5] text-[#1A1A1A] hover:bg-[#F2EDE4] hover:border-[#1A1A1A]/40 focus-visible:ring-[#1A1A1A]/20',
      ghost: 'bg-transparent hover:bg-[#F2EDE4] text-[#2C2926] hover:text-[#1A1A1A] focus-visible:ring-[#D5CFC5]',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600 shadow-sm shadow-red-600/20',
      // Legacy mappings to primary:
      accent: 'bg-[#0F2747] hover:bg-[#0B1D3A] text-white focus-visible:ring-[#0F2747] shadow-sm shadow-[#0F2747]/20 hover:shadow-md hover:shadow-[#0F2747]/25',
      navy: 'bg-[#0F2747] hover:bg-[#0B1D3A] text-white focus-visible:ring-[#0F2747] shadow-sm'
    };

    const sizes = {
      sm: 'text-xs px-3.5 py-2 min-h-[36px] gap-1.5',
      md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
      lg: 'text-base px-6 py-3.5 min-h-[48px] gap-2.5 font-semibold'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant] || variants.primary,
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';


