import type { SelectionData } from '../../../types';
import type { Viewport } from '../../viewport';
import type { Command } from '../history/types';

export interface DeletedData {
  timestamp: number;
  operator: string;
  payload: SelectionData;
}

export class DeleteNodeCommand implements Command {
  private deletedData: DeletedData | null = null;

  constructor(private viewport: Viewport) {}

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
