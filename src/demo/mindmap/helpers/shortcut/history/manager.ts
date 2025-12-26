import type { Command, HistoryState } from './types';

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private limit: number;

  constructor(limit: number = 50) {
    this.limit = limit;
  }

  /**
   * 执行并记录命令
   */
  execute(command: Command): void | Promise<void> {
    const result = command.execute();
    if (result instanceof Promise) {
      return result.then(() => this.push(command));
    }
    this.push(command);
  }

  /**
   * 仅记录命令（假设命令已执行）
   */
  push(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): boolean | Promise<boolean> {
    const command = this.undoStack.pop();
    if (!command) {
      return false;
    }

    const result = command.undo();
    if (result instanceof Promise) {
      return result.then(() => {
        this.redoStack.push(command);
        return true;
      });
    }
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean | Promise<boolean> {
    const command = this.redoStack.pop();
    if (!command) {
      return false;
    }

    const result = command.execute();
    if (result instanceof Promise) {
      return result.then(() => {
        this.undoStack.push(command);
        return true;
      });
    }
    this.undoStack.push(command);
    return true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
    };
  }

  getUndoStack(): Command[] {
    return [...this.undoStack];
  }

  getRedoStack(): Command[] {
    return [...this.redoStack];
  }
}
