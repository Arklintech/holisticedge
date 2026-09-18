import React from 'react';
import type {
  AppointmentStatus,
  LeadStatus,
  TestimonialStatus,
  NotificationStatus,
} from '../../types/admin.types';
import { cn } from '../../../lib/utils';

type StatusVariant = AppointmentStatus | LeadStatus | TestimonialStatus | NotificationStatus | 'Published' | 'Draft' | 'Archived';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  // Appointments
  Pending:           { label: 'Pending',     bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  Confirmed:         { label: 'Confirmed',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  Completed:         { label: 'Completed',   bg: 'bg-[#F0F4F8]', text: 'text-[#1A365D]',  dot: 'bg-[#3B82F6]' },
  Cancelled:         { label: 'Cancelled',   bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  'No-show':         { label: 'No-show',     bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  // Leads
  New:               { label: 'New',         bg: 'bg-[#EFF6FF]', text: 'text-[#1E40AF]',  dot: 'bg-[#3B82F6]' },
  Contacted:         { label: 'Contacted',   bg: 'bg-[#F0F4F8]', text: 'text-[#1A365D]',  dot: 'bg-[#60A5FA]' },
  Interested:        { label: 'Interested',  bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'Appointment Booked': { label: 'Booked',  bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  'Follow-up':       { label: 'Follow-up',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  Converted:         { label: 'Converted',  bg: 'bg-green-50',  text: 'text-green-800',  dot: 'bg-green-600' },
  'Not Interested':  { label: 'Not Interested', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  Closed:            { label: 'Closed',      bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  // Testimonials
  Approved:          { label: 'Approved',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  Rejected:          { label: 'Rejected',    bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  Archived:          { label: 'Archived',    bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  // Notifications
  unread:            { label: 'Unread',      bg: 'bg-[#F0F4F8]', text: 'text-[#0F2747]',  dot: 'bg-[#0F2747]' },
  read:              { label: 'Read',        bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  // Content
  Published:         { label: 'Published',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  Draft:             { label: 'Draft',       bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'sm', showDot = true, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || {
    label: status,
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
      config.bg,
      config.text,
      size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      className
    )}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />}
      {config.label}
    </span>
  );
}
