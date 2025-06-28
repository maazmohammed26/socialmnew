import React, { useState, useEffect } from 'react';
import { X, Activity, Database, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearAllCaches } from '@/lib/cache-utils';

interface PerformanceData {
  fps: number;
  memory: {
    used: string;
    total: string;
  };
  loadTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 0,
    memory: {
      used: '0 MB',
      total: '0 MB'
    },
    loadTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  // Track FPS
  useEffect(() => {
    if (!isVisible) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const countFrames = () => {
      frameCount++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        setPerformanceData(prev => ({
          ...prev,
          fps: Math.round(frameCount * 1000 / (now - lastTime))
        }));
        frameCount = 0;
        lastTime = now;
      }
      
      animationFrameId = requestAnimationFrame(countFrames);
    };

    animationFrameId = requestAnimationFrame(countFrames);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible]);

  // Track memory usage
  useEffect(() => {
    if (!isVisible) return;
    
    const memoryInterval = setInterval(() => {
      if (window.performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        setPerformanceData(prev => ({
          ...prev,
          memory: {
            used: `${Math.round(memory.usedJSHeapSize / (1024 * 1024))} MB`,
            total: `${Math.round(memory.jsHeapSizeLimit / (1024 * 1024))} MB`
          }
        }));
      }
    }, 2000);
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, [isVisible]);

  // Track page load time
  useEffect(() => {
    if (!isVisible) return;
    
    const loadTime = window.performance.timing.domContentLoadedEventEnd - 
                     window.performance.timing.navigationStart;
    
    setPerformanceData(prev => ({
      ...prev,
      loadTime: Math.round(loadTime)
    }));
  }, [isVisible]);

  // Track cache hits/misses
  useEffect(() => {
    if (!isVisible) return;
    
    // Create a proxy for localStorage to track cache hits/misses
    const originalGetItem = localStorage.getItem;
    const originalSetItem = localStorage.setItem;
    
    let hits = 0;
    let misses = 0;
    
    localStorage.getItem = function(key) {
      const value = originalGetItem.call(localStorage, key);
      if (key.includes('cache') || key.includes('_time')) {
        if (value) {
          hits++;
        } else {
          misses++;
        }
        
        setPerformanceData(prev => ({
          ...prev,
          cacheHits: hits,
          cacheMisses: misses
        }));
      }
      return value;
    };
    
    return () => {
      localStorage.getItem = originalGetItem;
      localStorage.setItem = originalSetItem;
    };
  }, [isVisible]);

  const handleClearCache = async () => {
    await clearAllCaches();
    localStorage.clear();
    toast({
      title: 'Cache cleared',
      description: 'All caches have been cleared successfully'
    });
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100"
      >
        <Activity className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 w-64 text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium flex items-center gap-1">
          <Activity className="h-3 w-3" /> Performance
        </h3>
        <Button
          onClick={() => setIsVisible(false)}
          size="icon"
          variant="ghost"
          className="h-5 w-5"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">FPS:</span>
          <span className={`font-mono ${performanceData.fps < 30 ? 'text-red-500' : 'text-green-500'}`}>
            {performanceData.fps}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Memory:</span>
          <span className="font-mono">
            {performanceData.memory.used} / {performanceData.memory.total}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Load Time:</span>
          <span className="font-mono">
            {performanceData.loadTime} ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cache:</span>
          <span className="font-mono">
            {performanceData.cacheHits} hits / {performanceData.cacheMisses} misses
          </span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t">
        <Button
          onClick={handleClearCache}
          size="sm"
          variant="destructive"
          className="w-full text-xs h-7"
        >
          <Database className="h-3 w-3 mr-1" /> Clear Cache
        </Button>
      </div>
    </div>
  );
}