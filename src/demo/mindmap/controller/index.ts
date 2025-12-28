import { MindMapViewport } from '../widgets/mindmap-viewport';

import { InteractionModule } from './modules/interaction';
import { LayoutModule } from './modules/layout';
import { ViewModule } from './modules/view';

import type { ControllerPlugin, ControllerPluginHookContext } from './plugins';

import Runtime from '@/runtime';

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

    // 订阅视口变化事件
    this.viewport.addViewChangeListener((v) => {
      this.viewScale = v.scale;
      this.viewTx = v.tx;
      this.viewTy = v.ty;
      this.view.syncFromViewport();
    });

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

  get scrollX(): number {
    return this.viewport.scrollX;
  }

  get scrollY(): number {
    return this.viewport.scrollY;
  }

  notifyViewChange(): void {
    this.view.notifyListeners();
  }

  // 布局通知
  private layoutListeners: Set<() => void> = new Set();

  dispatchLayoutChange(): void {
    this.layoutListeners.forEach((fn) => fn());
  }

  addLayoutChangeListener(fn: () => void): () => void {
    this.layoutListeners.add(fn);
    return () => this.layoutListeners.delete(fn);
  }

  loadGraph(data: unknown): void {
    const root = this.runtime.getRootWidget();
    // 假设 root 是 Scene 或者有一个方法 setGraphData
    if (root && typeof (root as unknown as { setGraphData: unknown }).setGraphData === 'function') {
      (root as unknown as { setGraphData: (d: unknown) => void }).setGraphData(data);
    }
  }

  registerPlugin(plugin: ControllerPlugin): void {
    if (!plugin || this.plugins.has(plugin)) {
      return;
    }
    this.plugins.add(plugin);
    try {
      plugin.onAttach?.(this.getPluginContext());
    } catch {}
  }

  unregisterPlugin(plugin: ControllerPlugin): void {
    if (!plugin || !this.plugins.has(plugin)) {
      return;
    }
    try {
      plugin.onDetach?.(this.getPluginContext());
    } catch {}
    this.plugins.delete(plugin);
  }

  getPluginContext(): ControllerPluginHookContext {
    return { runtime: this.runtime, viewport: this.viewport, controller: this };
  }

  getPlugins(): ControllerPlugin[] {
    return Array.from(this.plugins);
  }

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

  addViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): () => void {
    return this.view.addChangeListener(fn);
  }

  removeViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): void {
    this.view.removeChangeListener(fn);
  }

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

  setActiveKey(key: string | null): void {
    this.viewport.setActiveKey(key);
    try {
      this.viewport.markDirty();
    } catch {}
    this.dispatchActiveChangeEvent(key);
  }

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

export function createController(
  runtime: Runtime,
  viewport: MindMapViewport,
  onViewChange?: (scale: number, tx: number, ty: number) => void,
): MindmapController {
  return new MindmapController(runtime, viewport, onViewChange);
}

export { LayoutModule };
