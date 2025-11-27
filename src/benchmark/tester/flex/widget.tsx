/** @jsxImportSource @/utils/compiler */
import { Container, Wrap } from '../../../core';
import { Widget } from '../../../core/base';
import '../../../core/registry';
import Editor from '../../../editors/graphics-editor';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { measureNextPaint, type Timings } from '../../metrics/collector';

import type { BoxConstraints, BuildContext } from '../../../core/base';
import type { RendererOptions } from '../../../renderer/IRenderer';

/**
 * 构建 Flex 布局场景的 JSX：Wrap 容器下生成 count 个 6×6 方块。
 * @param count 节点数量
 * @returns JSX 树
 */
function buildFlexJSX(count: number) {
  return (
    <Wrap key="perf-flex">
      {Array.from({ length: count }).map((_, i) => (
        <Container key={`c-${i}`} width={6} height={6} color="#888" />
      ))}
    </Wrap>
  );
}

/** 创建编辑器实例，绑定到舞台元素
 * @param stageEl 舞台元素
 * @returns 编辑器实例
 */
export async function createFlexWidgetNodes(stageEl: HTMLElement): Promise<{ editor: Editor }> {
  const id = stageEl.id || 'stage';
  const editor = await Editor.create(id, { backgroundAlpha: 0 });
  return { editor };
}

/**
 * 编译、构建、布局并初始化渲染器，完成绘制后统计耗时。
 * @param stageEl 舞台元素
 * @param editor 编辑器实例
 * @param count 节点数量
 * @returns Timings（构建/布局/绘制耗时）
 */
export async function buildFlexWidgetScene(
  stageEl: HTMLElement,
  editor: Editor,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildFlexJSX(count);
  const json = compileElement(jsx);
  const tCompile1 = performance.now();

  const tBuild0 = performance.now();
  const root = Widget.createWidget(json)!;
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
