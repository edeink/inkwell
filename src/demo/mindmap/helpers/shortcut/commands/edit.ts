import type { SelectionData, Side } from '../../../type';
import type { MindMapViewport } from '../../../widgets/mindmap-viewport';
import type { Command } from '../history/types';

export interface DeletedData {
  timestamp: number;
  operator: string;
  payload: SelectionData;
}

export class DeleteNodeCommand implements Command {
  private deletedData: DeletedData | null = null;

  constructor(private viewport: MindMapViewport) {}

  execute(): void {
    const payload = this.viewport.deleteSelection();
    if (payload) {
      this.deletedData = {
        timestamp: Date.now(),
        operator: 'user', // 简化的操作者标识
        payload,
      };
    }
  }

  undo(): void {
    if (this.deletedData && this.deletedData.payload) {
      this.viewport.restoreSelection(this.deletedData.payload);
    } else {
      console.warn('DeleteNodeCommand: 无可还原的数据');
      // 可以根据需求抛出异常，但通常 undo 不应中断
      // throw new Error('无法还原数据：数据丢失');
    }
  }
}

export class AddSiblingNodeCommand implements Command {
  private addedKey: string | null = null;
  private deletedData: SelectionData | null = null;

  constructor(
    private viewport: MindMapViewport,
    private refKey: string,
    private dir: -1 | 1,
    private side?: Side,
  ) {}

  execute(): void {
    if (this.deletedData) {
      this.viewport.restoreSelection(this.deletedData);
      if (this.deletedData.nodes.length > 0) {
        this.addedKey = this.deletedData.nodes[0].id;
        this.viewport.setActiveKey(this.addedKey);
      }
      this.deletedData = null;
    } else {
      if (typeof this.viewport.data.onAddSiblingNode === 'function') {
        const res = this.viewport.data.onAddSiblingNode(this.refKey, this.dir, this.side);
        if (typeof res === 'string') {
          this.addedKey = res;
        }
      } else {
        console.warn(
          'AddSiblingNodeCommand: Viewport 未提供 onAddSiblingNode 回调，无法执行添加操作',
        );
      }
    }
  }

  undo(): void {
    if (this.addedKey) {
      this.viewport.setActiveKey(this.addedKey);
      const payload = this.viewport.deleteSelection();
      if (payload) {
        this.deletedData = payload;
      }
    }
  }
}

export class AddChildNodeCommand implements Command {
  private addedKey: string | null = null;
  private deletedData: SelectionData | null = null;

  constructor(
    private viewport: MindMapViewport,
    private refKey: string,
    private side: Side,
  ) {}

  execute(): void {
    if (this.deletedData) {
      this.viewport.restoreSelection(this.deletedData);
      if (this.deletedData.nodes.length > 0) {
        this.addedKey = this.deletedData.nodes[0].id;
        this.viewport.setActiveKey(this.addedKey);
      }
      this.deletedData = null;
    } else {
      if (typeof this.viewport.data.onAddChildNode === 'function') {
        const res = this.viewport.data.onAddChildNode(this.refKey, this.side);
        if (typeof res === 'string') {
          this.addedKey = res;
        }
      } else {
        console.warn('AddChildNodeCommand: Viewport 未提供 onAddChildNode 回调，无法执行添加操作');
      }
    }
  }

  undo(): void {
    if (this.addedKey) {
      this.viewport.setActiveKey(this.addedKey);
      const payload = this.viewport.deleteSelection();
      if (payload) {
        this.deletedData = payload;
      }
    }
  }
}
