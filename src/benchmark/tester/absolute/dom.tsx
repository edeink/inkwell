import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 在绝对定位布局下批量创建 count 个 4x4 像素的 div 节点。
 * 为了模拟 Widget 的逻辑，这里使用随机坐标进行布局。
 * 依次测量构建、强制布局与下一次绘制的耗时，返回 Timings。
 */
export function createAbsoluteDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const el = stage;
  const stageW = el.clientWidth || 800;
  const stageH = el.clientHeight || 600;

  const tBuild0 = performance.now();
  const frag = document.createDocumentFragment();
  // 逻辑与 widget.tsx 中的 buildAbsoluteJSX 保持一致：随机分布
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * Math.max(1, stageW - 4));
    const y = Math.floor(Math.random() * Math.max(1, stageH - 4));
    const d = document.createElement('div');
    d.style.cssText =
      `position:absolute;left:${x}px;top:${y}px;` +
      `width:4px;height:4px;background:var(--ink-demo-primary)`;
    frag.appendChild(d);
  }
  const tBuild1 = performance.now();
  stage.appendChild(frag);
  const tLayout0 = performance.now();
  void stage.offsetHeight; // 读取布局属性以强制同步布局计算
  const tLayout1 = performance.now();
  return measureNextPaint().then((paintMs) => ({
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  }));
}
