import { useEffect, useRef } from 'react';

import styles from './index.module.less';

import type { IRenderer, RendererOptions } from '@/renderer/IRenderer';

import { Canvas2DRenderer } from '@/renderer/canvas2d/canvas-2d-renderer';

type Theme = 'light' | 'dark';

class RendererTest {
  private renderer: IRenderer;
  private container: HTMLElement;
  private theme: Theme;

  constructor(
    container: HTMLElement,
    rendererType: 'canvas2d' = 'canvas2d',
    theme: Theme = 'dark',
  ) {
    this.container = container;
    void rendererType;
    this.theme = theme;
    this.renderer = new Canvas2DRenderer();
  }

  async init(): Promise<void> {
    const options: RendererOptions = {
      width: 800,
      height: 600,
      background: this.theme === 'dark' ? 0x000000 : 0xffffff,
      backgroundAlpha: 1,
      antialias: true,
      resolution: 4,
    };
    await this.renderer.initialize(this.container, options);
  }

  clearCanvas(): void {
    const raw = this.renderer.getRawInstance();
    if (raw && typeof (raw as CanvasRenderingContext2D).clearRect === 'function') {
      const ctx = raw as CanvasRenderingContext2D;
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async runRendererTest(): Promise<void> {
    this.renderer.drawText({
      text: '渲染器测试文本',
      x: 100,
      y: 100,
      fontSize: 24,
      color: '#333333',
      fontWeight: 'bold',
    });
    this.renderer.drawRect({
      x: 100,
      y: 150,
      width: 200,
      height: 100,
      fill: '#007bff',
      stroke: '#0056b3',
      strokeWidth: 2,
    });
    this.renderer.drawText({
      text: '矩形渲染测试',
      x: 120,
      y: 180,
      fontSize: 16,
      color: '#ffffff',
    });
  }
}

export default function RendererTab({ theme }: { theme: Theme }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    el.innerHTML = '';
    const test = new RendererTest(el, 'canvas2d', theme);
    test.init().then(() => test.runRendererTest());
    return () => {
      el.innerHTML = '';
      test.clearCanvas();
    };
  }, [theme]);

  return (
    <div className={styles.root}>
      <h2>渲染器独立测试</h2>
      <p>直接测试渲染器的绘制功能，不经过 Build 和 Layout 阶段</p>
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
