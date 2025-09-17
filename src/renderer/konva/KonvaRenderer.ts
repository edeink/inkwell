import Konva from "konva";
import type { IRenderer, RendererOptions } from "../IRenderer";

/**
 * Konva.js 渲染器实现
 */
export class KonvaRenderer implements IRenderer {
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private container: HTMLElement | null = null;

  /**
   * 初始化 Konva 渲染器
   * @param container 容器元素
   * @param options 渲染器配置
   */
  initialize(container: HTMLElement, options: RendererOptions): void {
    this.container = container;

    // 创建 Konva Stage
    this.stage = new Konva.Stage({
      container: container.id || (container as any),
      width: options.width,
      height: options.height,
    });

    // 创建主图层
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // 设置分辨率
    if (options.resolution) {
      const scale = options.resolution;
      this.stage.scale({ x: scale, y: scale });
    }

    // 设置背景
    if (options.background && options.background !== "transparent") {
      const background = new Konva.Rect({
        x: 0,
        y: 0,
        width: options.width,
        height: options.height,
        fill: options.background,
        opacity: options.backgroundAlpha ?? 1,
      });
      this.layer.add(background);
    }

    // 初始渲染
    this.layer.draw();
  }

  /**
   * 调整渲染器大小
   * @param width 宽度
   * @param height 高度
   */
  resize(width: number, height: number): void {
    if (this.stage) {
      this.stage.width(width);
      this.stage.height(height);

      // 更新背景大小（如果有）
      if (this.layer && this.layer.children && this.layer.children.length > 0) {
        const background = this.layer.children[0];
        if (background instanceof Konva.Rect) {
          background.width(width);
          background.height(height);
        }
      }
    }
  }

  /**
   * 渲染一帧
   */
  render(): void {
    if (this.layer) {
      this.layer.draw();
    }
  }

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }

    this.layer = null;

    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  /**
   * 获取原始 Konva 实例
   * @returns Konva Stage 实例
   */
  getRawInstance(): any {
    return this.stage;
  }

  /**
   * 获取主图层
   * @returns Konva Layer 实例
   */
  getMainLayer(): Konva.Layer | null {
    return this.layer;
  }

  /**
   * 添加形状到主图层
   * @param shape Konva 形状
   */
  addShape(shape: Konva.Shape): void {
    if (this.layer) {
      this.layer.add(shape);
      this.layer.draw();
    }
  }

  /**
   * 清除所有形状（保留背景）
   */
  clearShapes(): void {
    if (this.layer) {
      // 保留第一个子元素（背景）
      const background =
        this.layer.children && this.layer.children.length > 0
          ? this.layer.children[0]
          : null;

      this.layer.destroyChildren();

      // 重新添加背景
      if (background) {
        this.layer.add(background);
      }

      this.layer.draw();
    }
  }
}
