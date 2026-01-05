/** @jsxImportSource @/utils/compiler */
import { Positioned, Stack, Text } from '../../../core';
import '../../../core/registry';
import { WidgetRegistry } from '../../../core/registry';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import Runtime from '../../../runtime';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { measureNextPaint, type Timings } from '../../metrics/collector';
import { getThemeColor } from '../../utils/theme';

import { detPos } from './helper';

import type { BoxConstraints, BuildContext } from '../../../core/base';
import type { RendererOptions } from '../../../renderer/IRenderer';

function buildTextJSX(count: number, W: number, H: number) {
  const textColor = getThemeColor('--ink-demo-text-primary');
  return (
    <Stack key="perf-text">
      {Array.from({ length: count }).map((_, i) => {
        const { x, y } = detPos(i, W, H);
        return (
          <Positioned key={`p-${i}`} left={x} top={y}>
            <Text
              key={`t-${i}`}
              text={`t-${i}`}
              fontSize={12}
              lineHeight={12}
              fontWeight={'normal'}
              color={textColor}
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
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  const tCompile0 = performance.now();
  const stageW = stageEl.clientWidth || 800;
  const stageH = stageEl.clientHeight || 600;
  const jsx = buildTextJSX(count, stageW, stageH);
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
