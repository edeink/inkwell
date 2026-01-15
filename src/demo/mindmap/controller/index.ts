import { MindMapViewport } from '../widgets/mindmap-viewport';

import { InteractionModule } from './modules/interaction';
import { LayoutModule } from './modules/layout';
import { ViewModule } from './modules/view';

import type { ControllerPlugin, ControllerPluginHookContext } from './plugins';

import Runtime from '@/runtime';

/**
 * MindmapController 负责连接 Runtime、Viewport 与各业务模块（视图、交互、布局）。
 *
 * 核心职责：
 * - 统一管理视口变换（缩放/平移）并向外广播视图变化事件
 * - 维护插件生命周期与插件上下文，支持功能按模块扩展
 * - 将“数据层/渲染层”的细节隔离在模块内部，对外暴露稳定 API
 */
export class MindmapController {
  runtime: Runtime;
  viewport: MindMapViewport;
  viewScale: number;
  viewTx: number;
  viewTy: number;
  static byRuntime: WeakMap<Runtime, MindmapController> = new WeakMap();
  private plugins: Set<ControllerPlugin> = new Set();
  private layoutModule: LayoutModule;
  private view: ViewModule;
  private interaction: InteractionModule;
  private onViewChangeCb: ((scale: number, tx: number, ty: number) => void) | null = null;

  /**
   * 创建控制器并绑定到 Runtime 与 Viewport。
   *
   * @param runtime 运行时实例
   * @param viewport 视口组件实例
   * @param onViewChange 视图变换回调（可选）
   */
  constructor(
    runtime: Runtime,
    viewport: MindMapViewport,
    onViewChange?: (scale: number, tx: number, ty: number) => void,
  ) {
    this.runtime = runtime;
    this.viewport = viewport;
    this.viewScale = viewport.scale;
    this.viewTx = viewport.tx;
    this.viewTy = viewport.ty;
    this.view = new ViewModule(this, onViewChange);
    this.onViewChangeCb = onViewChange ?? null;

    this.bindViewport(viewport);

    // 注册插件
    this.layoutModule = new LayoutModule(this);
    this.interaction = new InteractionModule(this, this.view);

    this.plugins.add(this.layoutModule as unknown as ControllerPlugin);
    this.plugins.add(this.interaction as unknown as ControllerPlugin);
    this.plugins.add(this.view as unknown as ControllerPlugin);

    // 初始化所有插件
    this.plugins.forEach((p) => {
      if (typeof p.onInit === 'function') {
        p.onInit();
      }
    });
    MindmapController.byRuntime.set(runtime, this);
    (runtime as unknown as { __mindmapController: MindmapController }).__mindmapController = this;
  }

  /**
   * 从外部同步视图变换状态到控制器，并驱动 ViewModule 同步。
   *
   * @param view 视口变换数据
   * @returns void
   */
  syncView(view: { scale: number; tx: number; ty: number }): void {
    this.viewScale = view.scale;
    this.viewTx = view.tx;
    this.viewTy = view.ty;
    this.view.syncFromViewport();
  }

  /**
   * 绑定新的 Viewport 实例并重建监听关系。
   *
   * @param viewport 新的视口实例
   * @returns void
   */
  bindViewport(viewport: MindMapViewport): void {
    if (this.viewport === viewport) {
      return;
    }
    this.viewport = viewport;
    // 重新订阅视口变化事件
    // 注意：由于 Widget 可能是新建的，我们需要确保 Controller 始终监听最新的 Widget
    // 实际的 Viewport Widget 可能会在 Render 过程中被替换，
    // 因此推荐外部在 Viewport 变化时调用 setViewport 或 syncView
    this.viewport.addViewChangeListener((v) => {
      this.syncView(v);
    });

    // 同步初始状态
    this.viewScale = viewport.scale;
    this.viewTx = viewport.tx;
    this.viewTy = viewport.ty;
  }

  /**
   * 获取当前视口的横向滚动值。
   *
   * @returns 横向滚动值（世界坐标系）
   */
  get scrollX(): number {
    return this.viewport.scrollX;
  }

  /**
   * 获取当前视口的纵向滚动值。
   *
   * @returns 纵向滚动值（世界坐标系）
   */
  get scrollY(): number {
    return this.viewport.scrollY;
  }

  /**
   * 主动通知“视图已变化”，用于驱动订阅方刷新（例如缩略图）。
   *
   * @returns void
   */
  notifyViewChange(): void {
    this.view.notifyListeners();
  }

  // 布局通知
  private layoutListeners: Set<() => void> = new Set();

  /**
   * 分发布局变更事件到所有监听者。
   *
   * @returns void
   */
  dispatchLayoutChange(): void {
    this.layoutListeners.forEach((fn) => fn());
  }

  /**
   * 注册布局变更监听器。
   *
   * @param fn 回调函数
   * @returns 取消订阅函数
   */
  addLayoutChangeListener(fn: () => void): () => void {
    this.layoutListeners.add(fn);
    return () => this.layoutListeners.delete(fn);
  }

  /**
   * 加载外部图数据并交给根组件处理（约定根组件实现 setGraphData）。
   *
   * @param data 外部图数据
   * @returns void
   */
  loadGraph(data: unknown): void {
    const root = this.runtime.getRootWidget();
    // 假设 root 是 Scene 或者有一个方法 setGraphData
    if (root && typeof (root as unknown as { setGraphData: unknown }).setGraphData === 'function') {
      (root as unknown as { setGraphData: (d: unknown) => void }).setGraphData(data);
    }
  }

  /**
   * 注册控制器插件并触发 onAttach 生命周期。
   *
   * @param plugin 插件实例
   * @returns void
   */
  registerPlugin(plugin: ControllerPlugin): void {
    if (!plugin || this.plugins.has(plugin)) {
      return;
    }
    this.plugins.add(plugin);
    try {
      plugin.onAttach?.(this.getPluginContext());
    } catch {}
  }

  /**
   * 反注册控制器插件并触发 onDetach 生命周期。
   *
   * @param plugin 插件实例
   * @returns void
   */
  unregisterPlugin(plugin: ControllerPlugin): void {
    if (!plugin || !this.plugins.has(plugin)) {
      return;
    }
    try {
      plugin.onDetach?.(this.getPluginContext());
    } catch {}
    this.plugins.delete(plugin);
  }

  /**
   * 获取提供给插件的上下文对象。
   *
   * @returns 插件上下文
   */
  getPluginContext(): ControllerPluginHookContext {
    return { runtime: this.runtime, viewport: this.viewport, controller: this };
  }

  /**
   * 获取当前已注册插件列表（快照）。
   *
   * @returns 插件数组
   */
  getPlugins(): ControllerPlugin[] {
    return Array.from(this.plugins);
  }

  /**
   * 设置视口位置（平移），并同步控制器内部 viewScale/viewTx/viewTy。
   *
   * @param tx 目标平移 X
   * @param ty 目标平移 Y
   * @returns void
   */
  setViewPosition(tx: number, ty: number): void {
    this.viewport.setPosition(tx, ty);
    this.viewScale = this.viewport.scale;
    this.viewTx = this.viewport.tx;
    this.viewTy = this.viewport.ty;
    try {
      this.onViewChangeCb?.(this.viewScale, this.viewTx, this.viewTy);
    } catch {}
    this.dispatchViewChangeEvent();
    try {
      this.viewport.markDirty();
    } catch {}
  }

  /**
   * 订阅视图变更事件。
   *
   * @param fn 回调函数
   * @returns 取消订阅函数
   */
  addViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): () => void {
    return this.view.addChangeListener(fn);
  }

  /**
   * 取消订阅视图变更事件。
   *
   * @param fn 回调函数
   * @returns void
   */
  removeViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): void {
    this.view.removeChangeListener(fn);
  }

  /**
   * 以指定屏幕坐标为锚点执行缩放，并通知插件与订阅方。
   *
   * @param newScale 新缩放值
   * @param cx 屏幕坐标 X
   * @param cy 屏幕坐标 Y
   * @returns void
   */
  zoomAt(newScale: number, cx: number, cy: number): void {
    this.viewport.zoomAt(newScale, cx, cy);
    this.viewScale = this.viewport.scale;
    this.viewTx = this.viewport.tx;
    this.viewTy = this.viewport.ty;
    try {
      this.onViewChangeCb?.(this.viewScale, this.viewTx, this.viewTy);
    } catch {}
    try {
      const ctx = this.getPluginContext();
      for (const p of this.getPlugins()) {
        p.onViewChange?.(ctx, this.viewScale, this.viewTx, this.viewTy);
      }
    } catch {}
    this.dispatchViewChangeEvent();
  }

  /**
   * 设置激活节点 key，并触发激活变更事件。
   *
   * @param key 节点 key；传 null 表示清空激活态
   * @returns void
   */
  setActiveKey(key: string | null): void {
    this.viewport.setActiveKey(key);
    try {
      this.viewport.markDirty();
    } catch {}
    this.dispatchActiveChangeEvent(key);
  }

  /**
   * 通过 Runtime 获取已创建的控制器实例。
   *
   * @param rt 运行时实例
   * @returns 控制器实例；不存在时返回 null
   */
  static getByRuntime(rt: Runtime): MindmapController | null {
    try {
      return MindmapController.byRuntime.get(rt) ?? null;
    } catch {
      return null;
    }
  }

  private dispatchViewChangeEvent(): void {
    const raw = this.runtime.getRenderer()?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target: EventTarget | null = canvas ?? this.runtime.container;
    try {
      target?.dispatchEvent(
        new CustomEvent('inkwell:viewchange', {
          detail: { scale: this.viewScale, tx: this.viewTx, ty: this.viewTy },
        }),
      );
    } catch {}
  }

  private dispatchActiveChangeEvent(key: string | null): void {
    const raw = this.runtime.getRenderer()?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target: EventTarget | null = canvas ?? this.runtime.container;
    try {
      target?.dispatchEvent(
        new CustomEvent('inkwell:activechange', {
          detail: { activeKey: key },
        }),
      );
    } catch {}
  }
}

export type Controller = MindmapController;

/**
 * 创建并返回一个 MindmapController 实例。
 *
 * @param runtime 运行时实例
 * @param viewport 视口组件实例
 * @param onViewChange 视图变换回调（可选）
 * @returns 控制器实例
 */
export function createController(
  runtime: Runtime,
  viewport: MindMapViewport,
  onViewChange?: (scale: number, tx: number, ty: number) => void,
): MindmapController {
  return new MindmapController(runtime, viewport, onViewChange);
}

export { LayoutModule };
