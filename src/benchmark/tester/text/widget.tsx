/** @jsxImportSource @/utils/compiler */
import { Text, Wrap } from '../../../core';
import '../../../core/registry';
import { Widget } from '../../../core/base';
import Editor from '../../../editors/graphics-editor';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { measureNextPaint, type Timings } from '../../metrics/collector';

import type { BoxConstraints, BuildContext } from '../../../core/base';
import type { RendererOptions } from '../../../renderer/IRenderer';

function buildTextJSX(count: number) {
  return (
    <Wrap key="perf-text">
      {Array.from({ length: count }).map((_, i) => (
        <Text key={`t-${i}`} text={`t${i}`} fontSize={12} />
      ))}
    </Wrap>
  );
}

export async function createTextWidgetNodes(stageEl: HTMLElement): Promise<{ editor: Editor }> {
  const id = stageEl.id || 'stage';
  const editor = await Editor.create(id, { backgroundAlpha: 0 });
  return { editor };
}

export async function buildTextWidgetScene(
  stageEl: HTMLElement,
  editor: Editor,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildTextJSX(count);
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
