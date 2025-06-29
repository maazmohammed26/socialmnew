import React from 'react';
import { cn } from '@/lib/utils';
import { toast as showToast } from '@/components/ui/sonner';
import { GradientText } from '@/components/ui/crimson-effects';
import { CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

interface CrimsonToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  important?: boolean;
  gradient?: boolean;
  icon?: React.ReactNode;
}

export function useCrimsonToast() {
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  const success = (options: CrimsonToastOptions) => {
    if (!isCrimson) {
      return showToast.success(options.title, {
        description: options.description,
        duration: options.duration,
        action: options.action && {
          label: options.action.label,
          onClick: options.action.onClick
        },
        cancel: options.cancel && {
          label: options.cancel.label,
          onClick: options.cancel.onClick
        },
        position: options.position,
        important: options.important
      });
    }
    
    return showToast.custom((id) => (
      <div className={cn(
        'bg-white rounded-lg p-4 shadow-lg border-l-4 border-green-500',
        'flex gap-3 items-start',
        options.gradient && 'bg-gradient-to-r from-white to-green-50'
      )}>
        <div className="flex-shrink-0 text-green-500">
          {options.icon || <CheckCircle className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          {options.title && (
            <div className="font-medium text-sm">
              {options.gradient ? (
                <GradientText gradientColors={['#22c55e', '#16a34a']}>
                  {options.title}
                </GradientText>
              ) : (
                options.title
              )}
            </div>
          )}
          {options.description && (
            <div className="text-sm text-gray-500 mt-1">
              {options.description}
            </div>
          )}
          {(options.action || options.cancel) && (
            <div className="flex gap-2 mt-2">
              {options.action && (
                <button 
                  onClick={() => {
                    options.action?.onClick();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                >
                  {options.action.label}
                </button>
              )}
              {options.cancel && (
                <button 
                  onClick={() => {
                    options.cancel?.onClick?.();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {options.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    ), {
      duration: options.duration,
      position: options.position,
      important: options.important
    });
  };
  
  const error = (options: CrimsonToastOptions) => {
    if (!isCrimson) {
      return showToast.error(options.title, {
        description: options.description,
        duration: options.duration,
        action: options.action && {
          label: options.action.label,
          onClick: options.action.onClick
        },
        cancel: options.cancel && {
          label: options.cancel.label,
          onClick: options.cancel.onClick
        },
        position: options.position,
        important: options.important
      });
    }
    
    return showToast.custom((id) => (
      <div className={cn(
        'bg-white rounded-lg p-4 shadow-lg border-l-4 border-red-500',
        'flex gap-3 items-start',
        options.gradient && 'bg-gradient-to-r from-white to-red-50'
      )}>
        <div className="flex-shrink-0 text-red-500">
          {options.icon || <AlertCircle className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          {options.title && (
            <div className="font-medium text-sm">
              {options.gradient ? (
                <GradientText gradientColors={['#dc2626', '#b91c1c']}>
                  {options.title}
                </GradientText>
              ) : (
                options.title
              )}
            </div>
          )}
          {options.description && (
            <div className="text-sm text-gray-500 mt-1">
              {options.description}
            </div>
          )}
          {(options.action || options.cancel) && (
            <div className="flex gap-2 mt-2">
              {options.action && (
                <button 
                  onClick={() => {
                    options.action?.onClick();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  {options.action.label}
                </button>
              )}
              {options.cancel && (
                <button 
                  onClick={() => {
                    options.cancel?.onClick?.();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {options.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    ), {
      duration: options.duration,
      position: options.position,
      important: options.important
    });
  };
  
  const info = (options: CrimsonToastOptions) => {
    if (!isCrimson) {
      return showToast.info(options.title, {
        description: options.description,
        duration: options.duration,
        action: options.action && {
          label: options.action.label,
          onClick: options.action.onClick
        },
        cancel: options.cancel && {
          label: options.cancel.label,
          onClick: options.cancel.onClick
        },
        position: options.position,
        important: options.important
      });
    }
    
    return showToast.custom((id) => (
      <div className={cn(
        'bg-white rounded-lg p-4 shadow-lg border-l-4 border-blue-500',
        'flex gap-3 items-start',
        options.gradient && 'bg-gradient-to-r from-white to-blue-50'
      )}>
        <div className="flex-shrink-0 text-blue-500">
          {options.icon || <Info className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          {options.title && (
            <div className="font-medium text-sm">
              {options.gradient ? (
                <GradientText gradientColors={['#3b82f6', '#2563eb']}>
                  {options.title}
                </GradientText>
              ) : (
                options.title
              )}
            </div>
          )}
          {options.description && (
            <div className="text-sm text-gray-500 mt-1">
              {options.description}
            </div>
          )}
          {(options.action || options.cancel) && (
            <div className="flex gap-2 mt-2">
              {options.action && (
                <button 
                  onClick={() => {
                    options.action?.onClick();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  {options.action.label}
                </button>
              )}
              {options.cancel && (
                <button 
                  onClick={() => {
                    options.cancel?.onClick?.();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {options.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    ), {
      duration: options.duration,
      position: options.position,
      important: options.important
    });
  };
  
  const notification = (options: CrimsonToastOptions) => {
    if (!isCrimson) {
      return showToast(options.title, {
        description: options.description,
        duration: options.duration,
        action: options.action && {
          label: options.action.label,
          onClick: options.action.onClick
        },
        cancel: options.cancel && {
          label: options.cancel.label,
          onClick: options.cancel.onClick
        },
        position: options.position,
        important: options.important
      });
    }
    
    return showToast.custom((id) => (
      <div className={cn(
        'bg-white rounded-lg p-4 shadow-lg border-l-4 border-red-500',
        'flex gap-3 items-start',
        options.gradient && 'bg-gradient-to-r from-white to-red-50'
      )}>
        <div className="flex-shrink-0 text-red-500">
          {options.icon || <Bell className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          {options.title && (
            <div className="font-medium text-sm">
              {options.gradient ? (
                <GradientText gradientColors={['#dc2626', '#b91c1c']}>
                  {options.title}
                </GradientText>
              ) : (
                options.title
              )}
            </div>
          )}
          {options.description && (
            <div className="text-sm text-gray-500 mt-1">
              {options.description}
            </div>
          )}
          {(options.action || options.cancel) && (
            <div className="flex gap-2 mt-2">
              {options.action && (
                <button 
                  onClick={() => {
                    options.action?.onClick();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  {options.action.label}
                </button>
              )}
              {options.cancel && (
                <button 
                  onClick={() => {
                    options.cancel?.onClick?.();
                    showToast.dismiss(id);
                  }}
                  className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {options.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    ), {
      duration: options.duration,
      position: options.position,
      important: options.important
    });
  };
  
  return {
    success,
    error,
    info,
    notification,
    dismiss: showToast.dismiss,
    // Regular toast for backward compatibility
    toast: showToast
  };
}