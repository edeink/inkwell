import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 渲染管线压力测试 DOM 实现
 * 批量动画更新：每帧更新所有节点的位置 (Transform)
 */
export async function createPipelineDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  stage.innerHTML = '';
  const tBuild0 = performance.now();

  const root = document.createElement('div');
  root.style.cssText =
    'position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;';

  const items: HTMLDivElement[] = [];
  for (let i = 0; i < count; i++) {
    // 创建占位节点
    const placeholder = document.createElement('div');
    root.appendChild(placeholder);

    // 创建实际节点
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      width: 6px;
      height: 6px;
      background: ${i % 2 ? '#ff0055' : '#00ccff'};
      border-radius: 50%;
      left: 0;
      top: 0;
      will-change: transform; 
    `;

    // 使用 replaceChild 替换节点
    root.replaceChild(div, placeholder);
    items.push(div);
  }

  // 验证第二个 Div 是否正确显示
  if (count > 1) {
    const secondItem = items[1];
    if (secondItem.parentNode !== root) {
      console.error('Pipeline DOM Verification Failed: Second item is not attached to root');
    }
    // 简单的可见性检查 (display != none)
    if (secondItem.style.display === 'none') {
      console.error('Pipeline DOM Verification Failed: Second item is hidden');
    }
  }

  const tBuild1 = performance.now();
  stage.appendChild(root);

  const tLayout0 = performance.now();
  void root.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  // 动画循环 (60帧)
  const frames = 60;
  const w = stage.clientWidth || 800;
  const h = stage.clientHeight || 600;

  await new Promise<void>((resolve) => {
    let f = 0;
    const startTime = performance.now();

    function loop() {
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
        item.style.transform = `translate(${x}px, ${y}px)`;
      }

      requestAnimationFrame(loop);
      f++;
    }
    requestAnimationFrame(loop);
  });

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  };
}
