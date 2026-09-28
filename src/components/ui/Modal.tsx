import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  id?: string;
  bodyRef?: React.RefObject<HTMLDivElement | null>;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  id = 'global-modal',
  bodyRef,
}) => {
  const internalBodyRef = React.useRef<HTMLDivElement>(null);
  const activeBodyRef = bodyRef || internalBodyRef;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      if (activeBodyRef.current) {
        activeBodyRef.current.scrollTop = 0;
      }
      const raf = requestAnimationFrame(() => {
        if (activeBodyRef.current) {
          activeBodyRef.current.scrollTop = 0;
        }
      });
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
        cancelAnimationFrame(raf);
      };
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, activeBodyRef]);

  // When modal content/children change (e.g. step transitions in multi-step flows), reset scroll to top
  useEffect(() => {
    if (isOpen && activeBodyRef.current) {
      activeBodyRef.current.scrollTop = 0;
      const raf = requestAnimationFrame(() => {
        if (activeBodyRef.current) {
          activeBodyRef.current.scrollTop = 0;
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, children, activeBodyRef]);

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `${id}-title` : undefined}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 z-10 my-auto sm:my-8 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]',
              widths[maxWidth]
            )}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div>
                  {title && (
                    <h3 id={`${id}-title`} className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  id={`${id}-close-btn`}
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {!title && !subtitle && (
              <button
                type="button"
                id={`${id}-close-btn`}
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-700 bg-white/80 backdrop-blur rounded-full transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Body */}
            <div ref={activeBodyRef} className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
