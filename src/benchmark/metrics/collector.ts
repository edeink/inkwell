export type Timings = {
  buildMs: number;
  layoutMs: number;
  paintMs: number;
};

export class FrameSampler {
  private samples: { t: number; fps: number }[] = [];
  private startMark = 0;
  private running = false;

  start(mark: number): void {
    this.samples = [];
    this.startMark = mark;
    this.running = true;
    let last = performance.now();
    const loop = () => {
      if (!this.running) {
        return;
      }
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (dt > 0) {
        const fps = 1000 / dt;
        this.samples.push({ t: now - this.startMark, fps });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
  }

  get(): { t: number; fps: number }[] {
    return this.samples.slice();
  }
}

export async function measureNextPaint(): Promise<number> {
  const t0 = performance.now();
  return new Promise<number>((resolve) => {
    requestAnimationFrame(() => {
      const t1 = performance.now();
      resolve(t1 - t0);
    });
  });
}
