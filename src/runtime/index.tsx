import { Widget } from '../core/base';
import { EventManager } from '../core/events/manager';
import { EventRegistry } from '../core/events/registry';
import { clearSelectorCache } from '../core/helper/widget-selector';
import { PipelineOwner } from '../core/pipeline/owner';
import { Canvas2DRenderer } from '../renderer/canvas2d/canvas-2d-renderer';
import { LOCAL_RESOLUTION } from '../utils/local-storage';

import type { BoxConstraints, BuildContext } from '../core/base';
import type { IRenderer, RendererOptions } from '../renderer/IRenderer';
import type { ComponentType } from '@/core/type';
import type { AnyElement } from '@/utils/compiler/jsx-compiler';

import { createWidget as createExternalWidget, WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

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
  /** 是否开启离屏渲染 */
  enableOffscreenRendering?: boolean;
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
  public pipelineOwner: PipelineOwner = new PipelineOwner();
  private oomErrorCount: number = 0;
  private lastOomToastAt: number = 0;
  private canvasId: string | null = null;
  private dirtyWidgets: Set<Widget> = new Set();
  private __layoutScheduled: boolean = false;
  private __layoutRaf: number | null = null;
  public enableOffscreenRendering: boolean = true;
  private tickListeners: Set<() => void> = new Set();
  private _lastRendererOptionsKey: string = '';
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

  /**
   * 销毁运行时实例
   * 释放资源，清理事件监听，销毁 Canvas
   */
  destroy(): void {
    const root = this.rootWidget;

    // 1. 取消正在进行的布局调度
    if (this.__layoutRaf) {
      cancelAnimationFrame(this.__layoutRaf);
      this.__layoutRaf = null;
    }
    this.__layoutScheduled = false;

    // 2. 清理事件管理器
    if (this.canvasId) {
      const entry = Runtime.canvasRegistry.get(this.canvasId);
      if (entry && entry.runtime === this) {
        EventManager.unregisterCanvas(this.canvasId);
        Runtime.canvasRegistry.delete(this.canvasId);
      }
    }

    // 3. 销毁渲染器
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    // 4. 清理引用
    this.rootWidget = null;
    this._canvas = null;
    this._container = null;
    this.dirtyWidgets.clear();
    this.tickListeners.clear();
    this.pipelineOwner.clearNodesNeedingLayout();
    this.pipelineOwner.clearNodesNeedingPaint();
    EventRegistry.clearRuntime(this);

    if (root) {
      clearSelectorCache(root);
      this.disposeWidgetTree(root);
      Widget._pool.clear();
    }
  }

  private disposeWidgetTree(root: Widget) {
    const stack: Widget[] = [root];
    const postOrder: Widget[] = [];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      postOrder.push(cur);
      const children = cur.children;
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        if (c) {
          stack.push(c);
        }
      }
    }
    for (let i = postOrder.length - 1; i >= 0; i--) {
      postOrder[i].dispose();
    }
  }

  private constructor() {
    // 私有构造函数，强制使用 create 方法
    this.pipelineOwner.onNeedVisualUpdate = () => {
      this.ensureLayoutScheduled();
    };
  }

  private async init(containerId: string, options: RuntimeOptions): Promise<void> {
    this._container = this.initContainer(containerId);
    this.enableOffscreenRendering = options.enableOffscreenRendering ?? false;
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

    if (this._canvas && this.renderer.getCanvas?.() === this._canvas) {
      this.renderer.update(rendererOptions);
    } else {
      await this.renderer.initialize(this._container, rendererOptions);
    }

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

  addTickListener(listener: () => void): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  removeTickListener(listener: () => void): void {
    this.tickListeners.delete(listener);
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

  /**
   * 设置是否开启离屏渲染
   * @param enabled 是否开启
   */
  setOffscreenRendering(enabled: boolean): void {
    if (this.enableOffscreenRendering === enabled) {
      return;
    }
    this.enableOffscreenRendering = enabled;
    // 强制重绘
    if (this.rootWidget) {
      this.rootWidget.markNeedsPaint();
      this.scheduleUpdate(this.rootWidget);
    }
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
    if (
      this.dirtyWidgets.size === 0 &&
      !this.pipelineOwner.hasScheduledLayout &&
      !this.pipelineOwner.hasScheduledPaint
    ) {
      // 若无脏节点，默认检查 rootWidget（防止空 tick 调用）
      this.dirtyWidgets.add(this.rootWidget);
    }
    this.handleTick();
  }

  scheduleUpdate(widget: Widget): void {
    if (!widget) {
      return;
    }
    this.dirtyWidgets.add(widget);
    this.requestTick();
  }

  /**
   * 请求一次新的 Tick 更新
   */
  public requestTick(): void {
    if (!this.__layoutScheduled) {
      this.__layoutScheduled = true;
      this.__layoutRaf = requestAnimationFrame(() => {
        this.handleTick();
      });
    }
  }

  public nextTick(cb: () => void): void {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(cb);
      return;
    }
    void Promise.resolve().then(cb);
  }

  private ensureLayoutScheduled() {
    this.requestTick();
  }

  private async handleTick() {
    this.__layoutScheduled = false;
    this.__layoutRaf = null;

    const startTime = performance.now();
    try {
      // 正常情况，tick 会消费所有的 dirtyWidget
      // 此处只是为了二次确保所有的内容都被更新
      await this.flushUpdates();

      // 通知监听器
      this.tickListeners.forEach((listener) => {
        try {
          listener();
        } catch (e) {
          console.error(e);
        }
      });

      // 定期扫描游离节点 (每 100 帧扫描一次)
      this.tickCount++;
      if (this.tickCount % 100 === 0) {
        this.scanForOrphanNodes();
      }
    } catch (error) {
      console.error('布局更新失败:', error);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    // 简单的性能监控记录
    if (duration > 16) {
      // console.warn(`[Tick] 长任务警告: ${duration.toFixed(2)}ms`);
    }
  }

  private tickCount: number = 0;

  /**
   * 扫描并修复游离节点
   * 游离节点是指：标记为 dirty 但未被调度更新的节点
   */
  private scanForOrphanNodes() {
    if (!this.rootWidget) {
      return;
    }

    const visit = (node: Widget) => {
      // 检查布局脏状态
      if (node.isLayoutDirty()) {
        if (node.isRelayoutBoundary) {
          // 如果是边界节点，必须在 owner 的调度列表中
          if (!this.pipelineOwner.isScheduledForLayout(node)) {
            console.warn(
              `[Orphan Node] RelayoutBoundary ${node.type}(${node.key}) 标记为脏但未调度，正在修复...`,
            );
            this.pipelineOwner.scheduleLayoutFor(node);
          }
        } else {
          // 如果不是边界节点，父节点必须是脏的（或者父节点已调度）
          if (node.parent && !node.parent.isLayoutDirty() && !node.parent.isDisposed()) {
            // 检查父节点是否已调度（可能父节点是边界且已调度，但 dirty 标记被清除了？不，dirty 标记在 flush 时才清除）
            // 只要父节点不脏，子节点就无法被访问到（除非父节点重新布局时会遍历子节点，但父节点不脏就不会重新布局）
            console.warn(
              `[Orphan Node] Node ${node.type}(${node.key}) 标记为脏但父节点是干净的，正在修复...`,
            );
            node.markParentNeedsLayout();
          }
        }
      }

      // 递归检查子节点
      // 注意：如果节点是脏的且是边界，我们可能不需要深入检查，因为 flushLayout 会处理它
      // 但为了保险，还是遍历整个树
      for (const child of node.children) {
        visit(child);
      }
    };

    try {
      visit(this.rootWidget);
    } catch (e) {
      console.error('扫描游离节点时出错:', e);
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
    const element = template();
    const json = compileElement(element);
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

      let reused = false;
      // 尝试复用根节点
      if (this.rootWidget && this.rootWidget.type === jsonData.type) {
        // 如果提供了key，必须匹配才能复用
        // 注意：jsonData.key 可能为 null 或 undefined
        if (jsonData.key == null || jsonData.key === this.rootWidget.key) {
          this.rootWidget.createElement(jsonData);
          reused = true;
        }
      }

      if (!reused) {
        this.rootWidget = this.parseComponentData(jsonData);
        if (this.rootWidget) {
          this.rootWidget.runtime = this;
          this.rootWidget.createElement(this.rootWidget.data);
        }
      }

      if (this.rootWidget) {
        // 先进行布局计算获得总尺寸
        const totalSize = this.calculateLayout(this.rootWidget);

        // calculateLayout 会触发 layout 方法，清理节点的 dirty 标记，
        // 但这些节点仍然留在 pipelineOwner 的 _nodesNeedingLayout 集合中。
        // 我们调用 flushLayout 来处理所有剩余的脏节点（特别是 Relayout Boundary）
        this.pipelineOwner.flushLayout();

        // 检查尺寸是否变化，避免不必要的渲染器重置
        const currentWidth = this.renderer.getWidth?.() ?? 0;
        const currentHeight = this.renderer.getHeight?.() ?? 0;
        const sizeChanged = totalSize.width !== currentWidth || totalSize.height !== currentHeight;

        if (sizeChanged) {
          await this.initRenderer({}, totalSize);
        }

        // 如果复用了根节点且尺寸未变，我们尝试只更新脏区域
        // 注意：如果是首次渲染 (!reused) 或尺寸变化，仍需全量绘制
        if (reused && !sizeChanged) {
          // 使用 flushUpdates 逻辑处理局部更新
          await this.flushUpdates();

          // flushUpdates 会调用 rebuild，这可能产生 dirtyWidgets
          // 这里的 flushUpdates 主要处理 layout 和 build
          // 接下来需要处理 paint

          // 如果有需要重绘的节点（通过 markNeedsPaint 标记），Runtime 会在 tick 中处理
          // 但 renderFromJSON 期望立即呈现结果

          // 检查是否有脏节点需要重绘
          if (this.dirtyWidgets.size > 0 || this.pipelineOwner.hasScheduledPaint) {
            // 这里我们手动触发一次 tick 的逻辑，但同步执行 paint
            // 注意：flushUpdates 已经处理了 rebuild (layout)，现在处理 paint
            this.pipelineOwner.flushPaint();
            // 只有当没有脏矩形或需要全量重绘时才清空画布
            // 目前 flushPaint 会调用 updateLayer，如果支持局部重绘
            // 但 Canvas2DRenderer 主要是全量或基于 dirtyRect

            // 为了简单起见，如果复用了，我们仍然调用 performRender，但带上 dirtyRect？
            // 目前系统还未完全实现自动 dirtyRect 计算合并，所以 performRender 默认全量
            // 但我们可以跳过 clearCanvas 如果我们确定只画了一部分？
            // 不，Canvas 2D 需要清除旧像素。

            // 临时策略：仍然全量绘制，但跳过 initRenderer
            this.clearCanvas();
            this.performRender();
          }
        } else {
          // 全量初始化路径
          this.clearCanvas();
          this.performRender();
        }
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
    // if (!data.key) {
    //   console.warn('Missing key for component:', data.type);
    // }

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
  private performRender(dirtyRect?: { x: number; y: number; width: number; height: number }): void {
    if (!this.rootWidget || !this.renderer) {
      return;
    }

    // 创建构建上下文
    const context: BuildContext = {
      renderer: this.renderer,
      dirtyRect,
      enableOffscreenRendering: this.enableOffscreenRendering,
    };

    // 执行绘制
    try {
      this.renderer.save();

      // 处理裁剪逻辑
      if (dirtyRect) {
        this.renderer.clipRect(dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);
      }

      this.rootWidget.paint(context);
      this.renderer.render();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (this.isCanvasOomErrorMessage(msg)) {
        this.oomErrorCount++;
        this.notifyOomRisk('检测到 Canvas 渲染异常，可能是内存溢出');
      }
      throw e;
    } finally {
      // 确保恢复状态，防止状态污染
      try {
        this.renderer.restore();
      } catch (e) {
        console.error('Failed to restore renderer state:', e);
      }
    }
    this.monitorMemory();
  }

  async rebuild(): Promise<void> {
    if (!this.rootWidget || !this.renderer || !this.container) {
      return;
    }
    const dirtyList = Array.from(this.dirtyWidgets);
    this.dirtyWidgets.clear();

    // 按深度排序，确保父组件先于子组件更新
    dirtyList.sort((a, b) => a.depth - b.depth);

    let hasAnyUpdate = false;
    if (dirtyList.length > 0) {
      for (const w of dirtyList) {
        // 如果在重建过程中该组件被添加到 dirtyWidgets（例如由父组件更新触发），
        // 将其移除以防止下一帧重复渲染
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
    if (
      !hasAnyUpdate &&
      dirtyList.length === 0 &&
      !this.pipelineOwner.hasScheduledLayout &&
      !this.pipelineOwner.hasScheduledPaint
    ) {
      return;
    }

    // 布局阶段：处理 Relayout Boundary
    this.pipelineOwner.flushLayout();

    const totalSize = this.calculateLayout(this.rootWidget);
    const initialized = !!this.canvasId;
    let fullRepaint = false;

    if (!initialized) {
      await this.initRenderer({}, totalSize);
      fullRepaint = true;
    } else {
      // 检查尺寸是否变化
      const oldW = (this.renderer as unknown as { width?: number }).width; // 假设我们可以获取宽度/高度或进行追踪
      // 实际上 initRenderer 和 update() 会更新尺寸
      // 如果尺寸变化，通常需要全量重绘
      // 暂时假设 update() 处理调整大小，我们可以标记它
      this.renderer.update({
        width: totalSize.width,
        height: totalSize.height,
      });
      // 如果能检测到调整大小，设置 fullRepaint = true
      // 简单检查:
      if (
        this._canvas &&
        (this._canvas.width !== totalSize.width || this._canvas.height !== totalSize.height)
      ) {
        fullRepaint = true;
      }
    }

    // 绘制阶段：处理 Repaint Boundary
    this.pipelineOwner.flushPaint();

    let dirtyRect: { x: number; y: number; width: number; height: number } | undefined;

    if (!fullRepaint) {
      // 优化：如果脏节点过多（例如超过 50 个），计算脏矩形的开销可能大于全量重绘的收益，
      // 且通常意味着大面积更新。直接全量重绘。
      if (dirtyList.length > 50) {
        fullRepaint = true;
      } else {
        // 根据 dirtyList 计算脏矩形
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        let count = 0;
        for (const w of dirtyList) {
          if (w.isDisposed()) {
            continue;
          }
          // 确保组件仍在树中
          if (w.root !== this.rootWidget) {
            continue;
          }

          try {
            const box = w.getBoundingBox();
            if (box.width > 0 && box.height > 0) {
              minX = Math.min(minX, box.x);
              minY = Math.min(minY, box.y);
              maxX = Math.max(maxX, box.x + box.width);
              maxY = Math.max(maxY, box.y + box.height);
              count++;
            }
          } catch (e) {
            // 忽略
          }
        }

        if (count > 0 && minX !== Infinity) {
          // 增加一点 padding 防止边缘残留
          const padding = 2;
          dirtyRect = {
            x: Math.floor(minX - padding),
            y: Math.floor(minY - padding),
            width: Math.ceil(maxX - minX + padding * 2),
            height: Math.ceil(maxY - minY + padding * 2),
          };

          // 限制在画布尺寸范围内
          if (this._canvas) {
            dirtyRect.x = Math.max(0, dirtyRect.x);
            dirtyRect.y = Math.max(0, dirtyRect.y);
            dirtyRect.width = Math.min(this._canvas.width - dirtyRect.x, dirtyRect.width);
            dirtyRect.height = Math.min(this._canvas.height - dirtyRect.y, dirtyRect.height);
          }
        } else {
          // 未找到有效的脏矩形，回退到全量重绘还是跳过？
          // 如果 dirtyList 不为空但未找到边界（例如尺寸为 0 的组件），也许跳过渲染？
          // 但可能存在副作用。如果不确定，默认为全量重绘，或者如果计数为 0 则跳过。
          if (dirtyList.length > 0 && count === 0) {
            // 所有脏组件尺寸为 0 或已销毁。
            // 我们可能可以跳过渲染？
            // 但为了安全起见，如果无法确定边界，则进行全量重绘。
            fullRepaint = true;
          }
        }
      }
    }

    if (fullRepaint) {
      dirtyRect = undefined;
    }

    this.clearCanvas(dirtyRect);
    this.performRender(dirtyRect);
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
  private clearCanvas(rect?: { x: number; y: number; width: number; height: number }): void {
    if (!this.renderer) {
      return;
    }
    const raw = this.renderer.getRawInstance();
    try {
      const ctx = raw as CanvasRenderingContext2D;
      const canvas = ctx.canvas;
      const rawResolution = this.renderer.getResolution?.() ?? 1;
      const resolution =
        typeof rawResolution === 'number' && Number.isFinite(rawResolution) && rawResolution > 0
          ? rawResolution
          : 1;
      if (typeof ctx.setTransform === 'function') {
        ctx.save();
        ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
        if (rect) {
          ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
        } else {
          ctx.clearRect(0, 0, canvas.width / resolution, canvas.height / resolution);
        }
        ctx.restore();
      } else if (rect) {
        ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (this.isCanvasOomErrorMessage(msg)) {
        this.oomErrorCount++;
        this.notifyOomRisk('清空画布时出现异常，可能是内存溢出');
      }
      throw e;
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
