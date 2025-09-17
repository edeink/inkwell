import {
  Application,
  TextStyle,
  Text,
  Graphics,
  Sprite,
  Texture,
  Rectangle,
  type TextStyleFontWeight,
} from "pixi.js";
import type { IRenderer, RendererOptions } from "../IRenderer";

/**
 * Pixi.js 渲染器实现
 */
export class PixiRenderer implements IRenderer {
  private app: Application | null = null;
  private container: HTMLElement | null = null;
  private isDataDirty: boolean = false;
  private tickerRunning: boolean = false;
  private tickerStopTimer: number | null = null;

  /**
   * 初始化渲染器
   * @param container 容器元素
   * @param options 渲染选项
   */
  async initialize(
    container: HTMLElement,
    options: RendererOptions
  ): Promise<void> {
    this.container = container;
    this.app = new Application();

    if (options.width) {
      this.container.style.width = `${options.width}px`;
    }
    if (options.height) {
      this.container.style.height = `${options.height}px`;
    }

    await this.app.init({
      antialias: options.antialias,
      resolution: options.resolution,
      background: options.background,
      backgroundAlpha: options.backgroundAlpha,
      width: options.width,
      height: options.height,
      resizeTo: container, // Pixi 特有的自动调整大小功能
    });

    // 将 Pixi 应用添加到容器中
    container.appendChild(this.app.canvas);

    // 初始化时设置 canvas 大小，避免拉伸图片
    this.app.canvas.style.setProperty("width", container.clientWidth + "px");
    this.app.canvas.style.setProperty("height", container.clientHeight + "px");

    // 初始化时停止 ticker 以节省资源
    this.stopTicker();
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
    if (this.app) {
      // 标记数据已更新，需要渲染
      this.markDataDirty();

      // 启动 ticker 进行持续渲染（如果尚未启动）
      this.startTicker();

      // 手动触发一次渲染
      this.app.render();

      // 渲染完成后停止 ticker，避免持续渲染
      this.stopTicker();
    }
  }

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void {
    // 停止 ticker
    this.stopTicker();

    // 清理定时器
    if (this.tickerStopTimer) {
      clearTimeout(this.tickerStopTimer);
      this.tickerStopTimer = null;
    }

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }

    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }

    // 重置状态
    this.isDataDirty = false;
    this.tickerRunning = false;
  }

  /**
   * 获取原始 Pixi 应用实例
   * @returns Pixi Application 实例
   */
  getRawInstance(): Application | null {
    return this.app;
  }

  /**
   * 保存当前绘图状态
   * 在 Pixi.js 中通过保存 stage 的变换矩阵实现
   */
  save(): void {
    if (this.app && this.app.stage) {
      // Pixi.js 中可以通过保存变换状态来实现类似功能
      // 这里可以扩展为保存更多状态信息
      const stage = this.app.stage;
      (stage as any)._savedStates = (stage as any)._savedStates || [];
      (stage as any)._savedStates.push({
        x: stage.position.x,
        y: stage.position.y,
        scaleX: stage.scale.x,
        scaleY: stage.scale.y,
        rotation: stage.rotation,
      });
    }
  }

  /**
   * 恢复之前保存的绘图状态
   * 在 Pixi.js 中通过恢复 stage 的变换矩阵实现
   */
  restore(): void {
    if (this.app && this.app.stage) {
      const stage = this.app.stage;
      const savedStates = (stage as any)._savedStates;
      if (savedStates && savedStates.length > 0) {
        const state = savedStates.pop();
        stage.position.set(state.x, state.y);
        stage.scale.set(state.scaleX, state.scaleY);
        stage.rotation = state.rotation;
      }
    }
  }

  /**
   * 平移坐标系
   * @param x X轴偏移量
   * @param y Y轴偏移量
   */
  translate(x: number, y: number): void {
    if (this.app && this.app.stage) {
      this.app.stage.position.x += x;
      this.app.stage.position.y += y;
    }
  }

  drawText(options: {
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    color?: string;
    lineHeight?: number;
    textAlign?: "left" | "center" | "right";
    textBaseline?: "top" | "middle" | "bottom";
    lines?: string[];
  }): void {
    if (!this.app || !this.app.stage) {
      console.warn("PixiRenderer not initialized");
      return;
    }

    // 标记数据已更新
    this.markDataDirty();

    // 创建文本样式
    const style = new TextStyle({
      fontFamily: options.fontFamily || "Arial",
      fontSize: options.fontSize || 16,
      fontWeight:
        (options.fontWeight as unknown as TextStyleFontWeight) || "normal",
      fill: options.color || "#000000",
      align: options.textAlign || "left",
      lineHeight: options.lineHeight || 1.2,
      wordWrap: options.width ? true : false,
      wordWrapWidth: options.width || 0,
    });

    // 创建文本对象
    const textObject = new Text({ text: options.text, style });
    textObject.resolution = 4;

    // 设置位置
    textObject.x = options.x;
    textObject.y = options.y;

    // 设置文本对齐
    if (options.textAlign === "center" && options.width) {
      textObject.anchor.x = 0.5;
      textObject.x += options.width / 2;
    } else if (options.textAlign === "right" && options.width) {
      textObject.anchor.x = 1;
      textObject.x += options.width;
    }

    // 设置垂直对齐
    if (options.textBaseline === "middle") {
      textObject.anchor.y = 0.5;
    } else if (options.textBaseline === "bottom") {
      textObject.anchor.y = 1;
    }

    // 添加到舞台
    this.app.stage.addChild(textObject);
  }

  /**
   * 绘制矩形
   * @param options 矩形绘制选项
   */
  drawRect(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }): void {
    if (!this.app || !this.app.stage) {
      console.warn("PixiRenderer not initialized");
      return;
    }

    // 标记数据已更新
    this.markDataDirty();

    // 使用 Graphics 绘制矩形
    const graphics = new Graphics();

    // 设置填充色
    if (options.fill) {
      graphics.beginFill(options.fill);
    }

    // 设置边框
    if (options.stroke) {
      graphics.lineStyle(options.strokeWidth || 1, options.stroke);
    }

    // 绘制矩形
    graphics.drawRect(options.x, options.y, options.width, options.height);
    graphics.endFill();

    // 添加到舞台
    this.app.stage.addChild(graphics);
  }

  /**
   * 绘制图片
   * @param options 图片绘制选项
   */
  drawImage(options: {
    image: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
    sx?: number;
    sy?: number;
    sWidth?: number;
    sHeight?: number;
  }): void {
    if (!this.app || !this.app.stage) {
      console.warn("PixiRenderer not initialized");
      return;
    }

    // 标记数据已更新
    this.markDataDirty();

    // 使用 Sprite 绘制图片
    const texture = Texture.from(options.image);
    const sprite = new Sprite(texture);

    // 设置位置和尺寸
    sprite.x = options.x;
    sprite.y = options.y;
    sprite.width = options.width;
    sprite.height = options.height;

    // 如果需要裁剪，创建裁剪纹理
    if (options.sx !== undefined && options.sy !== undefined) {
      const cropTexture = new Texture({
        source: texture.source,
        frame: new Rectangle(
          options.sx || 0,
          options.sy || 0,
          options.sWidth || options.image.width,
          options.sHeight || options.image.height
        )
      });
      sprite.texture = cropTexture;
    }

    // 添加到舞台
    this.app.stage.addChild(sprite);
  }

  /**
   * 标记数据为脏状态
   */
  private markDataDirty(): void {
    this.isDataDirty = true;
  }

  /**
   * 启动 ticker
   */
  private startTicker(): void {
    if (!this.app || this.tickerRunning) {
      return;
    }

    this.app.ticker.start();
    this.tickerRunning = true;
  }

  /**
   * 停止 ticker
   */
  private stopTicker(): void {
    if (!this.app || !this.tickerRunning) {
      return;
    }

    this.app.ticker.stop();
    this.tickerRunning = false;
  }
}
