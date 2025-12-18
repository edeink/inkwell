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

/**
 * 构建绝对定位场景的 JSX：在 W×H 区域随机分布 count 个 4×4 容器。
 * @param count 节点数量
 * @param W 舞台宽度
 * @param H 舞台高度
 * @returns JSX 树
 */
function buildAbsoluteJSX(count: number, W: number, H: number) {
  return (
    <Stack key="perf-root">
      {Array.from({ length: count }).map((_, i) => {
        const x = Math.floor(Math.random() * Math.max(1, W - 4));
        const y = Math.floor(Math.random() * Math.max(1, H - 4));
        return (
          <Positioned key={`p-${i}`} left={x} top={y}>
            <Container key={`c-${i}`} width={4} height={4} color="#888" />
          </Positioned>
        );
      })}
    </Stack>
  );
}

/**
 * 编译 JSX → JSON，构建 Widget 树，布局并初始化渲染器，执行绘制并等待下一次绘制完成。
 * @param stageEl 舞台元素
 * @param editor 编辑器实例
 * @param count 节点数量
 * @returns Timings（构建/布局/绘制耗时）
 */
export async function buildAbsoluteWidgetScene(
  stageEl: HTMLElement,
  editor: Runtime,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildAbsoluteJSX(count, stageW, stageH);
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
