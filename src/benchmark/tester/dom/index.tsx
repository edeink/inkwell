import { PerformanceTestInterface } from '../../index.types';

import type { PerformanceMetrics } from '../../index.types';

type Ctx = {
  stage: HTMLElement;
};

export default class DomPerformanceTest extends PerformanceTestInterface {
  name = 'DOM';
  private ctx: Ctx;
  private lastMetrics: PerformanceMetrics = {
    nodes: 0,
    createTimeMs: 0,
    avgPerNodeMs: 0,
  };
  private frameSamples: { t: number; fps: number }[] = [];
  private startMark = 0;

  constructor(stage: HTMLElement) {
    super();
    this.ctx = {
      stage,
    };
  }

  private measureFramesStart(): void {
    this.frameSamples = [];
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (dt > 0) {
        const fps = 1000 / dt;
        this.frameSamples.push({
          t: now - this.startMark,
          fps,
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private clearStage(): void {
    const el = this.ctx.stage;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  async createMassiveNodes(targetCount: number): Promise<void> {
    this.clearStage();
    this.startMark = performance.now();
    this.measureFramesStart();
    const beforeMem = this.getMemoryUsage();
    const tBuild0 = performance.now();
    const frag = document.createDocumentFragment();
    const stageW = this.ctx.stage.clientWidth || 800;
    const stageH = this.ctx.stage.clientHeight || 600;
    for (let i = 0; i < targetCount; i++) {
      const d = document.createElement('div');
      const x = Math.floor(Math.random() * Math.max(1, stageW - 4));
      const y = Math.floor(Math.random() * Math.max(1, stageH - 4));
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:4px;height:4px;background:#888`;
      frag.appendChild(d);
    }
    const tBuild1 = performance.now();
    this.ctx.stage.appendChild(frag);
    const tLayout0 = performance.now();
    void this.ctx.stage.offsetHeight;
    const tLayout1 = performance.now();
    const paintMs = await new Promise<number>((resolve) => {
      const t0 = performance.now();
      requestAnimationFrame(() => {
        const t1 = performance.now();
        resolve(t1 - t0);
      });
    });
    const afterMem = this.getMemoryUsage();
    const delta = afterMem.heapUsed - beforeMem.heapUsed;
    const buildMs = tBuild1 - tBuild0;
    const layoutMs = tLayout1 - tLayout0;
    const createTimeMs = buildMs + layoutMs + paintMs;
    this.lastMetrics = {
      nodes: targetCount,
      createTimeMs,
      avgPerNodeMs: createTimeMs / Math.max(1, targetCount),
      buildMs,
      layoutMs,
      paintMs,
      memoryDelta: delta,
    };
  }

  getPerformanceMetrics() {
    return this.lastMetrics;
  }

  getFrameRate() {
    return this.frameSamples.slice();
  }
}
