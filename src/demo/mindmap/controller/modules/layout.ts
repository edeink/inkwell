import type { MindmapController } from '../index';

export class LayoutModule {
  private controller: MindmapController;

  constructor(controller: MindmapController) {
    this.controller = controller;
  }

  attach(): void {
    void this.controller;
  }

  markAffected(keys: string[], delayMs: number = 16): void {
    void keys;
    void delayMs;
  }
}
