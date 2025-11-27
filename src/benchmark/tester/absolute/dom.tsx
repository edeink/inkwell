import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 在绝对定位布局下批量创建 count 个 4x4 像素的 div 节点。
 * 依次测量构建、强制布局与下一次绘制的耗时，返回 Timings。
 */
export function createAbsoluteDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const el = stage;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const tBuild0 = performance.now();
  const frag = document.createDocumentFragment();
  const stageW = stage.clientWidth || 800;
  const stageH = stage.clientHeight || 600;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    const x = Math.floor(Math.random() * Math.max(1, stageW - 4));
    const y = Math.floor(Math.random() * Math.max(1, stageH - 4));
    d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:4px;height:4px;background:#888`;
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
