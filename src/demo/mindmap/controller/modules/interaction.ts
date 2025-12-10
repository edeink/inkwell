import type { MindmapController } from '../index';
import type { ViewModule } from './view';

export const enum ToolbarAction {
  AddAbove = 'addAbove',
  AddBelow = 'addBelow',
  AddChild = 'addChild',
  AddChildLeft = 'addChildLeft',
  AddChildRight = 'addChildRight',
}

export class InteractionModule {
  private controller: MindmapController;
  private view: ViewModule;

  constructor(controller: MindmapController, view: ViewModule) {
    this.controller = controller;
    this.view = view;
  }

  attach(): void {
    void this.controller;
    void this.view;
  }
}
