/**
 * Reusable UI Components for Admin Dashboard
 * Consolidates common UI patterns across pages
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ========================
// Loading Spinner
// ========================
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-[#F84565]`} />
    </div>
  );
};

// Full page loading state
export const PageLoader = () => (
  <div className="flex items-center justify-center h-96">
    <LoadingSpinner size="md" />
  </div>
);

// ========================
// Empty State
// ========================
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  className = '' 
}) => (
  <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
    {Icon && <Icon className="w-16 h-16 text-gray-600 mb-4" />}
    <p className="text-gray-400 text-lg">{title}</p>
    {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
    {action && actionLabel && (
      <button
        onClick={action}
        className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#F84565] hover:bg-[#F84565]/80 rounded-lg transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

// ========================
// Search Input
// ========================
export const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className = '' 
}) => (
  <div className={`relative flex-1 ${className}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-[#F84565] transition-colors text-white placeholder:text-gray-500"
    />
  </div>
);

// ========================
// Select Dropdown
// ========================
export const Select = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  label,
  className = '' 
}) => (
  <div className={`relative ${className}`}>
    {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-[#F84565] transition-colors text-white [&>option]:bg-zinc-800 [&>option]:text-white relative z-10"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// ========================
// Input Field
// ========================
export const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
  className = '',
  ...props
}) => (
  <div className={className}>
    {label && (
      <label className="block text-sm text-gray-400 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg focus:outline-none transition-colors text-white placeholder:text-gray-500 ${
        error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#F84565]'
      }`}
      {...props}
    />
    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
  </div>
);

// ========================
// Textarea
// ========================
export const Textarea = ({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
  className = '',
  ...props
}) => (
  <div className={className}>
    {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-[#F84565] transition-colors resize-none text-white placeholder:text-gray-500"
      {...props}
    />
  </div>
);

// ========================
// Button
// ========================
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon: Icon,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-[#F84565] hover:bg-[#F84565]/80 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    success: 'bg-green-600 hover:bg-green-500 text-white',
    ghost: 'hover:bg-white/10 text-gray-400 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// ========================
// Card
// ========================
export const Card = ({ 
  children, 
  title, 
  subtitle,
  action,
  className = '' 
}) => (
  <div className={`bg-zinc-900 rounded-xl border border-white/10 overflow-visible ${className}`}>
    {(title || action) && (
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          {title && <h3 className="font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

// ========================
// Stat Card
// ========================
export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  trendValue,
  color = 'blue',
  className = '' 
}) => {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
    pink: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <div className={`bg-zinc-900 rounded-xl p-4 border border-white/10 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        {trend && (
          <span className={`text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};

// ========================
// Badge / Status
// ========================
export const Badge = ({ 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: 'bg-white/10 text-gray-300',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ========================
// Pagination
// ========================
export const Pagination = ({ 
  page, 
  pages,
  totalPages, 
  total,
  onPageChange,
  className = '' 
}) => {
  const totalPagesValue = totalPages || pages;
  if (totalPagesValue <= 1) return null;

  const handlePageChange = (newPage, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onPageChange(newPage);
  };

  return (
    <div className={`flex items-center justify-between p-4 ${className}`}>
      <p className="text-sm text-gray-400">
        Page {page} of {totalPagesValue} {total ? `(${total} items)` : ''}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => handlePageChange(page - 1, e)}
          disabled={page === 1}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => handlePageChange(page + 1, e)}
          disabled={page >= totalPagesValue}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ========================
// Modal
// ========================
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children,
  footer,
  size = 'md',
  className = '' 
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  // Close when clicking on the overlay
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseDown={handleOverlayMouseDown}>
      <div className={`bg-zinc-900 rounded-xl border border-white/10 w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col ${className}`} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 relative">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-white/10 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================
// Confirm Dialog
// ========================
export const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ========================
// Table
// ========================
export const Table = ({ 
  columns, 
  data, 
  onRowClick,
  emptyState,
  className = '' 
}) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full">
      <thead className="bg-white/5 border-b border-white/10">
        <tr>
          {columns.map((col, idx) => (
            <th 
              key={idx} 
              className={`text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 ${col.className || ''}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10">
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-6 py-12 text-center">
              {emptyState || <span className="text-gray-500">No data available</span>}
            </td>
          </tr>
        ) : (
          data.map((row, rowIdx) => (
            <tr 
              key={row.id || rowIdx} 
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-6 py-4 ${col.cellClassName || ''}`}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ========================
// Avatar
// ========================
export const Avatar = ({ 
  name, 
  src, 
  size = 'md',
  className = '' 
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        className={`rounded-full object-cover ${sizes[size]} ${className}`} 
      />
    );
  }

  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${sizes[size]} ${className}`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
};

// ========================
// Tabs
// ========================
export const Tabs = ({ 
  tabs, 
  activeTab, 
  onChange,
  className = '' 
}) => (
  <div className={`flex gap-2 border-b border-white/10 ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
          activeTab === tab.id
            ? 'text-[#F84565] border-[#F84565]'
            : 'text-gray-400 border-transparent hover:text-white'
        }`}
      >
        {tab.icon && <tab.icon className="w-4 h-4 inline mr-2" />}
        {tab.label}
      </button>
    ))}
  </div>
);

// ========================
// Action Menu (Portal-based dropdown with fixed positioning)
// ========================
export const ActionMenu = ({ 
  isOpen, 
  onClose, 
  items,
  buttonRef,
  className = '' 
}) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position when menu opens
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176; // w-44 = 11rem = 176px
      const menuHeight = items.length * 44 + 8;
      
      let top = rect.bottom + 4;
      let left = rect.right - menuWidth;
      
      // Adjust if menu would go off screen bottom
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }
      
      // Adjust if menu would go off screen left
      if (left < 8) {
        left = 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, buttonRef, items.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && 
          buttonRef?.current && !buttonRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScroll = () => {
      onClose();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const menu = (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      className={`w-44 bg-zinc-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden py-1 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
            item.onClick();
          }}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
            item.variant === 'danger' 
              ? 'text-red-400 hover:bg-red-500/10' 
              : 'text-gray-300 hover:bg-white/10'
          }`}
        >
          {item.icon && <item.icon size={14} />}
          {item.label}
        </button>
      ))}
    </div>
  );

  return createPortal(menu, document.body);
};
