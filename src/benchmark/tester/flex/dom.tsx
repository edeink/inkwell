import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 在 Flex 布局容器中批量创建 count 个方块元素，测量构建、布局与绘制耗时。
 */
export function createFlexDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const el = stage;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const tBuild0 = performance.now();
  const container = document.createElement('div');
  container.style.cssText = `position:relative;display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start;`;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    const w = 4;
    const h = 4;
    d.style.cssText = `width:${w}px;height:${h}px;background:#888`;
    container.appendChild(d);
  }
  const tBuild1 = performance.now();
  const scrollLayer = document.createElement('div');
  scrollLayer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:auto;';
  stage.appendChild(scrollLayer);
  scrollLayer.appendChild(container);
  const tLayout0 = performance.now();
  void stage.offsetHeight;
  const tLayout1 = performance.now();
  return measureNextPaint().then((paintMs) => ({
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  }));
}
