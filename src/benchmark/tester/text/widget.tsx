/** @jsxImportSource @/utils/compiler */
import { Positioned, Stack, Text } from '../../../core';
import { Widget } from '../../../core/base';
import '../../../core/registry';
import Editor from '../../../editors/graphics-editor';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { measureNextPaint, type Timings } from '../../metrics/collector';

import type { BoxConstraints, BuildContext } from '../../../core/base';
import type { RendererOptions } from '../../../renderer/IRenderer';

/**
 * 构建文本场景的 JSX：Wrap 容器下生成 count 个文本节点。
 * @param count 节点数量
 * @returns JSX 树
 */
function buildTextJSX(count: number, W: number, H: number) {
  return (
    <Stack key="perf-text">
      {Array.from({ length: count }).map((_, i) => {
        const x = Math.floor(Math.random() * Math.max(1, W - 100));
        const y = Math.floor(Math.random() * Math.max(1, H - 20));
        return (
          <Positioned key={`p-${i}`} left={x} top={y}>
            <Text
              key={`t-${i}`}
              text={`t-${i}`}
              fontSize={12}
              lineHeight={12}
              fontWeight={'normal'}
              color={'#111827'}
              fontFamily={'Arial, sans-serif'}
            />
          </Positioned>
        );
      })}
    </Stack>
  );
}

/**
 * 编译、构建、布局并初始化渲染器，完成绘制后统计耗时。
 * @param stageEl 舞台元素
 * @param editor 编辑器实例
 * @param count 节点数量
 * @returns Timings（构建/布局/绘制耗时）
 */
export async function buildTextWidgetScene(
  stageEl: HTMLElement,
  editor: Editor,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildTextJSX(count, stageW, stageH);
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
