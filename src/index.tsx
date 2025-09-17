import { LOCAL_RESOLUTION } from "./utils/localStorage";
import type { IRenderer, RendererOptions } from "./renderer/IRenderer";
import { PixiRenderer } from "./renderer/pixi/PixiRenderer";

/**
 * 编辑器配置接口
 */
export interface EditorOptions {
  /** 渲染器类型，默认为 'pixi' */
  renderer?: "pixi" | string;
  /** 是否开启抗锯齿 */
  antialias?: boolean;
  /** 分辨率 */
  resolution?: number;
  /** 背景色 */
  background?: string;
  /** 背景透明度 */
  backgroundAlpha?: number;
}

/**
 * 编辑器类
 */
export default class Editor {
  private renderer: IRenderer | null = null;
  private container: HTMLElement | null = null;

  /**
   * 创建编辑器实例
   * @param containerId 容器元素ID
   * @param options 编辑器配置
   */
  constructor(containerId: string, options: EditorOptions = {}) {
    this.container = this.initContainer(containerId);
    this.renderer = this.createRenderer(options.renderer || "pixi");
    this.initRenderer(this.container, options);
    this.initEvent();
  }

  /**
   * 初始化事件
   */
  private initEvent() {}

  /**
   * 初始化容器
   * @param containerId 容器元素ID
   * @returns 容器元素
   */
  private initContainer(containerId: string): HTMLElement {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`容器 ${containerId} 不存在`);
    }
    return container;
  }

  /**
   * 创建渲染器
   * @param rendererType 渲染器类型
   * @returns 渲染器实例
   */
  private createRenderer(rendererType: string): IRenderer {
    // 这里可以根据 rendererType 创建不同的渲染器实例
    // 未来可以扩展支持更多渲染引擎
    switch (rendererType.toLowerCase()) {
      case "pixi":
      default:
        return new PixiRenderer();
    }
  }

  /**
   * 初始化渲染器
   * @param container 容器元素
   * @param options 编辑器配置
   */
  private initRenderer(container: HTMLElement, options: EditorOptions): void {
    if (!this.renderer || !container) return;

    const rendererOptions: RendererOptions = {
      antialias: options.antialias ?? true,
      resolution: options.resolution ?? LOCAL_RESOLUTION.get() ?? 4,
      background: options.background ?? "transparent",
      backgroundAlpha: options.backgroundAlpha ?? 0,
      width: container.clientWidth,
      height: container.clientHeight,
    };

    this.renderer.initialize(container, rendererOptions);
  }

  /**
   * 获取当前渲染器实例
   * @returns 渲染器实例
   */
  getRenderer(): IRenderer | null {
    return this.renderer;
  }

  /**
   * 切换渲染器
   * @param rendererType 渲染器类型
   * @param options 编辑器配置
   */
  switchRenderer(rendererType: string, options: EditorOptions = {}): void {
    if (!this.container) return;

    // 销毁当前渲染器
    if (this.renderer) {
      this.renderer.destroy();
    }

    // 创建新渲染器
    this.renderer = this.createRenderer(rendererType);
    this.initRenderer(this.container, options);
  }

  /**
   * 销毁编辑器实例
   */
  destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this.container = null;
  }
}
