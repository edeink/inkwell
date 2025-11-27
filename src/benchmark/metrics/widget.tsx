import Editor from '../../editors/graphics-editor';
import { PerformanceTestInterface } from '../index.types';
import { buildAbsoluteWidgetScene, createAbsoluteWidgetNodes } from '../tester/absolute/widget';
import { buildFlexWidgetScene, createFlexWidgetNodes } from '../tester/flex/widget';
import { buildTextWidgetScene, createTextWidgetNodes } from '../tester/text/widget';

import { FrameSampler, type Timings } from './collector';

import type { PerformanceMetrics } from '../index.types';

type Ctx = { stageEl: HTMLElement; editor: Editor | null };

export default class WidgetPerformanceTest extends PerformanceTestInterface {
  name = 'Widget';
  private ctx: Ctx;
  private lastMetrics: PerformanceMetrics = { nodes: 0, createTimeMs: 0, avgPerNodeMs: 0 };
  private frameSampler = new FrameSampler();
  private startMark = 0;
  private layout: 'absolute' | 'flex' | 'text';
  private lastTimings: Timings | null = null;
  private collecting = false;
  private memoryDebug: { t: number; used: number }[] = [];
  private beforeMem: { heapUsed: number } | null = null;

  private clearCanvas(): void {
    const el = this.ctx.stageEl;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    this.ctx.editor = null;
  }

  constructor(stageEl: HTMLElement, layout: 'absolute' | 'flex' | 'text' = 'absolute') {
    super();
    this.ctx = { stageEl, editor: null };
    this.layout = layout;
  }

  async createNodes(targetCount: number): Promise<void> {
    this.clearCanvas();
    let editor: Editor;
    if (this.layout === 'absolute') {
      ({ editor } = await createAbsoluteWidgetNodes(this.ctx.stageEl));
      this.lastTimings = await buildAbsoluteWidgetScene(this.ctx.stageEl, editor, targetCount);
    } else if (this.layout === 'flex') {
      ({ editor } = await createFlexWidgetNodes(this.ctx.stageEl));
      this.lastTimings = await buildFlexWidgetScene(this.ctx.stageEl, editor, targetCount);
    } else {
      ({ editor } = await createTextWidgetNodes(this.ctx.stageEl));
      this.lastTimings = await buildTextWidgetScene(this.ctx.stageEl, editor, targetCount);
    }
    this.ctx.editor = editor;
  }

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

  getPerformanceMetrics() {
    return this.lastMetrics;
  }

  getFrameRate() {
    return this.frameSampler.get();
  }
}
