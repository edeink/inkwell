import type { MindmapController } from './index';
import type { Viewport } from '../custom-widget/viewport';
import type Runtime from '@/runtime';

export type ControllerPluginHookContext = {
  runtime: Runtime;
  viewport: Viewport;
  controller: MindmapController;
};

export interface ControllerPlugin {
  id: string;
  onAttach?(ctx: ControllerPluginHookContext): void;
  onDetach?(ctx: ControllerPluginHookContext): void;
  onPointerDown?(
    e: PointerEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean | void;
  onPointerMove?(
    e: PointerEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean | void;
  onPointerUp?(
    e: PointerEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean | void;
  onWheel?(e: WheelEvent, ctx: ControllerPluginHookContext): boolean | void;
  onKeyDown?(e: KeyboardEvent, ctx: ControllerPluginHookContext): boolean | void;
  onDblClick?(
    e: MouseEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean | void;
  onViewChange?(ctx: ControllerPluginHookContext, scale: number, tx: number, ty: number): void;
}
