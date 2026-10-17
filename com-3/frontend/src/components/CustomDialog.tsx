"use client";
import React, { useState, useEffect } from 'react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

export interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 1. Sleek Toast Notification Container
export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
      width: 'calc(100vw - 48px)',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const accentColor = isSuccess ? '#0D9488' : isError ? '#EF4444' : '#4F46E5';
        const iconSymbol = isSuccess ? '✓' : isError ? '✕' : 'ℹ';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: '#FFFFFF',
              border: `1px solid #E2E8F0`,
              borderLeft: `5px solid ${accentColor}`,
              borderRadius: '10px',
              padding: '0.9rem 1.1rem',
              boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              animation: 'toastSlideIn 0.25s ease-out',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: isSuccess ? '#CCFBF1' : isError ? '#FEE2E2' : '#EEF2FF',
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              {iconSymbol}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E3A8A', marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.45, wordBreak: 'break-word' }}>
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0 4px',
                lineHeight: 1,
                alignSelf: 'flex-start'
              }}
              title="Close"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}

// 2. Modern Interactive Prompt Dialog (Replaces window.prompt)
export function CustomPromptDialog({
  isOpen,
  title,
  subtitle,
  defaultValue = '',
  placeholder = 'Type here...',
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9990,
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '460px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 25px 50px -12px rgba(30, 58, 138, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Deep Navy Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
          padding: '1.25rem 1.5rem',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#93C5FD' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#FFFFFF',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}
          >
            &times;
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
              Document Name / Value:
            </label>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.92rem',
                color: '#0F172A',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => (e.target.style.borderColor = '#4F46E5')}
              onBlur={e => (e.target.style.borderColor = '#CBD5E1')}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.65rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Modern Confirmation Dialog (Replaces window.confirm)
export function CustomConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9995,
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '460px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: isDanger ? '#FEF2F2' : '#F0FDF4',
          borderBottom: `1px solid ${isDanger ? '#FEE2E2' : '#DCFCE7'}`,
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isDanger ? '#EF4444' : '#0D9488',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 800
          }}>
            {isDanger ? '!' : '✓'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: isDanger ? '#991B1B' : '#115E59' }}>
              {title}
            </h3>
            <span style={{ fontSize: '0.78rem', color: isDanger ? '#B91C1C' : '#047857' }}>
              Security Confirmation
            </span>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {message}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                background: isDanger 
                  ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' 
                  : 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: isDanger ? '0 4px 12px rgba(239, 68, 68, 0.35)' : '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
