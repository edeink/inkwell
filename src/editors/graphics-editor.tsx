import type { AnyElement } from "@/utils/compiler/jsx-compiler";
import { compileElement, compileTemplate } from "@/utils/compiler/jsx-compiler";
import type { BoxConstraints, BuildContext } from "../core/base";
import { Widget } from "../core/base";
import type { IRenderer, RendererOptions } from "../renderer/IRenderer";
import { Canvas2DRenderer } from "../renderer/canvas2d/canvas-2d-renderer";
import { LOCAL_RESOLUTION } from "../utils/local-storage";
// 导入注册表以确保所有组件类型都已注册
import "../core/registry";

/**
 * 编辑器配置接口
 */
export interface EditorOptions {
  renderer?: "canvas2d" | string;
  /** 是否开启抗锯齿 */
  antialias?: boolean;
  /** 分辨率 */
  resolution?: number;
  /** 背景色 */
  background?: string;
  /** 背景透明度 */
  backgroundAlpha?: number;
}

export const enum ComponentType {
  Column = "Column",
  Text = "Text",
  Row = "Row",
  Expanded = "Expanded",
  Image = "Image",
  SizedBox = "SizedBox",
  Container = "Container",
  Padding = "Padding",
  Center = "Center",
  Stack = "Stack",
  Positioned = "Positioned",
}

/**
 * JSON组件数据接口
 */
export interface ComponentData {
  type: ComponentType;
  children?: ComponentData[];
  [key: string]: any;
}

/**
 * 编辑器类
 */
export default class Editor {
  private renderer: IRenderer | null = null;
  private container: HTMLElement | null = null;
  private rootWidget: Widget | null = null;

  /**
   * 创建编辑器实例
   * @param containerId 容器元素ID
   * @param options 编辑器配置
   */
  static async create(
    containerId: string,
    options: EditorOptions = {}
  ): Promise<Editor> {
    const editor = new Editor();
    await editor.init(containerId, options);
    return editor;
  }

  private constructor() {
    // 私有构造函数，强制使用 create 方法
  }

  private async init(
    containerId: string,
    options: EditorOptions
  ): Promise<void> {
    this.container = this.initContainer(containerId);
    this.renderer = this.createRenderer(options.renderer || "canvas2d");
    // 注意：渲染器将在 renderFromJSON 中根据布局尺寸进行初始化
    this.initEvent();
  }

  /**
   * 初始化事件
   */
  private initEvent() { }

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
    switch (rendererType.toLowerCase()) {
      case "canvas2d":
      default:
        return new Canvas2DRenderer();
    }
  }

  /**
   * 初始化渲染器
   * @param options 编辑器配置选项
   * @param size 可选的尺寸参数，如果不提供则使用容器尺寸
   */
  private async initRenderer(
    options: EditorOptions = {},
    size?: { width: number; height: number }
  ): Promise<void> {
    if (!this.renderer || !this.container) return;

    const rendererOptions: RendererOptions = {
      antialias: options.antialias ?? true,
      resolution: options.resolution ?? LOCAL_RESOLUTION.get() ?? 4,
      background: options.background ?? 0x000000,
      backgroundAlpha: options.backgroundAlpha ?? 0,
      width: size?.width ?? this.container.clientWidth,
      height: size?.height ?? this.container.clientHeight,
    };

    await this.renderer.initialize(this.container, rendererOptions);
  }

  /**
   * 获取当前渲染器实例
   * @returns 渲染器实例
   */
  getRenderer(): IRenderer | null {
    return this.renderer;
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  getRootWidget(): Widget | null {
    return this.rootWidget;
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
    this.initRenderer(options);
  }

  /**
   * 从 JSX 元素渲染
   */
  async renderFromJSX(element: AnyElement): Promise<void> {
    const json = compileElement(element);
    await this.renderFromJSON(json);
  }

  /**
   * 从模板函数渲染（返回 JSX 元素）
   */
  async renderTemplate(template: () => AnyElement): Promise<void> {
    const json = compileTemplate(template);
    console.log('~~~', json);
    await this.renderFromJSON(json);
  }

  /**
   * 从JSON数据渲染组件
   * @param jsonData JSON组件数据
   */
  async renderFromJSON(jsonData: ComponentData): Promise<void> {
    if (!this.renderer || !this.container) {
      console.warn("Editor not initialized");
      return;
    }

    try {
      // 解析JSON并创建组件树
      this.rootWidget = this.parseComponentData(jsonData);

      if (this.rootWidget) {
        // 先进行布局计算获得总尺寸
        const totalSize = this.calculateLayout();

        // 根据布局尺寸初始化渲染器
        await this.initRenderer({}, totalSize);

        // 清除之前的渲染内容
        this.clearCanvas();

        // 执行渲染
        this.performRender();
      }
    } catch (error) {
      // 捕获并显示Flutter风格的错误
      console.error("渲染错误:", error);

      // 在页面上显示错误信息
      if (this.container) {
        const errorDiv = document.createElement("div");
        errorDiv.style.cssText = `
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          background: #ffebee;
          border: 2px solid #f44336;
          border-radius: 8px;
          padding: 16px;
          font-family: monospace;
          font-size: 14px;
          color: #c62828;
          white-space: pre-wrap;
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        `;
        errorDiv.textContent =
          error instanceof Error ? error.message : String(error);

        // 清除之前的错误信息
        const existingError = this.container.querySelector(".flutter-error");
        if (existingError) {
          existingError.remove();
        }

        errorDiv.className = "flutter-error";
        this.container.appendChild(errorDiv);
      }

      // 重新抛出错误以便调试
      throw error;
    }
  }

  /**
   * 解析组件数据创建Widget
   * @param data 组件数据
   * @returns Widget实例
   */
  private parseComponentData(data: ComponentData): Widget | null {
    if (!data || !data.type) {
      console.warn("Invalid component data:", data);
      return null;
    }

    // 确保数据完整性
    if (!data.key) {
      console.warn("Missing key for component:", data.type);
    }

    // 直接使用原始数据创建Widget，让Widget构造函数处理children的递归创建
    try {
      return Widget.createWidget(data);
    } catch (error) {
      console.error("Failed to create widget:", error, data);
      return null;
    }
  }

  /**
   * 计算布局获得总尺寸
   */
  private calculateLayout(): { width: number; height: number } {
    if (!this.rootWidget || !this.container) {
      return { width: 800, height: 600 }; // 默认尺寸
    }

    // 创建约束条件
    const constraints: BoxConstraints = {
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: 0,
      maxHeight: Infinity,
    };

    // 执行布局计算
    const size = this.rootWidget.layout(constraints);

    const finalSize = {
      width: Math.max(size.width, 100), // 最小宽度
      height: Math.max(size.height, 100), // 最小高度
    };

    return finalSize;
  }

  /**
   * 根据布局尺寸初始化渲染器
   */

  /**
   * 执行渲染
   */
  private performRender(): void {
    if (!this.rootWidget || !this.renderer) return;

    // 创建构建上下文
    const context: BuildContext = {
      renderer: this.renderer,
    };

    // 执行绘制
    this.rootWidget.paint(context);
    this.renderer.render();
  }

  rebuild(): void {
    if (!this.rootWidget || !this.renderer || !this.container) return;
    const totalSize = this.calculateLayout();
    void this.initRenderer({}, totalSize).then(() => {
      this.clearCanvas();
      this.performRender();
    });
  }

  /**
   * 清除画布内容
   */
  private clearCanvas(): void {
    if (!this.renderer) return;
    const raw = this.renderer.getRawInstance();
    if (raw && typeof (raw as CanvasRenderingContext2D).clearRect === "function") {
      const ctx = raw as CanvasRenderingContext2D;
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
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
    this.rootWidget = null;
  }
}
