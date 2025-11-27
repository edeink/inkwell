import Editor from '../../editors/graphics-editor';
import { PerformanceTestInterface, TestCaseType, type PerformanceMetrics } from '../index.types';
import { buildAbsoluteWidgetScene } from '../tester/absolute/widget';
import { buildFlexWidgetScene } from '../tester/flex/widget';
import { buildTextWidgetScene } from '../tester/text/widget';

import { FrameSampler, type Timings } from './collector';

/**
 * Widget 测试上下文
 */
type Ctx = { stageEl: HTMLElement; editor: Editor | null };

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
  private collecting = false;
  private memoryDebug: { t: number; used: number }[] = [];
  private beforeMem: { heapUsed: number } | null = null;

  /**
   * 清空画布容器，释放上一次绘制的内容与编辑器引用。
   */
  private clearCanvas(): void {
    const el = this.ctx.stageEl;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    this.ctx.editor = null;
  }

  constructor(stageEl: HTMLElement, layout = TestCaseType.Absolute) {
    super();
    this.ctx = { stageEl, editor: null };
    this.caseType = layout;
  }

  private async createEditorForStage(stageEl: HTMLElement): Promise<Editor> {
    const id = stageEl.id || 'stage';
    const editor = await Editor.create(id, { backgroundAlpha: 0 });
    return editor;
  }

  /**
   * 创建指定数量的 Widget 节点场景，并记录关键阶段耗时。
   * @param targetCount 目标节点数量
   */
  async createNodes(targetCount: number): Promise<void> {
    this.clearCanvas();
    const editor = await this.createEditorForStage(this.ctx.stageEl);
    switch (this.caseType) {
      case TestCaseType.Flex:
        this.lastTimings = await buildFlexWidgetScene(this.ctx.stageEl, editor, targetCount);
        break;
      case TestCaseType.Text:
        this.lastTimings = await buildTextWidgetScene(this.ctx.stageEl, editor, targetCount);
        break;
      case TestCaseType.Absolute:
      default:
        this.lastTimings = await buildAbsoluteWidgetScene(this.ctx.stageEl, editor, targetCount);
        break;
    }
    this.ctx.editor = editor;
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
    const createTimeMs = t.buildMs + t.layoutMs + t.paintMs;
    this.lastMetrics = {
      nodes: targetCount,
      createTimeMs,
      avgPerNodeMs: createTimeMs / Math.max(1, targetCount),
      buildMs: t.buildMs,
      layoutMs: t.layoutMs,
      paintMs: t.paintMs,
      memoryDelta: Math.max(0, delta),
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
