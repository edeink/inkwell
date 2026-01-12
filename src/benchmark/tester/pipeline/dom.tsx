import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';

/**
 * 渲染管线压力测试 DOM 实现
 * 批量动画更新：每帧更新所有节点的位置 (Layout/Paint)
 * 统一使用 left/top 触发布局更新，与 Widget 的 Positioned 行为对齐
 */
export async function createPipelineDomNodes(
  stage: HTMLElement,
  count: number,
  frames: number = BENCHMARK_CONFIG.PIPELINE.FRAMES,
): Promise<Timings> {
  stage.innerHTML = '';
  const tBuild0 = performance.now();

  const root = document.createElement('div');
  root.style.cssText =
    'position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;';

  const items: HTMLDivElement[] = [];
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      width: 6px;
      height: 6px;
      background: ${i % 2 ? '#ff0055' : '#00ccff'};
      border-radius: 50%;
      left: 0;
      top: 0;
    `;
    // Removed will-change: transform as we are testing layout

    root.appendChild(div);
    items.push(div);
  }

  const tBuild1 = performance.now();
  stage.appendChild(root);

  const tLayout0 = performance.now();
  void root.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  // 动画循环
  const w = stage.clientWidth || 800;
  const h = stage.clientHeight || 600;

  await new Promise<void>((resolve) => {
    let f = 0;
    const startTime = performance.now();

    const loop = () => {
      if (f >= frames) {
        resolve();
        return;
      }

      const time = (performance.now() - startTime) / 1000;

      // 批量更新样式
      for (let i = 0; i < count; i++) {
        const item = items[i];
        // 简单的粒子运动算法
        const x = (Math.sin(time + i * 0.05) * 0.4 + 0.5) * w;
        const y = (Math.cos(time + i * 0.07) * 0.4 + 0.5) * h;
        // 使用 left/top 替代 transform，确保与 Widget 测试维度一致 (都触发 Layout)
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
      }

      f++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  };
}
