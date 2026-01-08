export const PerfMetrics: Record<
  string,
  { count: number; totalTime: number; min: number; max: number }
> = {};

/**
 * 性能指标装饰器
 * 用于测量类方法的执行时间，包括调用次数、总耗时、最小耗时、最大耗时。
 */
export function measure(
  originalMethod: (...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext,
) {
  const methodName = String(context.name);

  function replacementMethod(this: unknown, ...args: unknown[]) {
    const start = performance.now();
    try {
      return originalMethod.apply(this, args);
    } finally {
      const end = performance.now();
      const duration = end - start;

      if (!PerfMetrics[methodName]) {
        PerfMetrics[methodName] = { count: 0, totalTime: 0, min: Infinity, max: -Infinity };
      }

      const metric = PerfMetrics[methodName];
      metric.count++;
      metric.totalTime += duration;
      metric.min = Math.min(metric.min, duration);
      metric.max = Math.max(metric.max, duration);
    }
  }

  return replacementMethod;
}

export function resetMetrics() {
  for (const key in PerfMetrics) {
    delete PerfMetrics[key];
  }
}

export function getMetricsReport() {
  return Object.entries(PerfMetrics)
    .map(([key, val]) => {
      const avg = val.totalTime / val.count;
      return `${key}: avg=${avg.toFixed(2)}ms, total=${val.totalTime.toFixed(2)}ms, count=${val.count}`;
    })
    .join('\n');
}
