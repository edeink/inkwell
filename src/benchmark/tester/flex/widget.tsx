/** @jsxImportSource @/utils/compiler */
import { Column, Container, Row, Wrap } from '../../../core';
import '../../../core/registry';
import { WidgetRegistry } from '../../../core/registry';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import Runtime from '../../../runtime';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { measureNextPaint, type Timings } from '../../metrics/collector';

import type { BoxConstraints, BuildContext } from '../../../core/base';
import type { RendererOptions } from '../../../renderer/IRenderer';

/**
 * 构建 Flex 布局场景的 JSX：Wrap 容器下生成 count 个 6×6 方块。
 * @param count 节点数量
 * @param color 方块颜色
 * @returns JSX 树
 */
function buildFlexJSX(count: number, color = '#888') {
  return (
    <Wrap key="perf-flex" spacing={4} runSpacing={4}>
      {Array.from({ length: count }).map((_, i) => (
        <Container key={`c-${i}`} width={4} height={4} color={color} />
      ))}
    </Wrap>
  );
}

/**
 * 构建 Flex Row+Column 组合布局场景的 JSX。
 * 模拟 Wrap 效果：根据舞台宽度计算每行容纳数量，生成对应结构的 Row 和 Column。
 * @param count 节点数量
 * @param stageWidth 舞台宽度
 * @param color 方块颜色
 * @returns JSX 树
 */
function buildFlexRowColJSX(count: number, stageWidth: number, color = '#888') {
  const itemSize = 4;
  const spacing = 4;
  // 计算每行能容纳的方块数量: n * w + (n - 1) * s <= W  =>  n <= (W + s) / (w + s)
  const cols = Math.floor((stageWidth + spacing) / (itemSize + spacing));
  // 确保至少有 1 列
  const effectiveCols = Math.max(1, cols);

  const rowsCount = Math.ceil(count / effectiveCols);

  const rows = [];
  for (let r = 0; r < rowsCount; r++) {
    const rowItems = [];
    const start = r * effectiveCols;
    const end = Math.min(start + effectiveCols, count);

    for (let i = start; i < end; i++) {
      rowItems.push(<Container key={`c-${i}`} width={itemSize} height={itemSize} color={color} />);
    }

    rows.push(
      <Row key={`r-${r}`} spacing={spacing}>
        {rowItems}
      </Row>,
    );
  }

  return (
    <Column key="perf-flex-row-col" spacing={spacing}>
      {rows}
    </Column>
  );
}

/**
 * 编译、构建、布局并初始化渲染器，完成绘制后统计耗时。
 * @param stageEl 舞台元素
 * @param runtime 编辑器实例
 * @param count 节点数量
 * @returns Timings（构建/布局/绘制耗时）
 */
export async function buildFlexWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildFlexJSX(count);
  const json = compileElement(jsx);
  const tCompile1 = performance.now();

  const tBuild0 = performance.now();
  const root = WidgetRegistry.createWidget(json)!;
  root.createElement(json);
  const tBuild1 = performance.now();

  const constraints: BoxConstraints = {
    minWidth: 0,
    maxWidth: stageW,
    minHeight: 0,
    maxHeight: stageH,
  };
  const tLayout0 = performance.now();
  root.layout(constraints);
  const tLayout1 = performance.now();

  const renderer = runtime.getRenderer() ?? new Canvas2DRenderer();
  const container = runtime.container!;
  // Ensure container is clean
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  const scrollLayer = document.createElement('div');
  scrollLayer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:auto;';
  container.appendChild(scrollLayer);
  const opts: RendererOptions = {
    width: Math.max(stageW, 100),
    height: Math.max(stageH, 100),
    backgroundAlpha: 0,
  } as RendererOptions;
  const tInit0 = performance.now();
  await renderer.initialize(scrollLayer, opts);
  const tInit1 = performance.now();

  const context: BuildContext = { renderer };
  root.paint(context);
  renderer.render();
  const paintWait = await measureNextPaint();

  const compileMs = tCompile1 - tCompile0;
  const buildMs = tBuild1 - tBuild0 + compileMs;
  const layoutMs = tLayout1 - tLayout0;
  const paintMs = paintWait + (tInit1 - tInit0);
  return { buildMs, layoutMs, paintMs };
}

/**
 * 编译、构建、布局并初始化渲染器，完成绘制后统计耗时 (Flex Row+Column 模式)。
 * @param stageEl 舞台元素
 * @param runtime 编辑器实例
 * @param count 节点数量
 * @returns Timings（构建/布局/绘制耗时）
 */
export async function buildFlexRowColWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;

  const jsx = buildFlexRowColJSX(count, stageW);
  const json = compileElement(jsx);
  const tCompile1 = performance.now();

  const tBuild0 = performance.now();
  const root = WidgetRegistry.createWidget(json)!;
  root.createElement(json);
  const tBuild1 = performance.now();

  const constraints: BoxConstraints = {
    minWidth: 0,
    maxWidth: stageW,
    minHeight: 0,
    maxHeight: stageH,
  };
  const tLayout0 = performance.now();
  root.layout(constraints);
  const tLayout1 = performance.now();

  const renderer = runtime.getRenderer() ?? new Canvas2DRenderer();
  const container = runtime.container!;
  // Ensure container is clean
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  const scrollLayer = document.createElement('div');
  scrollLayer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:auto;';
  container.appendChild(scrollLayer);
  const opts: RendererOptions = {
    width: Math.max(stageW, 100),
    height: Math.max(stageH, 100),
    backgroundAlpha: 0,
  } as RendererOptions;
  const tInit0 = performance.now();
  await renderer.initialize(scrollLayer, opts);
  const tInit1 = performance.now();

  const context: BuildContext = { renderer };
  root.paint(context);
  renderer.render();
  const paintWait = await measureNextPaint();

  const compileMs = tCompile1 - tCompile0;
  const buildMs = tBuild1 - tBuild0 + compileMs;
  const layoutMs = tLayout1 - tLayout0;
  const paintMs = paintWait + (tInit1 - tInit0);
  return { buildMs, layoutMs, paintMs };
}

/**
 * 运行更新基准测试：只改变颜色，测试重排/重绘优化
 */
export async function updateFlexWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  // 1. Initial Setup
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildFlexJSX(count, '#888');
  const json = compileElement(jsx);
  const root = WidgetRegistry.createWidget(json)!;
  root.createElement(json);

  const constraints: BoxConstraints = {
    minWidth: 0,
    maxWidth: stageW,
    minHeight: 0,
    maxHeight: stageH,
  };
  root.layout(constraints);

  const renderer = runtime.getRenderer() ?? new Canvas2DRenderer();
  const container = runtime.container!;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  const scrollLayer = document.createElement('div');
  scrollLayer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:auto;';
  container.appendChild(scrollLayer);
  const opts: RendererOptions = {
    width: Math.max(stageW, 100),
    height: Math.max(stageH, 100),
    backgroundAlpha: 0,
  } as RendererOptions;
  await renderer.initialize(scrollLayer, opts);

  const context: BuildContext = { renderer };
  root.paint(context);
  renderer.render();

  // 2. Measure Update (Change Color)
  const tUpdateBuild0 = performance.now();
  const newJsx = buildFlexJSX(count, 'red');
  const newJson = compileElement(newJsx);
  root.createElement(newJson); // Trigger Diff/Update
  const tUpdateBuild1 = performance.now();

  const tUpdateLayout0 = performance.now();
  root.layout(constraints); // Trigger Layout (should be optimized if only color changed)
  const tUpdateLayout1 = performance.now();

  // Mock paint measurement for update
  const tUpdatePaint0 = performance.now();
  root.paint(context);
  renderer.render();
  const tUpdatePaint1 = performance.now();

  return {
    buildMs: tUpdateBuild1 - tUpdateBuild0,
    layoutMs: tUpdateLayout1 - tUpdateLayout0,
    paintMs: tUpdatePaint1 - tUpdatePaint0,
  };
}
