import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';
import { getThemeColor } from '../../utils/theme';

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

  const bgBase = getThemeColor('--ink-demo-bg-base');

  const root = document.createElement('div');
  root.style.cssText = [
    'position: relative',
    'width: 100%',
    'height: 100%',
    'overflow: hidden',
    `background: ${bgBase}`,
  ].join(';');

  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    const color = i % 2 ? '#ff0055' : '#00ccff';
    div.style.cssText =
      `position: absolute; width: 6px; height: 6px; ` +
      `background: ${color}; border-radius: 50%; left: 0; top: 0;`;
    root.appendChild(div);
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

      const nextRoot = document.createElement('div');
      nextRoot.style.cssText = [
        'position: relative',
        'width: 100%',
        'height: 100%',
        'overflow: hidden',
        `background: ${bgBase}`,
      ].join(';');

      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const x = (Math.sin(time + i * 0.05) * 0.4 + 0.5) * (w - 10);
        const y = (Math.cos(time + i * 0.07) * 0.4 + 0.5) * (h - 10);

        const div = document.createElement('div');
        const color = i % 2 ? '#ff0055' : '#00ccff';
        div.style.cssText =
          `position: absolute; width: 6px; height: 6px; ` +
          `background: ${color}; border-radius: 50%; left: ${x}px; top: ${y}px;`;
        frag.appendChild(div);
      }
      nextRoot.appendChild(frag);
      stage.replaceChildren(nextRoot);

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
