import { Viewport } from '../custom-widget/viewport';

import { CrudModule } from './modules/crud';
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
  private plugins: Set<ControllerPlugin> = new Set();
  private layoutModule: LayoutModule;
  private historyModule: HistoryModule;
  private crudModule: CrudModule;
  private eventsModule: EventsModule;
  private view: ViewModule;
  private interaction: InteractionModule;

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
    this.layoutModule = new LayoutModule(this);
    this.historyModule = new HistoryModule(this);
    this.layoutModule.attach();
    this.crudModule = new CrudModule(this, this.historyModule, this.layoutModule);
    this.eventsModule = new EventsModule(this);
    this.interaction = new InteractionModule(this, this.view);
    this.interaction.attach();
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
    this.view.setPosition(tx, ty);
    this.viewScale = this.view.scale;
    this.viewTx = this.view.tx;
    this.viewTy = this.view.ty;
  }

  addViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): () => void {
    return this.view.addChangeListener(fn);
  }

  removeViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): void {
    this.view.removeChangeListener(fn);
  }

  zoomAt(newScale: number, cx: number, cy: number): void {
    this.view.zoomAt(newScale, cx, cy);
    this.viewScale = this.view.scale;
    this.viewTx = this.view.tx;
    this.viewTy = this.view.ty;
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

export { CrudModule, EventsModule, HistoryModule, LayoutModule };
