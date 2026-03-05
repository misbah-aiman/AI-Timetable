import React, { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 px-4 pb-6 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`w-full transform rounded-3xl bg-white/95 p-5 shadow-2xl shadow-slate-900/40 ring-1 ring-slate-200/80 transition-all ${sizeClasses[size]} sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {title}
          </h2>
        )}
        <div className="text-sm text-slate-700">{children}</div>
        {footer && <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;

