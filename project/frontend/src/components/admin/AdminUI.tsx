import React from 'react';
import { IconCheck, IconX, IconAlertTriangle } from './AdminIcons';

// ============================================================================
// 1. HELPERS & FORMATTERS
// ============================================================================
export const formatMoney = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
};

export const formatDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateTime = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// ============================================================================
// 2. BUTTONS
// ============================================================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors select-none rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#B4532A]/30 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-2',
    lg: 'h-10 px-4 text-[15px] gap-2',
  }[size];

  const variantClasses = {
    primary: 'bg-[#B4532A] hover:bg-[#9C431F] active:bg-[#863717] text-white border border-[#B4532A]',
    secondary: 'bg-[#F2EFE9] hover:bg-[#E8E4DC] active:bg-[#DDD8CE] text-[#2E2A27] border border-[#DDD7CE]',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white border border-[#DC2626]',
    outline: 'bg-white hover:bg-[#F9F8F6] text-[#2E2A27] border border-[#DDD7CE]',
    ghost: 'bg-transparent hover:bg-[#F2EFE9] text-[#2E2A27]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

// ============================================================================
// 3. BADGES
// ============================================================================
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'terracotta';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  const variantClasses = {
    success: 'bg-[#EDF5F1] text-[#2A694E] border border-[#C6E7D2]',
    warning: 'bg-[#FDF7EE] text-[#9C5B14] border border-[#F7DCB4]',
    danger: 'bg-[#FDF2F2] text-[#A83232] border border-[#F5C2C2]',
    neutral: 'bg-[#F4F2EE] text-[#57534E] border border-[#E7E2DA]',
    info: 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
    terracotta: 'bg-[#FAF0EB] text-[#B4532A] border border-[#F0D5C7]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-[4px] leading-tight shrink-0 whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};

// ============================================================================
// 4. FORM CONTROLS: INPUT, SELECT, TEXTAREA
// ============================================================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-[#44403C] mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full h-9 px-3 text-sm bg-white text-[#1C1917] border rounded-[6px] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#B4532A] focus:border-[#B4532A] transition-colors disabled:bg-[#F5F3EF] disabled:text-[#A8A29E] disabled:cursor-not-allowed ${
          error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]' : 'border-[#DDD7CE]'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-[#78716C]">{helperText}</p>}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  children,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-[#44403C] mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full h-9 px-3 text-sm bg-white text-[#1C1917] border rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#B4532A] focus:border-[#B4532A] transition-colors disabled:bg-[#F5F3EF] disabled:cursor-not-allowed ${
          error ? 'border-[#DC2626]' : 'border-[#DDD7CE]'
        } ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const textareaId =
    id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-[#44403C] mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full p-3 text-sm bg-white text-[#1C1917] border rounded-[6px] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#B4532A] focus:border-[#B4532A] transition-colors disabled:bg-[#F5F3EF] ${
          error ? 'border-[#DC2626]' : 'border-[#DDD7CE]'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-[#78716C]">{helperText}</p>}
    </div>
  );
};

// ============================================================================
// 5. TABLE & SKELETON & EMPTY STATE
// ============================================================================
export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const TableContainer: React.FC<TableProps> = ({ children, className = '' }) => (
  <div className={`w-full overflow-x-auto bg-white border border-[#E5E0D8] rounded-[6px] ${className}`}>
    <table className="w-full text-left border-collapse">{children}</table>
  </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-[#F9F8F6] text-[13px] font-medium text-[#78716C] border-b border-[#E5E0D8] select-none">
    {children}
  </thead>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tr
    className={`h-12 border-b border-[#EBE7E0] hover:bg-[#FAF9F7] text-[14px] text-[#1C1917] transition-colors ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => (
  <div className="w-full bg-white border border-[#E5E0D8] rounded-[6px] p-4 space-y-3">
    <div className="h-9 bg-[#F4F2EE] rounded-[4px] animate-pulse w-full mb-3" />
    {Array.from({ length: rows }).map((_, rIdx) => (
      <div key={rIdx} className="flex gap-4 items-center h-10 border-b border-[#F4F2EE]">
        {Array.from({ length: columns }).map((__, cIdx) => (
          <div
            key={cIdx}
            className="h-4 bg-[#EBE7E0] rounded-[3px] animate-pulse"
            style={{ width: `${Math.floor(60 + ((cIdx * 23) % 40))}%` }}
          />
        ))}
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionText, onAction, icon }) => (
  <div className="w-full py-12 px-4 text-center bg-white border border-[#E5E0D8] rounded-[6px]">
    {icon && <div className="mx-auto w-10 h-10 text-[#A8A29E] mb-3 flex items-center justify-center">{icon}</div>}
    <h3 className="text-sm font-semibold text-[#1C1917]">{title}</h3>
    {description && <p className="mt-1 text-xs text-[#78716C] max-w-sm mx-auto">{description}</p>}
    {actionText && onAction && (
      <div className="mt-4">
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      </div>
    )}
  </div>
);

// ============================================================================
// 6. PAGINATION
// ============================================================================
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  if (totalItems <= 0) return null;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-[#FAF9F7] border border-[#E5E0D8] border-t-0 rounded-b-[6px] text-xs text-[#78716C]">
      <div>
        Hiển thị <span className="font-medium text-[#1C1917]">{startItem}</span> -{' '}
        <span className="font-medium text-[#1C1917]">{endItem}</span> trong{' '}
        <span className="font-medium text-[#1C1917]">{totalItems}</span> bản ghi
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </Button>
        <span className="px-2 text-xs font-medium text-[#1C1917]">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// 7. STAT ROW (KPI - HÀNG SỐ ĐƠN GIẢN, TRÁNH CARD AI LẶP LẠI)
// ============================================================================
export interface StatItem {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}

export const StatRow: React.FC<{ items: StatItem[]; className?: string }> = ({
  items,
  className = '',
}) => (
  <div
    className={`w-full bg-white border border-[#E5E0D8] rounded-[6px] flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-[#E5E0D8] ${className}`}
  >
    {items.map((it, idx) => (
      <div key={idx} className="flex-1 min-w-[200px] p-4">
        <div className="text-[12px] font-medium uppercase tracking-wider text-[#78716C] mb-1">
          {it.label}
        </div>
        <div
          className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
            it.highlight ? 'text-[#B4532A]' : 'text-[#1C1917]'
          }`}
        >
          {it.value}
        </div>
        {it.subValue && <div className="text-xs text-[#78716C] mt-1">{it.subValue}</div>}
      </div>
    ))}
  </div>
);

// ============================================================================
// 8. MODAL & CONFIRM DIALOG
// ============================================================================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 select-none">
      <div
        className={`w-full ${widthClass} bg-white border border-[#DDD7CE] rounded-[6px] shadow-lg overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E0D8] bg-[#FAF9F7]">
          <h3 className="text-base font-semibold text-[#1C1917]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] p-1 rounded hover:bg-[#EBE7E0] transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-sm text-[#44403C] space-y-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[#E5E0D8] bg-[#FAF9F7]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  reasonRequired?: boolean;
  onReasonChange?: (val: string) => void;
  reasonValue?: string;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  reasonRequired = false,
  onReasonChange,
  reasonValue = '',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            disabled={reasonRequired && !reasonValue.trim()}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            variant === 'danger' ? 'bg-[#FDF2F2] text-[#DC2626]' : 'bg-[#FAF0EB] text-[#B4532A]'
          }`}
        >
          <IconAlertTriangle className="w-4 h-4" />
        </div>
        <div className="space-y-2 flex-1">
          <p className="text-sm text-[#44403C] leading-relaxed">{message}</p>
          {reasonRequired && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                Lý do thực hiện <span className="text-[#DC2626]">*</span>
              </label>
              <Input
                placeholder="Nhập lý do thao tác để lưu vào nhật ký..."
                value={reasonValue}
                onChange={(e) => onReasonChange && onReasonChange(e.target.value)}
              />
            </div>
          )}
          {children}
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// 9. DRAWER (RIGHT PANEL TRƯỢT SANG)
// ============================================================================
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  badge,
  children,
  footer,
  width = 'max-w-xl',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40">
      <div
        className={`w-full ${width} h-full bg-white border-l border-[#DDD7CE] shadow-2xl flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8] bg-[#FAF9F7]">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-[#1C1917]">{title}</h3>
            {badge}
          </div>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] p-1.5 rounded hover:bg-[#EBE7E0] transition-colors cursor-pointer"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm text-[#44403C]">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#E5E0D8] bg-[#FAF9F7]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 10. TOAST NOTIFICATION
// ============================================================================
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const borderClass = {
    success: 'border-[#C6E7D2] bg-[#EDF5F1] text-[#2A694E]',
    error: 'border-[#F5C2C2] bg-[#FDF2F2] text-[#A83232]',
    warning: 'border-[#F7DCB4] bg-[#FDF7EE] text-[#9C5B14]',
    info: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
  }[type];

  return (
    <div
      className={`fixed top-5 right-5 z-[100] max-w-sm flex items-center gap-2.5 px-4 py-3 border rounded-[6px] shadow-md text-sm select-none animate-fadeIn ${borderClass}`}
    >
      <span className="shrink-0">
        {type === 'success' && <IconCheck className="w-4 h-4" />}
        {type === 'error' && <IconX className="w-4 h-4" />}
        {type === 'warning' && <IconAlertTriangle className="w-4 h-4" />}
      </span>
      <span className="flex-1 font-medium">{message}</span>
      <button onClick={onClose} className="p-0.5 hover:opacity-75 cursor-pointer">
        <IconX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
