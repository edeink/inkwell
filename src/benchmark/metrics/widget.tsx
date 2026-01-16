import Runtime from '../../runtime';
import {
  type PerformanceMetrics,
  PerformanceTestInterface,
  type ScrollMetrics,
  TestCaseType,
} from '../index.types';
import { buildAbsoluteWidgetScene } from '../tester/absolute/widget';
import { buildFlexRowColWidgetScene, buildFlexWidgetScene } from '../tester/flex/widget';
import { buildLayoutWidgetScene } from '../tester/layout/widget';
import { buildPipelineWidgetScene } from '../tester/pipeline/widget';
import { buildStateWidgetScene } from '../tester/state-color/widget';
import { buildScrollWidgetScene } from '../tester/state-scroll/widget';
import { buildStateLayoutWidgetScene } from '../tester/state-size/widget';
import { buildStateTextWidgetScene } from '../tester/state-text/widget';
import { buildTextWidgetScene } from '../tester/text/widget';
import { buildTextWidgetSceneV2 } from '../tester/text/widget-v2';

import { FrameSampler, round1, type Timings } from './collector';

/**
 * Widget 测试上下文
 */
type Ctx = { stageEl: HTMLElement; runtime: Runtime | null };

/**
 * WidgetPerformanceTest
 * 基于自研 Widget 渲染管线构建场景，测量构建/布局/绘制耗时与帧率、内存变化。
 */
export default class WidgetPerformanceTest extends PerformanceTestInterface {
  name = 'Widget';
  private ctx: Ctx;
  private lastMetrics: PerformanceMetrics = { nodes: 0, createTimeMs: 0, avgPerNodeMs: 0 };
  private frameSampler = new FrameSampler();
  private startMark = 0;
  private caseType: TestCaseType;
  private lastTimings: Timings | null = null;
  private lastScrollMetrics: ScrollMetrics | undefined;
  private collecting = false;
  private memoryDebug: { t: number; used: number }[] = [];
  private beforeMem: { heapUsed: number } | null = null;
  private variant: 'v1' | 'v2' = 'v2';

  getScrollMetrics(): ScrollMetrics | undefined {
    return this.lastScrollMetrics;
  }

  /**
   * 清空画布容器，释放上一次绘制的内容与编辑器引用。
   */
  private clearCanvas(): void {
    const el = this.ctx.stageEl;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    this.ctx.runtime = null;
  }

  constructor(stageEl: HTMLElement, layout = TestCaseType.Absolute, variant?: 'v1' | 'v2') {
    super();
    this.ctx = { stageEl, runtime: null };
    this.caseType = layout;
    const envVar =
      typeof process !== 'undefined' && process.env?.VITE_TEXT_VERSION
        ? (process.env.VITE_TEXT_VERSION as 'v1' | 'v2')
        : undefined;
    this.variant = variant ?? envVar ?? 'v2';
  }

  private async createRuntimeForStage(stageEl: HTMLElement): Promise<Runtime> {
    const id = stageEl.id || 'stage';
    const runtime = await Runtime.create(id, { backgroundAlpha: 0 });
    return runtime;
  }

  /**
   * 创建指定数量的 Widget 节点场景，并记录关键阶段耗时。
   * @param targetCount 目标节点数量
   */
  async createNodes(targetCount: number): Promise<void> {
    this.clearCanvas();
    this.lastScrollMetrics = undefined;
    const runtime = await this.createRuntimeForStage(this.ctx.stageEl);
    switch (this.caseType) {
      case TestCaseType.Flex:
        this.lastTimings = await buildFlexWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
      case TestCaseType.FlexRowCol:
        this.lastTimings = await buildFlexRowColWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
      case TestCaseType.Scroll: {
        const res = await buildScrollWidgetScene(this.ctx.stageEl, runtime, targetCount);
        this.lastTimings = res.timings;
        this.lastScrollMetrics = res.scrollMetrics;
        break;
      }
      case TestCaseType.Layout:
        this.lastTimings = await buildLayoutWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
      case TestCaseType.Pipeline:
        this.lastTimings = await buildPipelineWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
      case TestCaseType.State:
        this.lastTimings = await buildStateWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
      case TestCaseType.StateLayout:
        this.lastTimings = await buildStateLayoutWidgetScene(
          this.ctx.stageEl,
          runtime,
          targetCount,
        );
        break;
      case TestCaseType.StateText:
        this.lastTimings = await buildStateTextWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
      case TestCaseType.Text:
        if (this.variant === 'v1') {
          this.lastTimings = await buildTextWidgetScene(this.ctx.stageEl, runtime, targetCount);
        } else {
          this.lastTimings = await buildTextWidgetSceneV2(this.ctx.stageEl, runtime, targetCount);
        }
        break;
      case TestCaseType.Absolute:
      default:
        this.lastTimings = await buildAbsoluteWidgetScene(this.ctx.stageEl, runtime, targetCount);
        break;
    }
    this.ctx.runtime = runtime;
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
      } catch {
        // do nothing
      }
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
    } catch {
      // do nothing
    }
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
