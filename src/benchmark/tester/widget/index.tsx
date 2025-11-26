/** @jsxImportSource @/utils/compiler */
import { Container, Stack, Positioned } from '../../../core';

import type { BoxConstraints, BuildContext } from '../../../core/base';

import { Widget } from '../../../core/base';
import '../../../core/registry';
import Editor from '../../../editors/graphics-editor';
import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import { compileElement } from '../../../utils/compiler/jsx-compiler';
import { PerformanceTestInterface } from '../../index.types';

import type { RendererOptions } from '../../../renderer/IRenderer';
import type { PerformanceMetrics } from '../../index.types';

type Ctx = { stageEl: HTMLElement; editor: Editor | null };

function buildJSX(count: number, W: number, H: number) {
  return (
    <Stack key="perf-root">
      {Array.from({
        length: count,
      }).map((_, i) => {
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

export default class WidgetPerformanceTest extends PerformanceTestInterface {
  name = 'Widget';
  private ctx: Ctx;
  private lastMetrics: PerformanceMetrics = {
    nodes: 0,
    createTimeMs: 0,
    avgPerNodeMs: 0,
  };
  private frameSamples: { t: number; fps: number }[] = [];
  private startMark = 0;

  private async ensureEditor(): Promise<Editor> {
    if (this.ctx.editor) {
      return this.ctx.editor;
    }
    const id = this.ctx.stageEl.id || 'stage';
    const editor = await Editor.create(id, {
      backgroundAlpha: 0,
    });
    this.ctx.editor = editor;
    return editor;
  }

  private measureFramesStart(): void {
    this.frameSamples = [];
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (dt > 0) {
        const fps = 1000 / dt;
        this.frameSamples.push({
          t: now - this.startMark,
          fps,
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private clearCanvas(): void {
    const el = this.ctx.stageEl;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    this.ctx.editor = null;
  }

  async createMassiveNodes(targetCount: number): Promise<void> {
    this.clearCanvas();
    const editor = await this.ensureEditor();
    this.startMark = performance.now();
    this.measureFramesStart();

    const beforeMem = this.getMemoryUsage();

    const tCompile0 = performance.now();
    const stageEl = this.ctx.stageEl;
    const stageW = stageEl.clientWidth || 800;
    const stageH = stageEl.clientHeight || 600;
    const jsx = buildJSX(targetCount, stageW, stageH);
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
    const size = root.layout(constraints);
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
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const tPaint0 = performance.now();
    const context: BuildContext = {
      renderer,
    };
    root.paint(context);
    renderer.render();
    const tPaint1 = performance.now();

    const afterMem = this.getMemoryUsage();
    const delta = afterMem.heapUsed - beforeMem.heapUsed;

    const compileMs = tCompile1 - tCompile0;
    const buildMs = tBuild1 - tBuild0 + compileMs;
    const layoutMs = tLayout1 - tLayout0;
    const paintMs = tPaint1 - tPaint0 + (tInit1 - tInit0);
    const createTimeMs = buildMs + layoutMs + paintMs;

    this.lastMetrics = {
      nodes: targetCount,
      createTimeMs,
      avgPerNodeMs: createTimeMs / Math.max(1, targetCount),
      buildMs,
      layoutMs,
      paintMs,
      memoryDelta: delta,
    };
  }

  getPerformanceMetrics() {
    return this.lastMetrics;
  }

  getFrameRate() {
    return this.frameSamples.slice();
  }

  constructor(stageEl: HTMLElement) {
    super();
    this.ctx = {
      stageEl,
      editor: null,
    };
  }
}
