/** 测试模式 */
export enum TestMode {
  Baseline = 'baseline',
  Stress = 'stress',
}

/** Performance.memory 结构（浏览器提供）*/
export type MemoryInfo = {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
};

/** 内存使用统计（抽象后的结构）*/
export type MemoryUsage = {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
};

/** 性能指标：节点数、总耗时、平均单节点耗时及细分阶段与增量内存 */
export type PerformanceMetrics = {
  nodes: number;
  createTimeMs: number;
  avgPerNodeMs: number;
  buildMs?: number;
  layoutMs?: number;
  paintMs?: number;
  memoryDelta?: number;
  cpuBusyPercent?: number;
};

/** 帧率采样项：相对时间 t 与对应 FPS */
export type FrameRateSample = {
  t: number;
  fps: number;
};

/** 单次测试样本：内存、指标与帧率序列 */
export type TestSample = {
  memory: MemoryUsage;
  metrics: PerformanceMetrics;
  frames: FrameRateSample[];
};

/** 测试结果：名称、模式、样本集合与平均值 */
export type TestResult = {
  name: string;
  mode: TestMode;
  samples: TestSample[];
  average: TestSample;
};

/** 实验类型：双端对比或历史对比 */
export type ExperimentType = 'dom_vs_widget' | 'history';

/** 导出载荷：仅包含结果数组 */
export type ExportPayload = {
  results: TestResult[];
};

/** 差异度量：某字段在基线与当前之间的差异 */
export type DiffMetric = {
  name: string;
  nodes: number;
  field: keyof PerformanceMetrics;
  baseline: number;
  current: number;
  delta: number;
  deltaPercent: number;
  degraded: boolean;
};

export enum TestCaseType {
  Absolute = 'absolute',
  Flex = 'flex',
  Text = 'text',
  CanvasBenchmark = 'canvas_benchmark',
}

export const TestCaseOptions: { label: string; value: TestCaseType }[] = [
  { label: '盒子绝对布局测试', value: TestCaseType.Absolute },
  { label: '文字渲染测试', value: TestCaseType.Text },
  { label: '流式布局测试', value: TestCaseType.Flex },
];

export enum TestStatus {
  Pending = 'pending',
  Running = 'running',
  Done = 'done',
}

/**
 * 性能测试接口
 * 统一测试生命周期的方法与读取统计信息的约定。
 */
export abstract class PerformanceTestInterface {
  abstract name: string;
  abstract createNodes(targetCount: number): Promise<void> | void;
  abstract collectStatistics(targetCount: number): Promise<void> | void;
  // 获取当前性能指标
  abstract getPerformanceMetrics(): PerformanceMetrics;
  // 获取当前帧速率样本
  abstract getFrameRate(): FrameRateSample[];

  // 获取当前内存使用情况
  getMemoryUsage(): MemoryUsage {
    const pm = (performance as unknown as { memory: MemoryInfo }).memory;
    if (!pm) {
      throw new Error('performance.memory is not available');
    }
    return {
      heapUsed: pm.usedJSHeapSize || 0,
      heapTotal: pm.totalJSHeapSize || 0,
      heapLimit: pm.jsHeapSizeLimit || 0,
    };
  }
}

/**
 * 聚合样本的平均值（逐字段），并合并帧率为同时间索引上的平均 FPS。
 *
 * @param samples 样本数组
 * @returns 平均样本（包含平均内存、指标与帧率）
 * @description 时间复杂度 O(n + m)，n 为样本数，m 为最大帧序列长度
 */
export function averageSamples(samples: TestSample[]): TestSample {
  const n = samples.length || 1;
  const avgMemory: MemoryUsage = {
    heapUsed: 0,
    heapTotal: 0,
    heapLimit: 0,
  };
  const hasHeapUsed = samples.every((s) => typeof s.memory.heapUsed === 'number');
  const hasHeapTotal = samples.every((s) => typeof s.memory.heapTotal === 'number');
  const hasHeapLimit = samples.every((s) => typeof s.memory.heapLimit === 'number');

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
  const hasMemDelta = samples.every((s) => typeof s.metrics.memoryDelta === 'number');
  if (hasMemDelta) {
    avgMetrics.memoryDelta = samples.reduce((a, b) => a + (b.metrics.memoryDelta as number), 0) / n;
  }
  const hasBuild = samples.every((s) => typeof s.metrics.buildMs === 'number');
  const hasLayout = samples.every((s) => typeof s.metrics.layoutMs === 'number');
  const hasPaint = samples.every((s) => typeof s.metrics.paintMs === 'number');
  if (hasBuild) {
    avgMetrics.buildMs = samples.reduce((a, b) => a + (b.metrics.buildMs as number), 0) / n;
  }
  if (hasLayout) {
    avgMetrics.layoutMs = samples.reduce((a, b) => a + (b.metrics.layoutMs as number), 0) / n;
  }
  if (hasPaint) {
    avgMetrics.paintMs = samples.reduce((a, b) => a + (b.metrics.paintMs as number), 0) / n;
  }

  const frames: FrameRateSample[] = [];
  const maxLen = Math.max(...samples.map((s) => s.frames.length));
  for (let i = 0; i < maxLen; i++) {
    const vals = samples
      .map((s) => s.frames[i]?.fps)
      .filter((v) => typeof v === 'number') as number[];
    const ts = samples.map((s) => s.frames[i]?.t).filter((v) => typeof v === 'number') as number[];
    if (vals.length) {
      frames.push({
        t: ts[0] ?? i,
        fps: vals.reduce((a, b) => a + b, 0) / vals.length,
      });
    }
  }

  return {
    memory: avgMemory,
    metrics: avgMetrics,
    frames,
  } as TestSample;
}
