import { Application } from "pixi.js";
import type { IRenderer, RendererOptions } from "../IRenderer";

/**
 * Pixi.js 渲染器实现
 */
export class PixiRenderer implements IRenderer {
  private app: Application | null = null;
  private container: HTMLElement | null = null;

  /**
   * 初始化 Pixi 渲染器
   * @param container 容器元素
   * @param options 渲染器配置
   */
  initialize(container: HTMLElement, options: RendererOptions): void {
    this.container = container;
    this.app = new Application();

    this.app.init({
      antialias: options.antialias,
      resolution: options.resolution,
      background: options.background,
      backgroundAlpha: options.backgroundAlpha,
      width: options.width,
      height: options.height,
      resizeTo: container, // Pixi 特有的自动调整大小功能
    });

    // 将 Pixi 应用添加到容器中
    container.appendChild(this.app.view as HTMLCanvasElement);
  }

  /**
   * 调整渲染器大小
   * @param width 宽度
   * @param height 高度
   */
  resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
    }
  }

  /**
   * 渲染一帧
   */
  render(): void {
    // Pixi 自动处理渲染循环，此方法可用于手动触发渲染
    if (this.app) {
      this.app.render();
    }
  }

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
    
    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  /**
   * 获取原始 Pixi 应用实例
   * @returns Pixi Application 实例
   */
  getRawInstance(): Application | null {
    return this.app;
  }
}
