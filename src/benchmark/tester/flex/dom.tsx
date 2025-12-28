import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 在 Flex 布局容器中批量创建 count 个 4x4 方块元素。
 * 布局逻辑与 widget.tsx 中的 buildFlexJSX 保持一致：
 * 使用 Flex Wrap 布局，每个元素大小为 4x4，间距为 4px。
 * 依次测量构建、强制布局与下一次绘制的耗时，返回 Timings。
 */
export function createFlexDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const el = stage;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const tBuild0 = performance.now();
  const container = document.createElement('div');
  // 对应 Wrap widget 的 spacing=4, runSpacing=4
  container.style.cssText = 'display:flex;flex-wrap:wrap;' + 'gap:4px;align-content:flex-start;';

  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    // 对应 Container width=4, height=4, color=#888
    d.style.cssText = `width:4px;height:4px;background:#888;flex-shrink:0;`;
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
