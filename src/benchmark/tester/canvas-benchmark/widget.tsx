/** @jsxImportSource @/utils/compiler */
import { Container, Positioned, Stack } from '../../../core';
import '../../../core/registry';
import { WidgetRegistry } from '../../../core/registry';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import Runtime from '../../../runtime';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { measureNextPaint, type Timings } from '../../metrics/collector';

import type { BoxConstraints, BuildContext } from '../../../core/base';
import type { RendererOptions } from '../../../renderer/IRenderer';

export interface CanvasTimings extends Timings {
  updateMs: number;
}

/**
 * 构建 Canvas 基准测试场景的 JSX
 * 使用大量绝对定位的 Container 来模拟复杂的渲染负载
 */
function buildBenchmarkJSX(count: number, W: number, H: number) {
  return (
    <Stack key="perf-root">
      {Array.from({ length: count }).map((_, i) => {
        const x = Math.floor(Math.random() * Math.max(1, W - 4));
        const y = Math.floor(Math.random() * Math.max(1, H - 4));
        // 使用交替颜色增加视觉复杂度
        const color = i % 2 === 0 ? '#1890ff' : '#52c41a';
        return (
          <Positioned key={`p-${i}`} left={x} top={y}>
            <Container key={`c-${i}`} width={4} height={4} color={color} />
          </Positioned>
        );
      })}
    </Stack>
  );
}

/**
 * 执行 Canvas 专用基准测试
 * 包含：构建(Build)、布局(Layout)、绘制(Paint) 以及 更新(Update) 性能测量
 */
export async function runCanvasBenchmark(
  stageEl: HTMLElement,
  editor: Runtime,
  count: number,
): Promise<CanvasTimings> {
  // --- 1. 初始化与构建阶段 ---
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildBenchmarkJSX(count, stageW, stageH);
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

  // 布局
  const tLayout0 = performance.now();
  root.layout(constraints);
  const tLayout1 = performance.now();

  // 初始化渲染器
  const renderer = editor.getRenderer() ?? new Canvas2DRenderer();
  const container = editor.getContainer()!;
  const opts: RendererOptions = {
    width: Math.max(stageW, 100),
    height: Math.max(stageH, 100),
    backgroundAlpha: 0,
  } as RendererOptions;

  const tInit0 = performance.now();
  await renderer.initialize(container, opts);
  const tInit1 = performance.now();

  // 绘制
  const context: BuildContext = { renderer };
  root.paint(context);
  renderer.render();

  // 等待绘制完成
  const paintWait = await measureNextPaint();

  const compileMs = tCompile1 - tCompile0;
  const buildMs = tBuild1 - tBuild0 + compileMs;
  const layoutMs = tLayout1 - tLayout0;
  const paintMs = paintWait + (tInit1 - tInit0);

  // --- 2. 更新阶段 ---
  // 模拟一次完整的更新循环：重新布局 -> 重新绘制
  // 这里我们复用现有的 widget 树，模拟属性变化后的重绘流程

  const tUpdate0 = performance.now();

  // 强制重新布局
  root.layout(constraints);

  // 重新绘制
  root.paint(context);
  renderer.render();

  // 等待更新帧完成
  await measureNextPaint();
  const tUpdateEnd = performance.now();

  const updateMs = tUpdateEnd - tUpdate0;

  return { buildMs, layoutMs, paintMs, updateMs };
}
