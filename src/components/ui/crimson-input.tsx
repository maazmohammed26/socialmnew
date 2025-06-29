import React from 'react';
import { cn } from '@/lib/utils';
import { Input, InputProps } from '@/components/ui/input';
import { Textarea, TextareaProps } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CrimsonInputProps extends InputProps {
  label?: string;
  error?: string;
  gradient?: boolean;
  glow?: boolean;
}

export function CrimsonInput({
  className,
  label,
  error,
  gradient = false,
  glow = false,
  ...props
}: CrimsonInputProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <Input className={className} {...props} />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id}
          className="text-sm font-medium"
        >
          {label}
        </Label>
      )}
      <Input
        className={cn(
          gradient && 'border-red-200 focus:border-red-400',
          glow && 'focus:shadow-md focus:shadow-red-100',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

interface CrimsonTextareaProps extends TextareaProps {
  label?: string;
  error?: string;
  gradient?: boolean;
  glow?: boolean;
}

export function CrimsonTextarea({
  className,
  label,
  error,
  gradient = false,
  glow = false,
  ...props
}: CrimsonTextareaProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <Textarea className={className} {...props} />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id}
          className="text-sm font-medium"
        >
          {label}
        </Label>
      )}
      <Textarea
        className={cn(
          gradient && 'border-red-200 focus:border-red-400',
          glow && 'focus:shadow-md focus:shadow-red-100',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

export function CrimsonSearchInput({
  className,
  placeholder = 'Search...',
  ...props
}: InputProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Input
        type="search"
        placeholder={placeholder}
        className={className}
        {...props}
      />
    );
  }
  
  return (
    <Input
      type="search"
      placeholder={placeholder}
      className={cn(
        'bg-red-50/50 border-red-100 focus:border-red-300',
        'focus:bg-white transition-all duration-300',
        'rounded-full pl-4',
        className
      )}
      {...props}
    />
  );
}