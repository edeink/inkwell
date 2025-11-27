import { PerformanceTestInterface } from '../index.types';
import { createAbsoluteDomNodes } from '../tester/absolute/dom';
import { createFlexDomNodes } from '../tester/flex/dom';
import { createTextDomNodes } from '../tester/text/dom';

import { FrameSampler, type Timings } from './collector';

import type { PerformanceMetrics } from '../index.types';

type Ctx = {
  stage: HTMLElement;
};

export default class DomPerformanceTest extends PerformanceTestInterface {
  name = 'DOM';
  private ctx: Ctx;
  private memoryDebug: { t: number; used: number }[] = [];
  private lastMetrics: PerformanceMetrics = { nodes: 0, createTimeMs: 0, avgPerNodeMs: 0 };
  private frameSampler = new FrameSampler();
  private startMark = 0;
  private layout: 'absolute' | 'flex' | 'text';
  private lastTimings: Timings | null = null;
  private collecting = false;
  private beforeMem: { heapUsed: number } | null = null;

  constructor(stage: HTMLElement, layout: 'absolute' | 'flex' | 'text' = 'absolute') {
    super();
    this.ctx = { stage };
    this.layout = layout;
  }

  async createNodes(targetCount: number): Promise<void> {
    if (this.layout === 'absolute') {
      this.lastTimings = await createAbsoluteDomNodes(this.ctx.stage, targetCount);
    } else if (this.layout === 'flex') {
      this.lastTimings = await createFlexDomNodes(this.ctx.stage, targetCount);
    } else {
      this.lastTimings = await createTextDomNodes(this.ctx.stage, targetCount);
    }
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
