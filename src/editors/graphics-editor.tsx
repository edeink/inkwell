import { LOCAL_RESOLUTION } from "../utils/localStorage";
import type { IRenderer, RendererOptions } from "../renderer/IRenderer";
import { PixiRenderer } from "../renderer/pixi/PixiRenderer";
import { Widget } from "../core/base";
import type { WidgetData, BuildContext, BoxConstraints } from "../core/base";
import { Column } from "../core/column";
import { Text } from "../core/text";

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
 * JSON组件数据接口
 */
export interface ComponentData {
  type: "column" | "text";
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
  static async create(containerId: string, options: EditorOptions = {}): Promise<Editor> {
    const editor = new Editor();
    await editor.init(containerId, options);
    return editor;
  }

  private constructor() {
    // 私有构造函数，强制使用 create 方法
  }

  private async init(containerId: string, options: EditorOptions): Promise<void> {
    this.container = this.initContainer(containerId);
    this.renderer = this.createRenderer(options.renderer || "pixi");
    // 注意：渲染器将在 renderFromJSON 中根据布局尺寸进行初始化
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
   * @param options 编辑器配置选项
   * @param size 可选的尺寸参数，如果不提供则使用容器尺寸
   */
  private async initRenderer(options: EditorOptions = {}, size?: { width: number; height: number }): Promise<void> {
    if (!this.renderer || !this.container) return;

    const rendererOptions: RendererOptions = {
      antialias: options.antialias ?? true,
      resolution: options.resolution ?? LOCAL_RESOLUTION.get() ?? 4,
      background: options.background ?? "transparent",
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
   * 从JSON数据渲染组件
   * @param jsonData JSON组件数据
   */
  async renderFromJSON(jsonData: ComponentData): Promise<void> {
    if (!this.renderer || !this.container) {
      console.warn("Editor not initialized");
      return;
    }

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
  }

  /**
   * 解析组件数据创建Widget
   * @param data 组件数据
   * @returns Widget实例
   */
  private parseComponentData(data: ComponentData): Widget | null {
    // 递归解析子组件数据
    const childrenData: WidgetData[] | undefined = data.children
      ?.map((child) => {
        const childWidget = this.parseComponentData(child);
        if (childWidget) {
          // 从Widget中提取WidgetData
          return child;
        }
        return null;
      })
      .filter(Boolean) as WidgetData[];

    const widgetData: WidgetData = {
      ...data,
      children: childrenData,
    };

    switch (data.type) {
      case "column":
        return new Column(widgetData);
      case "text":
        return new Text(widgetData as any);
      default:
        console.warn(`Unknown component type: ${data.type}`);
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
      maxWidth: this.container.clientWidth || 800,
      minHeight: 0,
      maxHeight: this.container.clientHeight || 600,
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

    // 渲染到屏幕
    this.renderer.render();
  }

  /**
   * 清除画布内容
   */
  private clearCanvas(): void {
    if (this.renderer) {
      const rawInstance = this.renderer.getRawInstance();
      if (rawInstance && rawInstance.stage) {
        rawInstance.stage.removeChildren();
      }
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
