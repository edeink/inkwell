import { PerformanceTestInterface, TestCaseType, type PerformanceMetrics } from '../index.types';
import { createAbsoluteDomNodes } from '../tester/absolute/dom';
import { createFlexDomNodes } from '../tester/flex/dom';
import { createTextDomNodes } from '../tester/text/dom';

import { FrameSampler, round1, type Timings } from './collector';

/**
 * DOM 测试上下文
 */
type Ctx = {
  stage: HTMLElement;
};

/**
 * DomPerformanceTest
 * 通过原生 DOM 构建测试场景，测量不同布局下的构建/布局/绘制耗时、内存变化与帧率。
 */
export default class DomPerformanceTest extends PerformanceTestInterface {
  name = 'DOM';
  private ctx: Ctx;
  private memoryDebug: { t: number; used: number }[] = [];
  private lastMetrics: PerformanceMetrics = { nodes: 0, createTimeMs: 0, avgPerNodeMs: 0 };
  private frameSampler = new FrameSampler();
  private startMark = 0;
  private caseType: TestCaseType;
  private lastTimings: Timings | null = null;
  private collecting = false;
  private beforeMem: { heapUsed: number } | null = null;

  constructor(stage: HTMLElement, layout = TestCaseType.Absolute) {
    super();
    this.ctx = { stage };
    this.caseType = layout;
  }

  /**
   * 按当前布局创建指定数量的节点并记录阶段耗时。
   * @param targetCount 目标节点数量
   */
  async createNodes(targetCount: number): Promise<void> {
    switch (this.caseType) {
      case TestCaseType.Flex: {
        this.lastTimings = await createFlexDomNodes(this.ctx.stage, targetCount);
        break;
      }
      case TestCaseType.Text: {
        this.lastTimings = await createTextDomNodes(this.ctx.stage, targetCount);
        break;
      }
      case TestCaseType.Absolute:
      default: {
        this.lastTimings = await createAbsoluteDomNodes(this.ctx.stage, targetCount);
        break;
      }
    }
  }

  /**
   * 采集两次（前后）统计以计算增量内存与帧率序列：
   * 第一次调用初始化采样与内存基准；第二次调用停止采样并汇总指标。
   * @param targetCount 目标节点数量
   */
  async collectStatistics(targetCount: number): Promise<void> {
    if (!this.collecting) {
      this.startMark = performance.now();
      this.collecting = true;
      try {
        this.beforeMem = this.getMemoryUsage();
        this.memoryDebug.push({ t: 0, used: this.beforeMem.heapUsed });
      } catch {}
      this.frameSampler.start(this.startMark);
      return;
    }
    let delta = 0;
    try {
      const afterMem = this.getMemoryUsage();
      const tAfter = performance.now();
      this.memoryDebug.push({ t: tAfter - this.startMark, used: afterMem.heapUsed });
      if (this.beforeMem) {
        delta = afterMem.heapUsed - this.beforeMem.heapUsed;
      }
    } catch {}
    this.frameSampler.stop();
    const t = this.lastTimings || { buildMs: 0, layoutMs: 0, paintMs: 0 };
    const createTimeMs = round1(t.buildMs + t.layoutMs + t.paintMs);
    this.lastMetrics = {
      nodes: targetCount,
      createTimeMs,
      avgPerNodeMs: round1(createTimeMs / Math.max(1, targetCount)),
      buildMs: round1(t.buildMs),
      layoutMs: round1(t.layoutMs),
      paintMs: round1(t.paintMs),
      memoryDelta: round1(Math.max(0, delta)),
    };
    this.collecting = false;
  }

  /** 返回上一轮构建后的性能指标快照 */
  getPerformanceMetrics() {
    return this.lastMetrics;
  }

  /** 返回采样得到的帧率序列（相对于 startMark 的时间戳） */
  getFrameRate() {
    return this.frameSampler.get();
  }
}
