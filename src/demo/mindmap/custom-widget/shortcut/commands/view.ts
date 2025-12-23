import type { Viewport } from '../../viewport';
import type { Command } from '../history/types';

export class ViewportTransformCommand implements Command {
  constructor(
    private viewport: Viewport,
    private prev: { scale: number; tx: number; ty: number },
    private next: { scale: number; tx: number; ty: number },
    public label: string = 'View Transform',
  ) {}

  execute() {
    this.viewport.setTransform(this.next.scale, this.next.tx, this.next.ty);
  }

  undo() {
    this.viewport.setTransform(this.prev.scale, this.prev.tx, this.prev.ty);
  }
}
