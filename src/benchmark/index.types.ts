export type TestMode = "baseline" | "stress";

export type MemoryInfo = {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
};

export type MemoryUsage = {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
};

export type PerformanceMetrics = {
  nodes: number;
  createTimeMs: number;
  avgPerNodeMs: number;
  buildMs?: number;
  layoutMs?: number;
  paintMs?: number;
  memoryDelta?: number;
};

export type FrameRateSample = {
  t: number;
  fps: number;
};

export type TestSample = {
  memory: MemoryUsage;
  metrics: PerformanceMetrics;
  frames: FrameRateSample[];
};

export type TestResult = {
  name: string;
  mode: TestMode;
  samples: TestSample[];
  average: TestSample;
};

export abstract class PerformanceTestInterface {
  abstract name: string;
  // 创建大量节点
  abstract createMassiveNodes(targetCount: number): Promise<void> | void;
  // 获取当前性能指标
  abstract getPerformanceMetrics(): PerformanceMetrics;
  // 获取当前帧速率样本
  abstract getFrameRate(): FrameRateSample[];

  // 获取当前内存使用情况
  getMemoryUsage(): MemoryUsage {
    const pm = (performance as unknown as { memory: MemoryInfo }).memory;
    if (!pm) {
      throw new Error("performance.memory is not available");
    }
    return {
      heapUsed: pm.usedJSHeapSize || 0,
      heapTotal: pm.totalJSHeapSize || 0,
      heapLimit: pm.jsHeapSizeLimit || 0,
    };
  }
}

export function averageSamples(samples: TestSample[]): TestSample {
  const n = samples.length || 1;
  const avgMemory: MemoryUsage = {
    heapUsed: 0,
    heapTotal: 0,
    heapLimit: 0,
  };
  const hasHeapUsed = samples.every((s) => typeof s.memory.heapUsed === "number");
  const hasHeapTotal = samples.every((s) => typeof s.memory.heapTotal === "number");
  const hasHeapLimit = samples.every((s) => typeof s.memory.heapLimit === "number");

  if (hasHeapUsed) {
    avgMemory.heapUsed = samples.reduce((a, b) => a + (b.memory.heapUsed as number), 0) / n;
  }
  if (hasHeapTotal) {
    avgMemory.heapTotal = samples.reduce((a, b) => a + (b.memory.heapTotal as number), 0) / n;
  }
  if (hasHeapLimit) {
    avgMemory.heapLimit = samples.reduce((a, b) => a + (b.memory.heapLimit as number), 0) / n;
  }

  const avgMetrics: PerformanceMetrics = {
    nodes: Math.round(samples.reduce((a, b) => a + b.metrics.nodes, 0) / n),
    createTimeMs: samples.reduce((a, b) => a + b.metrics.createTimeMs, 0) / n,
    avgPerNodeMs: samples.reduce((a, b) => a + b.metrics.avgPerNodeMs, 0) / n,
    memoryDelta: undefined,
  };
  const hasMemDelta = samples.every((s) => typeof s.metrics.memoryDelta === "number");
  if (hasMemDelta) {
    avgMetrics.memoryDelta = samples.reduce((a, b) => a + (b.metrics.memoryDelta as number), 0) / n;
  }
  const hasBuild = samples.every((s) => typeof s.metrics.buildMs === "number");
  const hasLayout = samples.every((s) => typeof s.metrics.layoutMs === "number");
  const hasPaint = samples.every((s) => typeof s.metrics.paintMs === "number");
  if (hasBuild) {
    avgMetrics.buildMs = samples.reduce((a, b) => a + (b.metrics.buildMs as number), 0) / n
  };
  if (hasLayout) {
    avgMetrics.layoutMs = samples.reduce((a, b) => a + (b.metrics.layoutMs as number), 0) / n
  };
  if (hasPaint) {
    avgMetrics.paintMs = samples.reduce((a, b) => a + (b.metrics.paintMs as number), 0) / n;
  }

  const frames: FrameRateSample[] = [];
  const maxLen = Math.max(...samples.map((s) => s.frames.length));
  for (let i = 0; i < maxLen; i++) {
    const vals = samples.map((s) => s.frames[i]?.fps).filter((v) => typeof v === "number") as number[];
    const ts = samples.map((s) => s.frames[i]?.t).filter((v) => typeof v === "number") as number[];
    if (vals.length) {
      frames.push({
 t: ts[0] ?? i, fps: vals.reduce((a, b) => a + b, 0) / vals.length 
});
    }
  }

  return {
 memory: avgMemory, metrics: avgMetrics, frames 
} as TestSample;
}