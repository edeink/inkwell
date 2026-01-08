import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 在 Flex 布局容器中批量创建 count 个 4x4 方块元素。
 * 布局逻辑与 widget.tsx 中的 buildFlexJSX 保持一致：
 * 使用 Flex Wrap 布局，每个元素大小为 4x4，间距为 4px。
 * 依次测量构建、强制布局与下一次绘制的耗时，返回 Timings。
 */
export function createFlexDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const tBuild0 = performance.now();
  const container = document.createElement('div');
  // 对应 Wrap widget 的 spacing=4, runSpacing=4
  container.style.cssText = 'display:flex;flex-wrap:wrap;' + 'gap:4px;align-content:flex-start;';

  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    // 对应 Container width=4, height=4, color=var(--ink-demo-primary)
    d.style.cssText = `width:4px;height:4px;background:var(--ink-demo-primary);flex-shrink:0;`;
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

/**
 * 在 Flex Row+Column 布局容器中批量创建 count 个 4x4 方块元素。
 * 模拟 buildFlexRowColJSX 的逻辑：
 * 根据舞台宽度计算每行容纳数量，生成对应结构的 Flex Column 和 Flex Row DOM 节点。
 */
export function createFlexRowColDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const el = stage;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }

  const stageW = stage.clientWidth || 800;
  const itemSize = 4;
  const spacing = 4;
  // 计算每行能容纳的方块数量
  const cols = Math.floor((stageW + spacing) / (itemSize + spacing));
  const effectiveCols = Math.max(1, cols);
  const rowsCount = Math.ceil(count / effectiveCols);

  const tBuild0 = performance.now();

  // 外层 Column
  const column = document.createElement('div');
  column.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:flex-start;';

  for (let r = 0; r < rowsCount; r++) {
    // 内层 Row
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-direction:row;gap:4px;align-items:center;';

    const start = r * effectiveCols;
    const end = Math.min(start + effectiveCols, count);

    for (let i = start; i < end; i++) {
      const d = document.createElement('div');
      d.style.cssText = `width:4px;height:4px;background:var(--ink-demo-primary);flex-shrink:0;`;
      row.appendChild(d);
    }
    column.appendChild(row);
  }

  const tBuild1 = performance.now();

  const scrollLayer = document.createElement('div');
  scrollLayer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:auto;';
  stage.appendChild(scrollLayer);
  scrollLayer.appendChild(column);

  const tLayout0 = performance.now();
  void stage.offsetHeight;
  const tLayout1 = performance.now();
  return measureNextPaint().then((paintMs) => ({
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  }));
}
