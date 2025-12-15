import { Viewport } from '../custom-widget/viewport';

import { EventsModule } from './modules/events';
import { HistoryModule } from './modules/history';
import { InteractionModule } from './modules/interaction';
import { LayoutModule } from './modules/layout';
import { ViewModule } from './modules/view';

import type { ControllerPlugin, ControllerPluginHookContext } from './plugins';

import Runtime from '@/runtime';

export class MindmapController {
  runtime: Runtime;
  viewport: Viewport;
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
    viewport: Viewport,
    onViewChange?: (scale: number, tx: number, ty: number) => void,
  ) {
    this.runtime = runtime;
    this.viewport = viewport;
    this.viewScale = viewport.scale;
    this.viewTx = viewport.tx;
    this.viewTy = viewport.ty;
    this.view = new ViewModule(this, onViewChange);
    this.onViewChangeCb = onViewChange ?? null;
    this.layoutModule = new LayoutModule(this);
    this.layoutModule.attach();
    this.interaction = new InteractionModule(this, this.view);
    this.interaction.attach();
    MindmapController.byRuntime.set(runtime, this);
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
      this.viewport.markNeedsLayout();
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
      this.viewport.markNeedsLayout();
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
    const target: EventTarget | null = canvas ?? this.runtime.getContainer();
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
    const target: EventTarget | null = canvas ?? this.runtime.getContainer();
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
  viewport: Viewport,
  onViewChange?: (scale: number, tx: number, ty: number) => void,
): MindmapController {
  return new MindmapController(runtime, viewport, onViewChange);
}

export { EventsModule, HistoryModule, LayoutModule };
