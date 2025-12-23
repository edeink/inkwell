import { Widget } from '../core/base';
import { EventManager } from '../core/events/manager';
import { EventRegistry } from '../core/events/registry';
import { Canvas2DRenderer } from '../renderer/canvas2d/canvas-2d-renderer';
import { LOCAL_RESOLUTION } from '../utils/local-storage';

import type { BoxConstraints, BuildContext } from '../core/base';
import type { IRenderer, RendererOptions } from '../renderer/IRenderer';
import type { ComponentType } from '@/core/type';
import type { AnyElement } from '@/utils/compiler/jsx-compiler';

import { createWidget as createExternalWidget, WidgetRegistry } from '@/core/registry';
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
  [key: string]: unknown;
}

/**
 * 运行时类
 */
export default class Runtime {
  private renderer: IRenderer | null = null;
  private _container: HTMLElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private rootWidget: Widget | null = null;
  private oomErrorCount: number = 0;
  private lastOomToastAt: number = 0;
  private canvasId: string | null = null;
  private dirtyWidgets: Set<Widget> = new Set();
  private __layoutScheduled: boolean = false;
  private __layoutRaf: number | null = null;
  static canvasRegistry: Map<
    string,
    { canvas: HTMLCanvasElement; runtime: Runtime; container: HTMLElement }
  > = new Map();

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
    this._container = this.initContainer(containerId);
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
    if (!this.renderer || !this._container) {
      return;
    }

    const rendererOptions: RendererOptions = {
      antialias: options.antialias ?? true,
      resolution: options.resolution ?? LOCAL_RESOLUTION.get() ?? 4,
      background: options.background ?? 0x000000,
      backgroundAlpha: options.backgroundAlpha ?? 0,
      width: size?.width ?? this._container.clientWidth,
      height: size?.height ?? this._container.clientHeight,
    };

    await this.renderer.initialize(this._container, rendererOptions);
    const raw = this.renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    if (canvas && this._container) {
      this._canvas = canvas;
      if (!this.canvasId) {
        this.canvasId = Runtime.generateUUID();
      }
      canvas.dataset.inkwellId = this.canvasId;
      Runtime.canvasRegistry.set(this.canvasId, {
        canvas,
        runtime: this,
        container: this._container,
      });
      EventManager.bind(this);
    }
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

  get container(): HTMLElement | null {
    return this._container;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  getRootWidget(): Widget | null {
    return this.rootWidget;
  }

  getCanvasId(): string | null {
    return this.canvasId;
  }

  static getByCanvasId(id: string): Runtime | null {
    const rec = Runtime.canvasRegistry.get(id);
    return rec ? rec.runtime : null;
  }

  static listCanvas(): Array<{
    id: string;
    canvas: HTMLCanvasElement;
    runtime: Runtime;
    container: HTMLElement;
  }> {
    const out: Array<{
      id: string;
      canvas: HTMLCanvasElement;
      runtime: Runtime;
      container: HTMLElement;
    }> = [];
    for (const [id, rec] of Runtime.canvasRegistry) {
      out.push({ id, canvas: rec.canvas, runtime: rec.runtime, container: rec.container });
    }
    return out;
  }

  /**
   * 切换渲染器
   * @param rendererType 渲染器类型
   * @param options 编辑器配置
   */
  switchRenderer(rendererType: string, options: RuntimeOptions = {}): void {
    if (!this._container) {
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

  tick(dirty?: Widget[]): void {
    if (Array.isArray(dirty) && dirty.length > 0) {
      for (const w of dirty) {
        if (w) {
          this.dirtyWidgets.add(w);
        }
      }
    }

    // 如果有挂起的 RAF，取消它，因为我们要立即执行了
    if (this.__layoutRaf !== null) {
      cancelAnimationFrame(this.__layoutRaf);
      this.__layoutRaf = null;
      this.__layoutScheduled = false;
    }

    if (!this.rootWidget || !this.renderer) {
      return;
    }
    if (this.dirtyWidgets.size === 0) {
      // 若无脏节点，默认检查 rootWidget（防止空 tick 调用）
      this.dirtyWidgets.add(this.rootWidget);
    }
    this.rebuild();
  }

  scheduleUpdate(widget: Widget): void {
    if (!widget) {
      return;
    }
    this.dirtyWidgets.add(widget);
    this.ensureLayoutScheduled();
  }

  private ensureLayoutScheduled() {
    if (!this.__layoutScheduled) {
      this.__layoutScheduled = true;
      this.__layoutRaf = requestAnimationFrame(async () => {
        try {
          await this.flushUpdates();
        } catch (error) {
          console.error('布局更新失败:', error);
        }
      });
    }
  }

  private async flushUpdates() {
    try {
      let loops = 0;
      // 循环处理，直到没有脏节点（防止更新丢失）
      // 设置最大轮数避免死循环
      while (this.dirtyWidgets.size > 0 && loops < 10) {
        await this.rebuild();
        loops++;
      }
      if (loops >= 10) {
        console.warn('Inkwell: 超过最大重建深度。');
        this.dirtyWidgets.clear();
      }
    } finally {
      this.__layoutScheduled = false;
      this.__layoutRaf = null;

      // 双重保险：如果 finally 执行时又有新节点（极少见情况），再次调度
      if (this.dirtyWidgets.size > 0) {
        this.ensureLayoutScheduled();
      }
    }
  }

  /**
   * 从 JSX 元素渲染
   */
  async renderFromJSX(element: AnyElement): Promise<void> {
    EventRegistry.setCurrentRuntime(this);
    const json = compileElement(element);
    EventRegistry.setCurrentRuntime(null);
    await this.renderFromJSON(json);
  }

  async render(element: AnyElement): Promise<void> {
    await this.renderFromJSX(element);
  }

  /**
   * 从模板函数渲染（返回 JSX 元素）
   */
  async renderTemplate(template: () => AnyElement): Promise<void> {
    EventRegistry.setCurrentRuntime(this);
    const json = compileTemplate(template);
    EventRegistry.setCurrentRuntime(null);
    await this.renderFromJSON(json);
  }

  /**
   * 从JSON数据渲染组件
   * @param jsonData JSON组件数据
   */
  async renderFromJSON(jsonData: ComponentData): Promise<void> {
    if (!this.renderer || !this._container) {
      console.warn('Runtime 未初始化');
      return;
    }

    try {
      EventRegistry.setCurrentRuntime(this);
      this.rootWidget = this.parseComponentData(jsonData);
      if (this.rootWidget) {
        this.rootWidget.runtime = this;
        this.rootWidget.createElement(this.rootWidget.data);
      }

      if (this.rootWidget) {
        // 先进行布局计算获得总尺寸
        const totalSize = this.calculateLayout(this.rootWidget);

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
      if (this._container) {
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
        const existingError = this._container.querySelector('.flutter-error');
        if (existingError) {
          existingError.remove();
        }

        errorDiv.className = 'flutter-error';
        this._container.appendChild(errorDiv);
      }

      // 重新抛出错误以便调试
      throw error;
    } finally {
      EventRegistry.setCurrentRuntime(null);
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
      const w = WidgetRegistry.createWidget(data);
      if (w) {
        return w;
      }
      const ext = createExternalWidget(data.type, data);
      return ext;
    } catch (error) {
      console.error('创建组件失败:', error, data);
      return null;
    }
  }

  /**
   * 计算布局获得总尺寸
   */
  private calculateLayout(widget: Widget & { width?: number; height?: number }): {
    width: number;
    height: number;
  } {
    if (!widget) {
      return { width: 800, height: 600 }; // 默认尺寸
    }
    if (typeof widget.layout !== 'function') {
      console.warn('Invalid widget: missing layout function', widget);
      return { width: 800, height: 600 };
    }

    // 创建约束条件
    const constraints: BoxConstraints = {
      minWidth: 0,
      maxWidth: widget.width ?? Infinity,
      minHeight: 0,
      maxHeight: widget.height ?? Infinity,
    };

    // 执行布局计算
    const size = widget.layout(constraints);

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

  async rebuild(): Promise<void> {
    if (!this.rootWidget || !this.renderer || !this.container) {
      return;
    }
    const dirtyList = Array.from(this.dirtyWidgets);
    this.dirtyWidgets.clear();

    // Sort by depth to ensure parents update before children
    dirtyList.sort((a, b) => a.depth - b.depth);

    let hasAnyUpdate = false;
    if (dirtyList.length > 0) {
      for (const w of dirtyList) {
        // If the widget was added to dirtyWidgets during this rebuild (e.g. by parent update),
        // remove it to prevent double render in next frame
        if (this.dirtyWidgets.has(w)) {
          this.dirtyWidgets.delete(w);
        }

        if (w.isDisposed()) {
          continue;
        }

        const changed = w.rebuild();
        const dirtyFlag = w.isLayoutDirty();
        const widgetDirty = w.isDirty();
        if (changed || dirtyFlag || widgetDirty) {
          hasAnyUpdate = true;
        }
        w.clearDirty();
      }
    }
    if (!hasAnyUpdate && dirtyList.length === 0) {
      return;
    }
    const totalSize = this.calculateLayout(this.rootWidget);
    const initialized = !!this.canvasId;
    if (!initialized) {
      await this.initRenderer({}, totalSize);
    } else {
      this.renderer.update({
        width: totalSize.width,
        height: totalSize.height,
      });
    }
    this.clearCanvas();
    this.performRender();
  }

  rerender(): void {
    if (!this.rootWidget || !this.renderer) {
      return;
    }
    this.clearCanvas();
    this.performRender();
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
    const perfWithMemory = performance as {
      memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number };
    };
    if (perfWithMemory && perfWithMemory.memory) {
      const mem = perfWithMemory.memory;
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
    const host = this._container ?? document.body;
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
    if (this.__layoutRaf != null) {
      try {
        cancelAnimationFrame(this.__layoutRaf);
      } catch {}
      this.__layoutRaf = null;
    }
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this._container = null;
    this.rootWidget = null;
    if (this.canvasId) {
      EventManager.unbind(this);
      Runtime.canvasRegistry.delete(this.canvasId);
      this.canvasId = null;
    }
    EventRegistry.clearRuntime(this);
  }

  private static generateUUID(): string {
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0'));
      return (
        hex.slice(0, 4).join('') +
        '-' +
        hex.slice(4, 6).join('') +
        '-' +
        hex.slice(6, 8).join('') +
        '-' +
        hex.slice(8, 10).join('') +
        '-' +
        hex.slice(10, 16).join('')
      );
    } catch {
      const s = Math.random().toString(36).slice(2);
      return `rnd-${Date.now()}-${s}`;
    }
  }
}
