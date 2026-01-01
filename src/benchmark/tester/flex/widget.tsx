/** @jsxImportSource @/utils/compiler */
import { Container, Wrap } from '../../../core';
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
