// Performance optimization utilities

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

// Image lazy loading utility
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  const observer = createIntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement;
        target.src = src;
        target.classList.remove('lazy');
        observer.unobserve(target);
      }
    });
  });

  img.classList.add('lazy');
  observer.observe(img);
}

// Virtual scrolling utility for large lists
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleCount: number;
  private scrollTop: number = 0;
  private totalItems: number = 0;

  constructor(container: HTMLElement, itemHeight: number) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
  }

  getVisibleRange(totalItems: number): { start: number; end: number } {
    this.totalItems = totalItems;
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + this.visibleCount, totalItems);
    return { start: Math.max(0, start), end };
  }

  updateScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getTotalHeight(): number {
    return this.totalItems * this.itemHeight;
  }
}

// Memory management utilities
export function clearUnusedCache(): void {
  // Clear expired localStorage items
  const now = Date.now();
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.endsWith('_time')) {
      const timeValue = localStorage.getItem(key);
      if (timeValue) {
        const timestamp = parseInt(timeValue);
        const age = now - timestamp;
        // Clear cache older than 1 hour
        if (age > 60 * 60 * 1000) {
          const dataKey = key.replace('_time', '');
          localStorage.removeItem(key);
          localStorage.removeItem(dataKey);
        }
      }
    }
  });
}

// Preload critical resources
export function preloadCriticalResources(): void {
  // Preload critical images
  const criticalImages = [
    '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}

// Bundle size analyzer
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in production build');
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: { [key: string]: number } = {};

  startTiming(label: string): void {
    this.metrics[label] = performance.now();
  }

  endTiming(label: string): number {
    const start = this.metrics[label];
    if (start) {
      const duration = performance.now() - start;
      delete this.metrics[label];
      return duration;
    }
    return 0;
  }

  measureRender(component: string, fn: () => void): void {
    this.startTiming(`render_${component}`);
    fn();
    const duration = this.endTiming(`render_${component}`);
    if (duration > 16) { // Longer than one frame
      console.warn(`Slow render detected for ${component}: ${duration.toFixed(2)}ms`);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();