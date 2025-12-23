/** @jsxImportSource @/utils/compiler */

import { detPos } from './helper';

import type { Timings } from '@/benchmark/metrics/collector';

import { measureNextPaint } from '@/benchmark/metrics/collector';
import { NextText, Positioned, Stack } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { Canvas2DRenderer } from '@/renderer/canvas2d/canvas-2d-renderer';
import Runtime from '@/runtime';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function buildTextJSX(count: number, W: number, H: number) {
  return (
    <Stack key="perf-text-v2">
      {Array.from({ length: count }).map((_, i) => {
        const { x, y } = detPos(i, W, H);
        return (
          <Positioned key={`p-${i}`} left={x} top={y}>
            <NextText
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

export async function buildTextWidgetSceneV2(
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
  const root = (await WidgetRegistry.createWidget(json))!; // use same path as prev for fairness
  root.createElement(json);
  const tBuild1 = performance.now();

  const constraints = {
    minWidth: 0,
    maxWidth: stageW,
    minHeight: 0,
    maxHeight: stageH,
  } as const;
  const tLayout0 = performance.now();
  root.layout(constraints);
  const tLayout1 = performance.now();

  const renderer = runtime.getRenderer() ?? new Canvas2DRenderer();
  const container = runtime.container!;
  const opts = {
    width: Math.max(stageW, 100),
    height: Math.max(stageH, 100),
    backgroundAlpha: 0,
  };
  const tInit0 = performance.now();
  await renderer.initialize(container, opts);
  const tInit1 = performance.now();

  const context = { renderer };
  root.paint(context);
  renderer.render();
  const paintWait = await measureNextPaint();

  const compileMs = tCompile1 - tCompile0;
  const buildMs = tBuild1 - tBuild0 + compileMs;
  const layoutMs = tLayout1 - tLayout0;
  const paintMs = paintWait + (tInit1 - tInit0);
  return { buildMs, layoutMs, paintMs };
}
