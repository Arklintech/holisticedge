import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: 'blue' | 'teal' | 'orange' | 'neutral' | 'success' | 'outline' | 'verified' | 'editorial';
  size: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'editorial',
  size = 'md',
  children,
  ...props
}) => {
  const base = 'inline-flex items-center font-medium rounded-full tracking-wide transition-colors whitespace-nowrap';

  const variants = {
    editorial: 'bg-[#F2ECE4] text-[#3D3730] border border-[#DDD4C7]',
    blue: 'bg-[#EBF2F7] text-[#1A365D] border border-[#CBDCE9]',
    teal: 'bg-[#EAF2ED] text-[#1B4332] border border-[#C5DACB]',
    orange: 'bg-[#F0F4F8] text-[#0F2747] border border-[#CBD8E6]',
    neutral: 'bg-[#F0ECE4] text-[#4A443D] border border-[#E0D8CC]',
    success: 'bg-[#EAF2ED] text-[#1B4332] border border-[#C5DACB]',
    outline: 'bg-transparent border border-[#DDD7CD] text-[#3D3730]',
    verified: 'bg-[#EAF2ED] text-[#1B4332] border border-[#BBD4C3] font-semibold'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5'
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

