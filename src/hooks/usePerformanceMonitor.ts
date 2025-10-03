import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiCalls: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const metricsRef = useRef<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    apiCalls: 0,
  });

  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    metricsRef.current.renderTime = renderTime;

    // Log performance apenas em dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        ...metricsRef.current,
      });
    }

    // Detectar renderizações lentas
    if (renderTime > 100) {
      console.warn(`[Performance Warning] ${componentName} took ${renderTime.toFixed(2)}ms to render`);
    }
  }, [componentName]);

  const trackApiCall = () => {
    metricsRef.current.apiCalls += 1;
  };

  return { trackApiCall, metrics: metricsRef.current };
};
