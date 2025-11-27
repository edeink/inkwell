/**
 * Timings
 * 记录构建(Build)、布局(Layout)、绘制(Paint)三个阶段的耗时（单位：毫秒）。
 * 输出用于后续统计与展示，不包含任何副作用。
 */
export type Timings = {
  buildMs: number;
  layoutMs: number;
  paintMs: number;
};

/**
 * FrameSampler
 * 使用 requestAnimationFrame 采样连续帧的时间间隔并计算对应 FPS，形成随时间变化的帧率序列。
 *
 * 方法说明：
 * - start(mark): 从给定时间起点 mark（performance.now 毫秒值）开始采样；
 * - stop(): 停止采样循环；
 * - get(): 返回采样结果的副本，避免外部修改内部状态；
 *
 * 时间复杂度：O(n)，n 为采样到的帧数；空间复杂度：O(n)。
 * 设计考量：利用浏览器的帧调度实现高精度采样，避免 setInterval 精度不足与漂移。
 */
export class FrameSampler {
  private samples: { t: number; fps: number }[] = [];
  private startMark = 0;
  private running = false;

  start(mark: number): void {
    // 初始化采样序列与起点时间戳
    this.samples = [];
    this.startMark = mark;
    this.running = true;
    // 记录上一帧时间，用于计算相邻帧间隔 dt
    let last = performance.now();
    const loop = () => {
      // 如已停止，终止循环
      if (!this.running) {
        return;
      }
      const now = performance.now();
      const dt = now - last; // 相邻两帧的时间差（毫秒）
      last = now;
      if (dt > 0) {
        const fps = 1000 / dt; // 帧率：每秒毫秒数 / 单帧耗时
        this.samples.push({ t: now - this.startMark, fps }); // 相对起点时间与 FPS
      }
      // 下一帧继续采样
      requestAnimationFrame(loop);
    };
    // 启动首帧采样
    requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
  }

  get(): { t: number; fps: number }[] {
    return this.samples.slice();
  }
}

/**
 * measureNextPaint
 * 通过在下一帧回调中读取当前时间与调用时刻的差值，近似测量下一次绘制到达的等待时长。
 *
 * @returns 下一帧到达的等待时长（毫秒）
 */
export async function measureNextPaint(): Promise<number> {
  const t0 = performance.now();
  return new Promise<number>((resolve) => {
    requestAnimationFrame(() => {
      const t1 = performance.now();
      resolve(t1 - t0);
    });
  });
}
