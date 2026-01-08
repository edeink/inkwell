import {
  PerformanceTestInterface,
  TestCaseType,
  type PerformanceMetrics,
  type ScrollMetrics,
} from '../index.types';
import { createAbsoluteDomNodes } from '../tester/absolute/dom';
import { createFlexDomNodes, createFlexRowColDomNodes } from '../tester/flex/dom';
import { createLayoutDomNodes } from '../tester/layout/dom';
import { createPipelineDomNodes } from '../tester/pipeline/dom';
import { createScrollDomNodes } from '../tester/scroll/dom';
import { createStateDomNodes } from '../tester/state/dom';
import { createTextDomNodes } from '../tester/text/dom';

import { FrameSampler, round1, type Timings } from './collector';

/**
 * DOM 测试上下文
 */
type Ctx = {
  stage: HTMLElement;
};

/**
 * 清空舞台容器中的所有节点
 * @param stage 舞台容器元素
 * @throws Error 如果 stage 不是有效的 HTMLElement
 */
export function clearDomStage(stage: HTMLElement): void {
  if (!stage || !(stage instanceof HTMLElement)) {
    throw new Error('Invalid stage element provided for cleanup');
  }

  try {
    while (stage.firstChild) {
      stage.removeChild(stage.firstChild);
    }
  } catch (e) {
    console.error('Failed to clear DOM stage:', e);
    throw e;
  }
}

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
  private lastScrollMetrics: ScrollMetrics | undefined;
  private collecting = false;
  private beforeMem: { heapUsed: number } | null = null;

  constructor(stage: HTMLElement, layout = TestCaseType.Absolute) {
    super();
    this.ctx = { stage };
    this.caseType = layout;
  }

  getScrollMetrics(): ScrollMetrics | undefined {
    return this.lastScrollMetrics;
  }

  /**
   * 按当前布局创建指定数量的节点并记录阶段耗时。
   * @param targetCount 目标节点数量
   */
  async createNodes(targetCount: number): Promise<void> {
    // 统一执行清空操作
    clearDomStage(this.ctx.stage);

    this.lastScrollMetrics = undefined;
    switch (this.caseType) {
      case TestCaseType.Flex: {
        this.lastTimings = await createFlexDomNodes(this.ctx.stage, targetCount);
        break;
      }
      case TestCaseType.FlexRowCol: {
        this.lastTimings = await createFlexRowColDomNodes(this.ctx.stage, targetCount);
        break;
      }
      case TestCaseType.Scroll: {
        const res = await createScrollDomNodes(this.ctx.stage, targetCount);
        this.lastTimings = res.timings;
        this.lastScrollMetrics = res.scrollMetrics;
        break;
      }
      case TestCaseType.Layout: {
        this.lastTimings = await createLayoutDomNodes(this.ctx.stage, targetCount);
        break;
      }
      case TestCaseType.Pipeline: {
        this.lastTimings = await createPipelineDomNodes(this.ctx.stage, targetCount);
        break;
      }
      case TestCaseType.State: {
        this.lastTimings = await createStateDomNodes(this.ctx.stage, targetCount);
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
