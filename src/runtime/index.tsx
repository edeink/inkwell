import { Widget } from '../core/base';
import { Canvas2DRenderer } from '../renderer/canvas2d/canvas-2d-renderer';
import { LOCAL_RESOLUTION } from '../utils/local-storage';

import type { BoxConstraints, BuildContext } from '../core/base';
import type { IRenderer, RendererOptions } from '../renderer/IRenderer';

// 导入注册表以确保所有组件类型都已注册
import type { ComponentType } from '@/core/type';
import type { AnyElement } from '@/utils/compiler/jsx-compiler';

import { compileElement, compileTemplate } from '@/utils/compiler/jsx-compiler';
import '../core/registry';

/**
 * 运行时配置接口
 */
export interface RuntimeOptions {
  renderer?: 'canvas2d' | string;
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
  type: ComponentType;
  children?: ComponentData[];
  [key: string]: any;
}

/**
 * 运行时类
 */
export default class Runtime {
  private renderer: IRenderer | null = null;
  private container: HTMLElement | null = null;
  private rootWidget: Widget | null = null;
  private oomErrorCount: number = 0;
  private lastOomToastAt: number = 0;

  /**
   * 创建运行时实例
   * @param containerId 容器元素ID
   * @param options 运行时配置
   */
  static async create(containerId: string, options: RuntimeOptions = {}): Promise<Runtime> {
    const runtime = new Runtime();
    await runtime.init(containerId, options);
    return runtime;
  }

  private constructor() {
    // 私有构造函数，强制使用 create 方法
  }

  private async init(containerId: string, options: RuntimeOptions): Promise<void> {
    this.container = this.initContainer(containerId);
    this.renderer = this.createRenderer(options.renderer || 'canvas2d');
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
    switch (rendererType.toLowerCase()) {
      case 'canvas2d':
      default:
        return new Canvas2DRenderer();
    }
  }

  /**
   * 初始化渲染器
   * @param options 运行时配置选项
   * @param size 可选的尺寸参数，如果不提供则使用容器尺寸
   */
  private async initRenderer(
    options: RuntimeOptions = {},
    size?: { width: number; height: number },
  ): Promise<void> {
    if (!this.renderer || !this.container) {
      return;
    }

    const rendererOptions: RendererOptions = {
      antialias: options.antialias ?? true,
      resolution: options.resolution ?? LOCAL_RESOLUTION.get() ?? 4,
      background: options.background ?? 0x000000,
      backgroundAlpha: options.backgroundAlpha ?? 0,
      width: size?.width ?? this.container.clientWidth,
      height: size?.height ?? this.container.clientHeight,
    };

    await this.renderer.initialize(this.container, rendererOptions);
    const px = (rendererOptions.width ?? 0) * (rendererOptions.height ?? 0);
    const tooLargePx = 64 * 1024 * 1024; // 64M 像素阈值（约 256MB 内存，依赖实现）
    if (px > tooLargePx) {
      this.notifyOomRisk('渲染尺寸过大，可能导致内存溢出');
    }
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
  switchRenderer(rendererType: string, options: RuntimeOptions = {}): void {
    if (!this.container) {
      return;
    }

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
    await this.renderFromJSON(json);
  }

  /**
   * 从JSON数据渲染组件
   * @param jsonData JSON组件数据
   */
  async renderFromJSON(jsonData: ComponentData): Promise<void> {
    if (!this.renderer || !this.container) {
      console.warn('Runtime not initialized');
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
      console.error('渲染错误:', error);

      // 在页面上显示错误信息
      if (this.container) {
        const errorDiv = document.createElement('div');
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
        errorDiv.textContent = error instanceof Error ? error.message : String(error);

        // 清除之前的错误信息
        const existingError = this.container.querySelector('.flutter-error');
        if (existingError) {
          existingError.remove();
        }

        errorDiv.className = 'flutter-error';
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
      console.warn('Invalid component data:', data);
      return null;
    }

    // 确保数据完整性
    if (!data.key) {
      console.warn('Missing key for component:', data.type);
    }

    // 直接使用原始数据创建Widget，让Widget构造函数处理children的递归创建
    try {
      return Widget.createWidget(data);
    } catch (error) {
      console.error('Failed to create widget:', error, data);
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
    if (!this.rootWidget || !this.renderer) {
      return;
    }

    // 创建构建上下文
    const context: BuildContext = {
      renderer: this.renderer,
    };

    // 执行绘制
    try {
      this.rootWidget.paint(context);
      this.renderer.render();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (this.isCanvasOomErrorMessage(msg)) {
        this.oomErrorCount++;
        this.notifyOomRisk('检测到 Canvas 渲染异常，可能是内存溢出');
      }
      throw e;
    }
    this.monitorMemory();
  }

  rebuild(): void {
    if (!this.rootWidget || !this.renderer || !this.container) {
      return;
    }
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
    if (!this.renderer) {
      return;
    }
    const raw = this.renderer.getRawInstance();
    if (raw && typeof (raw as CanvasRenderingContext2D).clearRect === 'function') {
      try {
        const ctx = raw as CanvasRenderingContext2D;
        const canvas = ctx.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (this.isCanvasOomErrorMessage(msg)) {
          this.oomErrorCount++;
          this.notifyOomRisk('清空画布时出现异常，可能是内存溢出');
        }
        throw e;
      }
    }
  }

  private isCanvasOomErrorMessage(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes('out of memory') ||
      m.includes('ns_error_not_available') ||
      m.includes('context lost') ||
      m.includes('gl_out_of_memory') ||
      m.includes('cannot draw image')
    );
  }

  private monitorMemory(): void {
    const anyPerf = performance as any;
    if (anyPerf && anyPerf.memory) {
      const mem = anyPerf.memory;
      const used = Number(mem.usedJSHeapSize || 0);
      const limit = Number(mem.jsHeapSizeLimit || 0);
      if (limit > 0) {
        const ratio = used / limit;
        if (ratio > 0.92) {
          this.notifyOomRisk('内存使用接近上限，可能导致页面空白');
        }
      }
    }
    if (this.oomErrorCount >= 2) {
      this.notifyOomRisk('连续渲染异常，可能是内存溢出');
      this.oomErrorCount = 0;
    }
  }

  private notifyOomRisk(reason: string): void {
    const now = Date.now();
    if (now - this.lastOomToastAt < 8000) {
      return;
    }
    this.lastOomToastAt = now;
    const host = this.container ?? document.body;
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 99999;
      background: rgba(255, 77, 79, 0.95);
      color: #fff;
      padding: 12px 16px;
      border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      font-size: 13px;
      line-height: 1.6;
      max-width: 360px;
      backdrop-filter: saturate(180%) blur(4px);
    `;
    toast.innerText = `${reason}，建议保存数据并重启电脑以恢复。`;
    host.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 8000);
  }

  /**
   * 销毁运行时实例
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
