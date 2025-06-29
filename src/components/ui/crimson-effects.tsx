import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ShimmerEffectProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function ShimmerEffect({ children, className, disabled = false }: ShimmerEffectProps) {
  return (
    <div className={cn(
      'relative overflow-hidden',
      !disabled && 'crimson-shimmer',
      className
    )}>
      {children}
    </div>
  );
}

interface GlowEffectProps {
  children: React.ReactNode;
  className?: string;
  color?: 'red' | 'pink' | 'orange';
  intensity?: 'low' | 'medium' | 'high';
  disabled?: boolean;
}

export function GlowEffect({ 
  children, 
  className, 
  color = 'red',
  intensity = 'medium',
  disabled = false
}: GlowEffectProps) {
  const colorMap = {
    red: 'rgba(220, 38, 38, ',
    pink: 'rgba(236, 72, 153, ',
    orange: 'rgba(234, 88, 12, '
  };
  
  const intensityMap = {
    low: '0.2)',
    medium: '0.3)',
    high: '0.4)'
  };
  
  const glowColor = `${colorMap[color]}${intensityMap[intensity]}`;
  
  return (
    <div 
      className={cn('transition-all duration-300', className)}
      style={!disabled ? {
        filter: `drop-shadow(0 0 8px ${glowColor})`
      } : {}}
    >
      {children}
    </div>
  );
}

interface PulseEffectProps {
  children: React.ReactNode;
  className?: string;
  speed?: 'slow' | 'medium' | 'fast';
  disabled?: boolean;
}

export function PulseEffect({ 
  children, 
  className,
  speed = 'medium',
  disabled = false
}: PulseEffectProps) {
  const speedMap = {
    slow: 'animate-pulse-slow',
    medium: 'animate-pulse',
    fast: 'animate-pulse-fast'
  };
  
  return (
    <div className={cn(
      'transition-all duration-300',
      !disabled && speedMap[speed],
      className
    )}>
      {children}
    </div>
  );
}

interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  borderWidth?: number;
  gradientColors?: string[];
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  animated?: boolean;
}

export function GradientBorder({
  children,
  className,
  borderWidth = 2,
  gradientColors = ['#dc2626', '#b91c1c'],
  rounded = 'md',
  animated = false
}: GradientBorderProps) {
  const roundedMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };
  
  const gradient = `linear-gradient(135deg, ${gradientColors.join(', ')})`;
  
  return (
    <div 
      className={cn(
        'relative p-[2px]',
        roundedMap[rounded],
        animated && 'crimson-animated-gradient',
        className
      )}
      style={{
        padding: borderWidth,
        background: gradient,
        backgroundSize: animated ? '200% 200%' : '100% 100%'
      }}
    >
      <div className={cn(
        'bg-white h-full w-full',
        roundedMap[rounded]
      )}>
        {children}
      </div>
    </div>
  );
}

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  amplitude?: 'small' | 'medium' | 'large';
  speed?: 'slow' | 'medium' | 'fast';
  disabled?: boolean;
}

export function FloatingElement({
  children,
  className,
  amplitude = 'medium',
  speed = 'medium',
  disabled = false
}: FloatingElementProps) {
  const [style, setStyle] = useState({});
  
  useEffect(() => {
    if (disabled) return;
    
    const amplitudeMap = {
      small: 3,
      medium: 5,
      large: 8
    };
    
    const speedMap = {
      slow: 5,
      medium: 3,
      fast: 2
    };
    
    const animationDuration = `${speedMap[speed]}s`;
    const translateY = `translateY(-${amplitudeMap[amplitude]}px)`;
    
    setStyle({
      animation: `floatAnimation ${animationDuration} ease-in-out infinite`
    });
    
    // Add keyframes to document if they don't exist
    if (!document.querySelector('#crimson-keyframes')) {
      const style = document.createElement('style');
      style.id = 'crimson-keyframes';
      style.innerHTML = `
        @keyframes floatAnimation {
          0% { transform: translateY(0); }
          50% { transform: ${translateY}; }
          100% { transform: translateY(0); }
        }
        
        @keyframes shimmerAnimation {
          to { left: 100%; }
        }
        
        .crimson-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0) 0%, 
            rgba(255, 255, 255, 0.2) 50%, 
            rgba(255, 255, 255, 0) 100%);
          animation: shimmerAnimation 2s infinite;
        }
        
        .crimson-animated-gradient {
          animation: gradientAnimation 3s ease infinite;
        }
        
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-pulse-fast {
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `;
      document.head.appendChild(style);
    }
    
  }, [amplitude, speed, disabled]);
  
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradientColors?: string[];
  animated?: boolean;
}

export function GradientText({
  children,
  className,
  gradientColors = ['#dc2626', '#b91c1c'],
  animated = false
}: GradientTextProps) {
  const gradient = `linear-gradient(135deg, ${gradientColors.join(', ')})`;
  
  return (
    <span 
      className={cn(
        'inline-block font-semibold',
        animated && 'crimson-animated-gradient',
        className
      )}
      style={{
        background: gradient,
        backgroundSize: animated ? '200% 200%' : '100% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent'
      }}
    >
      {children}
    </span>
  );
}

interface MicroInteractionProps {
  children: React.ReactNode;
  className?: string;
  type?: 'ripple' | 'shimmer' | 'scale' | 'lift';
  disabled?: boolean;
}

export function MicroInteraction({
  children,
  className,
  type = 'shimmer',
  disabled = false
}: MicroInteractionProps) {
  const [interactionClass, setInteractionClass] = useState('');
  
  useEffect(() => {
    if (disabled) return;
    
    switch (type) {
      case 'ripple':
        setInteractionClass('crimson-ripple');
        break;
      case 'shimmer':
        setInteractionClass('crimson-shimmer');
        break;
      case 'scale':
        setInteractionClass('hover:scale-105 active:scale-95 transition-transform');
        break;
      case 'lift':
        setInteractionClass('hover:-translate-y-1 active:translate-y-0 transition-transform');
        break;
      default:
        setInteractionClass('');
    }
    
    // Add ripple effect if needed
    if (type === 'ripple' && !document.querySelector('#crimson-ripple-style')) {
      const style = document.createElement('style');
      style.id = 'crimson-ripple-style';
      style.innerHTML = `
        .crimson-ripple {
          position: relative;
          overflow: hidden;
        }
        
        .crimson-ripple .ripple {
          position: absolute;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple-animation 0.6s linear;
          pointer-events: none;
        }
        
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
  }, [type, disabled]);
  
  const handleRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || type !== 'ripple') return;
    
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        interactionClass,
        className
      )}
      onClick={type === 'ripple' ? handleRipple : undefined}
    >
      {children}
    </div>
  );
}

export function CrimsonCard({
  children,
  className,
  hover = true,
  gradient = false,
  shimmer = false,
  glow = false,
  border = false
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  shimmer?: boolean;
  glow?: boolean;
  border?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl bg-white p-4',
      hover && 'hover:-translate-y-1 transition-transform',
      gradient && 'bg-gradient-to-br from-white to-red-50',
      border && 'border border-red-100',
      glow && 'shadow-lg shadow-red-100/50',
      className
    )}>
      {shimmer ? (
        <ShimmerEffect>
          {children}
        </ShimmerEffect>
      ) : children}
    </div>
  );
}

export function CrimsonButton({
  children,
  className,
  gradient = true,
  shimmer = true,
  glow = false,
  onClick,
  disabled = false
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  shimmer?: boolean;
  glow?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg px-4 py-2 font-medium text-white transition-all',
        'hover:-translate-y-1 active:translate-y-0',
        gradient ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-red-600',
        glow && 'shadow-md shadow-red-600/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {shimmer ? (
        <ShimmerEffect disabled={disabled}>
          {children}
        </ShimmerEffect>
      ) : children}
    </button>
  );
}

export function CrimsonBadge({
  children,
  className,
  variant = 'default'
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'subtle';
}) {
  const variantClasses = {
    default: 'bg-gradient-to-r from-red-600 to-red-700 text-white',
    outline: 'bg-white border border-red-200 text-red-700',
    subtle: 'bg-red-50 text-red-700'
  };
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
}

export function CrimsonAvatar({
  src,
  alt,
  fallback,
  className,
  size = 'md',
  border = false,
  glow = false
}: {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  border?: boolean;
  glow?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={cn(
      'rounded-full overflow-hidden',
      sizeClasses[size],
      border && 'border-2 border-red-200',
      glow && 'shadow-md shadow-red-200/50',
      'transition-all duration-300 hover:scale-105',
      className
    )}>
      {src ? (
        <img 
          src={src} 
          alt={alt || 'Avatar'} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-medium">
          {fallback || 'U'}
        </div>
      )}
    </div>
  );
}